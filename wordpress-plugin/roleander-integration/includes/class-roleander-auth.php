<?php
/**
 * Roleander Authentication Handler
 *
 * Manages OAuth 2.0 authentication flow between WordPress and Roleander
 */

if (!defined('ABSPATH')) {
    exit;
}

class Roleander_Auth {

    /**
     * API instance
     */
    private $api;

    /**
     * Constructor
     */
    public function __construct() {
        $this->api = roleander_integration()->get_api();
    }

    /**
     * Initialize authentication hooks
     */
    public function init() {
        add_action('init', array($this, 'handle_oauth_callback'));
        add_action('wp_ajax_roleander_oauth_start', array($this, 'start_oauth_flow'));
        add_action('wp_ajax_nopriv_roleander_oauth_start', array($this, 'start_oauth_flow'));
        add_action('wp_ajax_roleander_disconnect', array($this, 'disconnect_account'));
        add_filter('wp_login', array($this, 'sync_on_login'), 10, 2);
        add_filter('wp_logout', array($this, 'handle_logout'));
    }

    /**
     * Start OAuth 2.0 authorization flow
     */
    public function start_oauth_flow() {
        check_ajax_referer('roleander_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error('User not logged in');
            return;
        }

        $user_id = get_current_user_id();
        $state = wp_generate_password(32, false);
        $redirect_uri = add_query_arg(array(
            'action' => 'roleander_oauth_callback',
            'wp_user_id' => $user_id
        ), wp_login_url());

        // Store state for verification
        update_user_meta($user_id, 'roleander_oauth_state', $state);

        $auth_url = $this->api->get_api_url() . '/oauth/authorize?' . http_build_query(array(
            'response_type' => 'code',
            'client_id' => get_option('roleander_client_id'),
            'redirect_uri' => $redirect_uri,
            'scope' => 'profile achievements progress characters',
            'state' => $state
        ));

        wp_send_json_success(array(
            'auth_url' => $auth_url
        ));
    }

    /**
     * Handle OAuth callback
     */
    public function handle_oauth_callback() {
        if (!isset($_GET['action']) || $_GET['action'] !== 'roleander_oauth_callback') {
            return;
        }

        if (!isset($_GET['code']) || !isset($_GET['state']) || !isset($_GET['wp_user_id'])) {
            wp_die('Invalid OAuth callback parameters');
        }

        $code = sanitize_text_field($_GET['code']);
        $state = sanitize_text_field($_GET['state']);
        $wp_user_id = intval($_GET['wp_user_id']);

        // Verify user exists
        if (!get_user_by('ID', $wp_user_id)) {
            wp_die('Invalid user ID');
        }

        // Verify state
        $stored_state = get_user_meta($wp_user_id, 'roleander_oauth_state', true);
        if ($state !== $stored_state) {
            wp_die('Invalid OAuth state');
        }

        // Clear stored state
        delete_user_meta($wp_user_id, 'roleander_oauth_state');

        // Exchange code for tokens
        $token_response = $this->exchange_code_for_tokens($code, $wp_user_id);
        if (is_wp_error($token_response)) {
            wp_die('Failed to exchange authorization code: ' . $token_response->get_error_message());
        }

        // Store user sync data
        $this->store_user_sync_data($wp_user_id, $token_response);

        // Redirect to success page
        $redirect_url = add_query_arg(array(
            'roleander_connected' => '1'
        ), get_permalink(get_option('roleander_profile_page_id', 0)) ?: home_url());

        wp_redirect($redirect_url);
        exit;
    }

