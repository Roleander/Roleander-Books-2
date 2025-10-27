<?php
/**
 * Plugin Name: Roleander Integration
 * Plugin URI: https://roleanderbooks.com
 * Description: Seamlessly integrate Roleander interactive audiobooks with your WordPress site. Sync user accounts, embed character sheets, and share achievements across platforms.
 * Version: 1.0.0
 * Author: Roleander Team
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: roleander-integration
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin constants
define('ROLEANDER_VERSION', '1.0.0');
define('ROLEANDER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ROLEANDER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ROLEANDER_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Include required files
require_once ROLEANDER_PLUGIN_DIR . 'includes/class-roleander-api.php';
require_once ROLEANDER_PLUGIN_DIR . 'includes/class-roleander-auth.php';
require_once ROLEANDER_PLUGIN_DIR . 'includes/class-roleander-sync.php';
require_once ROLEANDER_PLUGIN_DIR . 'includes/class-roleander-shortcodes.php';
require_once ROLEANDER_PLUGIN_DIR . 'includes/class-roleander-admin.php';
require_once ROLEANDER_PLUGIN_DIR . 'includes/class-roleander-widgets.php';

/**
 * Main Roleander Integration Class
 */
class Roleander_Integration {

    /**
     * Single instance of the plugin
     */
    private static $instance = null;

    /**
     * API handler instance
     */
    public $api;

    /**
     * Auth handler instance
     */
    public $auth;

    /**
     * Sync handler instance
     */
    public $sync;

    /**
     * Shortcodes handler instance
     */
    public $shortcodes;

    /**
     * Admin handler instance
     */
    public $admin;

    /**
     * Widgets handler instance
     */
    public $widgets;

    /**
     * Get single instance of the plugin
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->init_hooks();
        $this->init_components();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Initialize plugin components
     */
    private function init_components() {
        $this->api = new Roleander_API();
        $this->auth = new Roleander_Auth();
        $this->sync = new Roleander_Sync();
        $this->shortcodes = new Roleander_Shortcodes();
        $this->admin = new Roleander_Admin();
        $this->widgets = new Roleander_Widgets();
    }

    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain
        load_plugin_textdomain('roleander-integration', false, dirname(ROLEANDER_PLUGIN_BASENAME) . '/languages/');

        // Initialize components
        $this->api->init();
        $this->auth->init();
        $this->sync->init();
        $this->shortcodes->init();
        $this->admin->init();
        $this->widgets->init();
    }

    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_style(
            'roleander-integration',
            ROLEANDER_PLUGIN_URL . 'assets/css/roleander-integration.css',
            array(),
            ROLEANDER_VERSION
        );

        wp_enqueue_script(
            'roleander-integration',
            ROLEANDER_PLUGIN_URL . 'assets/js/roleander-integration.js',
            array('jquery'),
            ROLEANDER_VERSION,
            true
        );

        // Localize script with settings
        wp_localize_script('roleander-integration', 'roleanderSettings', array(
            'apiUrl' => get_option('roleander_api_url', 'https://roleanderbooks.com'),
            'clientId' => get_option('roleander_client_id', ''),
            'isLoggedIn' => is_user_logged_in(),
            'currentUserId' => get_current_user_id(),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('roleander_nonce')
        ));
    }

    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if ('toplevel_page_roleander-settings' !== $hook) {
            return;
        }

        wp_enqueue_style(
            'roleander-admin',
            ROLEANDER_PLUGIN_URL . 'assets/css/roleander-admin.css',
            array(),
            ROLEANDER_VERSION
        );

        wp_enqueue_script(
            'roleander-admin',
            ROLEANDER_PLUGIN_URL . 'assets/js/roleander-admin.js',
            array('jquery'),
            ROLEANDER_VERSION,
            true
        );
    }

    /**
     * Plugin activation hook
     */
    public function activate() {
        // Create necessary database tables
        $this->create_tables();

        // Set default options
        add_option('roleander_api_url', 'https://roleanderbooks.com');
        add_option('roleander_client_id', '');
        add_option('roleander_client_secret', '');
        add_option('roleander_sync_enabled', 'yes');
        add_option('roleander_embed_enabled', 'yes');

        // Schedule sync cron job
        if (!wp_next_scheduled('roleander_sync_cron')) {
            wp_schedule_event(time(), 'hourly', 'roleander_sync_cron');
        }

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation hook
     */
    public function deactivate() {
        // Clear scheduled cron jobs
        wp_clear_scheduled_hook('roleander_sync_cron');

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Create necessary database tables
     */
    private function create_tables() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // User sync table
        $table_name = $wpdb->prefix . 'roleander_user_sync';
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            wp_user_id bigint(20) unsigned NOT NULL,
            roleander_user_id varchar(255) NOT NULL,
            access_token text,
            refresh_token text,
            token_expires datetime,
            last_sync datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            sync_status varchar(50) DEFAULT 'active',
            PRIMARY KEY (id),
            UNIQUE KEY wp_user_id (wp_user_id),
            UNIQUE KEY roleander_user_id (roleander_user_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        // Achievement sync table
        $table_name = $wpdb->prefix . 'roleander_achievements';
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            wp_user_id bigint(20) unsigned NOT NULL,
            achievement_id varchar(255) NOT NULL,
            achievement_name varchar(255) NOT NULL,
            achievement_description text,
            achievement_icon varchar(500),
            unlocked_at datetime DEFAULT CURRENT_TIMESTAMP,
            shared_on_wp tinyint(1) DEFAULT 0,
            PRIMARY KEY (id),
            KEY wp_user_id (wp_user_id),
            UNIQUE KEY user_achievement (wp_user_id, achievement_id)
        ) $charset_collate;";

        dbDelta($sql);

        // Content recommendations table
        $table_name = $wpdb->prefix . 'roleander_recommendations';
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            wp_user_id bigint(20) unsigned NOT NULL,
            audiobook_id varchar(255) NOT NULL,
            audiobook_title varchar(500) NOT NULL,
            recommendation_reason varchar(100),
            confidence_score decimal(3,2),
            recommended_at datetime DEFAULT CURRENT_TIMESTAMP,
            clicked_at datetime NULL,
            PRIMARY KEY (id),
            KEY wp_user_id (wp_user_id),
            KEY audiobook_id (audiobook_id)
        ) $charset_collate;";

        dbDelta($sql);
    }

    /**
     * Get API instance
     */
    public function get_api() {
        return $this->api;
    }

    /**
     * Get auth instance
     */
    public function get_auth() {
        return $this->auth;
    }

    /**
     * Get sync instance
     */
    public function get_sync() {
        return $this->sync;
    }
}

/**
 * Initialize the plugin
 */
function roleander_integration() {
    return Roleander_Integration::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'roleander_integration');

/**
 * Cron job for user data synchronization
 */
add_action('roleander_sync_cron', 'roleander_sync_user_data');
function roleander_sync_user_data() {
    $roleander = roleander_integration();
    $sync = $roleander->get_sync();
    $sync->sync_all_users();
}