    /**
     * Exchange authorization code for access tokens
     */
    private function exchange_code_for_tokens($code, $wp_user_id) {
        $redirect_uri = add_query_arg(array(
            'action' => 'roleander_oauth_callback',
            'wp_user_id' => $wp_user_id
        ), wp_login_url());

        $response = wp_remote_post($this->api->get_api_url() . '/oauth/token', array(
            'body' => array(
                'grant_type' => 'authorization_code',
                'client_id' => get_option('roleander_client_id'),
                'client_secret' => get_option('roleander_client_secret'),
                'code' => $code,
                'redirect_uri' => $redirect_uri
            ),
            'timeout' => 30
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            return new WP_Error('token_exchange_failed', 'Token exchange failed: ' . $response_body);
        }

        $token_data = json_decode($response_body, true);
        if (!$token_data || !isset($token_data['access_token'])) {
            return new WP_Error('invalid_token_response', 'Invalid token response');
        }

        return $token_data;
    }

    /**
     * Store user synchronization data
     */
    private function store_user_sync_data($wp_user_id, $token_data) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'roleander_user_sync';

        $user_profile = $this->api->get_user_profile_with_token($token_data['access_token']);
        if (is_wp_error($user_profile)) {
            error_log('Failed to get user profile during sync: ' . $user_profile->get_error_message());
            $roleander_user_id = 'unknown';
        } else {
            $roleander_user_id = $user_profile['id'];
        }

        $wpdb->replace(
            $table_name,
            array(
                'wp_user_id' => $wp_user_id,
                'roleander_user_id' => $roleander_user_id,
                'access_token' => $token_data['access_token'],
                'refresh_token' => $token_data['refresh_token'] ?? null,
                'token_expires' => date('Y-m-d H:i:s', time() + ($token_data['expires_in'] ?? 3600)),
                'sync_status' => 'active'
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s')
        );

        // Trigger initial sync
        do_action('roleander_user_connected', $wp_user_id, $roleander_user_id);
    }

    /**
     * Disconnect Roleander account
     */
    public function disconnect_account() {
        check_ajax_referer('roleander_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error('User not logged in');
            return;
        }

        $user_id = get_current_user_id();
        global $wpdb;

        // Remove sync data
        $wpdb->delete(
            $wpdb->prefix . 'roleander_user_sync',
            array('wp_user_id' => $user_id),
            array('%d')
        );

        // Remove cached data
        $wpdb->delete(
            $wpdb->prefix . 'roleander_achievements',
            array('wp_user_id' => $user_id),
            array('%d')
        );

        $wpdb->delete(
            $wpdb->prefix . 'roleander_recommendations',
            array('wp_user_id' => $user_id),
            array('%d')
        );

        do_action('roleander_user_disconnected', $user_id);

        wp_send_json_success(array(
            'message' => 'Account disconnected successfully'
        ));
    }

    /**
     * Sync user data on login
     */
    public function sync_on_login($user_login, $user) {
        if (get_option('roleander_sync_enabled', 'yes') !== 'yes') {
            return;
        }

        // Check if user has Roleander account connected
        if ($this->is_user_connected($user->ID)) {
            // Trigger sync in background
            wp_schedule_single_event(time() + 5, 'roleander_sync_user', array($user->ID));
        }
    }

    /**
     * Handle logout
     */
    public function handle_logout() {
        // Clear any temporary OAuth state
        if (is_user_logged_in()) {
            delete_user_meta(get_current_user_id(), 'roleander_oauth_state');
        }
    }

    /**
     * Check if user is connected to Roleander
     */
    public function is_user_connected($wp_user_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'roleander_user_sync';

        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_name} WHERE wp_user_id = %d AND sync_status = 'active'",
            $wp_user_id
        ));

        return $count > 0;
    }

    /**
     * Get Roleander user ID for WordPress user
     */
    public function get_roleander_user_id($wp_user_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'roleander_user_sync';

        return $wpdb->get_var($wpdb->prepare(
            "SELECT roleander_user_id FROM {$table_name} WHERE wp_user_id = %d AND sync_status = 'active'",
            $wp_user_id
        ));
    }

    /**
     * Get valid access token for user
     */
    public function get_user_access_token($wp_user_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'roleander_user_sync';

        $token_data = $wpdb->get_row($wpdb->prepare(
            "SELECT access_token, token_expires FROM {$table_name} WHERE wp_user_id = %d AND sync_status = 'active'",
            $wp_user_id
        ), ARRAY_A);

        if (!$token_data) {
            return false;
        }

        // Check if token is expired
        if (strtotime($token_data['token_expires']) <= time()) {
            // Try to refresh token
            if ($this->refresh_user_token($wp_user_id)) {
                return $this->get_user_access_token($wp_user_id);
            }
            return false;
        }

        return $token_data['access_token'];
    }

    /**
     * Refresh user access token
     */
    private function refresh_user_token($wp_user_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'roleander_user_sync';

        $refresh_token = $wpdb->get_var($wpdb->prepare(
            "SELECT refresh_token FROM {$table_name} WHERE wp_user_id = %d",
            $wp_user_id
        ));

        if (!$refresh_token) {
            return false;
        }

        $response = wp_remote_post($this->api->get_api_url() . '/oauth/token', array(
            'body' => array(
                'grant_type' => 'refresh_token',
                'client_id' => get_option('roleander_client_id'),
                'client_secret' => get_option('roleander_client_secret'),
                'refresh_token' => $refresh_token
            ),
            'timeout' => 30
        ));

        if (is_wp_error($response)) {
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            return false;
        }

        $token_data = json_decode($response_body, true);
        if (!$token_data || !isset($token_data['access_token'])) {
            return false;
        }

        // Update token data
        $wpdb->update(
            $table_name,
            array(
                'access_token' => $token_data['access_token'],
                'refresh_token' => $token_data['refresh_token'] ?? $refresh_token,
                'token_expires' => date('Y-m-d H:i:s', time() + ($token_data['expires_in'] ?? 3600))
            ),
            array('wp_user_id' => $wp_user_id),
            array('%s', '%s', '%s'),
            array('%d')
        );

        return true;
    }

    /**
     * Get API URL (helper method)
     */
    public function get_api_url() {
        return get_option('roleander_api_url', 'https://roleanderbooks.com');
    }
}