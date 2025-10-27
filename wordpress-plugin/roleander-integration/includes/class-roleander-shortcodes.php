<?php
/**
 * Roleander Shortcodes Handler
 *
 * Manages WordPress shortcodes for embedding Roleander content
 */

if (!defined('ABSPATH')) {
    exit;
}

class Roleander_Shortcodes {

    /**
     * API instance
     */
    private $api;

    /**
     * Auth instance
     */
    private $auth;

    /**
     * Constructor
     */
    public function __construct() {
        $this->api = roleander_integration()->get_api();
        $this->auth = roleander_integration()->get_auth();
    }

    /**
     * Initialize shortcodes
     */
    public function init() {
        add_shortcode('roleander_character_sheet', array($this, 'character_sheet_shortcode'));
        add_shortcode('roleander_achievements', array($this, 'achievements_shortcode'));
        add_shortcode('roleander_progress', array($this, 'progress_shortcode'));
        add_shortcode('roleander_recommendations', array($this, 'recommendations_shortcode'));
        add_shortcode('roleander_audiobook', array($this, 'audiobook_shortcode'));
        add_shortcode('roleander_featured', array($this, 'featured_content_shortcode'));
        add_shortcode('roleander_connect', array($this, 'connect_button_shortcode'));
    }

    /**
     * Character sheet embedding shortcode
     *
     * Usage: [roleander_character_sheet character_id="123" show_stats="true" show_inventory="false"]
     */
    public function character_sheet_shortcode($atts) {
        $atts = shortcode_atts(array(
            'character_id' => '',
            'show_stats' => 'true',
            'show_inventory' => 'true',
            'show_achievements' => 'false',
            'width' => '100%',
            'height' => '600px',
            'class' => 'roleander-character-sheet'
        ), $atts, 'roleander_character_sheet');

        if (!is_user_logged_in()) {
            return $this->get_login_required_message();
        }

        $user_id = get_current_user_id();
        if (!$this->auth->is_user_connected($user_id)) {
            return $this->get_connection_required_message();
        }

        $roleander_user_id = $this->auth->get_roleander_user_id($user_id);
        if (!$roleander_user_id) {
            return '<p>' . __('Unable to load character data.', 'roleander-integration') . '</p>';
        }

        // Get character data
        $characters = $this->api->get_user_characters($roleander_user_id);
        if (is_wp_error($characters)) {
            return '<p>' . __('Error loading character data.', 'roleander-integration') . '</p>';
        }

        // Find specific character or use first one
        $character = null;
        if (!empty($atts['character_id'])) {
            foreach ($characters as $char) {
                if ($char['id'] == $atts['character_id']) {
                    $character = $char;
                    break;
                }
            }
        } else {
            $character = reset($characters);
        }

        if (!$character) {
            return '<p>' . __('Character not found.', 'roleander-integration') . '</p>';
        }

        ob_start();
        ?>
        <div class="roleander-embed <?php echo esc_attr($atts['class']); ?>"
             style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">
            <iframe
                src="<?php echo esc_url($this->api->get_api_url() . '/embed/character/' . $character['id']); ?>"
                width="100%"
                height="100%"
                frameborder="0"
                allowfullscreen
                loading="lazy">
            </iframe>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Achievements display shortcode
     *
     * Usage: [roleander_achievements limit="10" show_unlocked_date="true"]
     */
    public function achievements_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 10,
            'show_unlocked_date' => 'true',
            'show_description' => 'true',
            'layout' => 'grid', // grid or list
            'class' => 'roleander-achievements'
        ), $atts, 'roleander_achievements');

        if (!is_user_logged_in()) {
            return $this->get_login_required_message();
        }

        $user_id = get_current_user_id();
        if (!$this->auth->is_user_connected($user_id)) {
            return $this->get_connection_required_message();
        }

        $roleander_user_id = $this->auth->get_roleander_user_id($user_id);
        if (!$roleander_user_id) {
            return '<p>' . __('Unable to load achievement data.', 'roleander-integration') . '</p>';
        }

        // Get achievements from local database (synced data)
        global $wpdb;
        $achievements = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}roleander_achievements
             WHERE wp_user_id = %d
             ORDER BY unlocked_at DESC
             LIMIT %d",
            $user_id, intval($atts['limit'])
        ));

        if (empty($achievements)) {
            return '<p>' . __('No achievements unlocked yet.', 'roleander-integration') . '</p>';
        }

        ob_start();
        ?>
        <div class="roleander-achievements <?php echo esc_attr($atts['class']); ?> <?php echo esc_attr($atts['layout']); ?>">
            <?php foreach ($achievements as $achievement): ?>
                <div class="roleander-achievement-item">
                    <?php if (!empty($achievement->achievement_icon)): ?>
                        <img src="<?php echo esc_url($achievement->achievement_icon); ?>"
                             alt="<?php echo esc_attr($achievement->achievement_name); ?>"
                             class="roleander-achievement-icon" />
                    <?php else: ?>
                        <div class="roleander-achievement-icon-placeholder">🏆</div>
                    <?php endif; ?>

                    <div class="roleander-achievement-content">
                        <h4 class="roleander-achievement-title"><?php echo esc_html($achievement->achievement_name); ?></h4>

                        <?php if ($atts['show_description'] === 'true' && !empty($achievement->achievement_description)): ?>
                            <p class="roleander-achievement-description"><?php echo esc_html($achievement->achievement_description); ?></p>
                        <?php endif; ?>

                        <?php if ($atts['show_unlocked_date'] === 'true'): ?>
                            <time class="roleander-achievement-date" datetime="<?php echo esc_attr($achievement->unlocked_at); ?>">
                                <?php echo esc_html(date_i18n(get_option('date_format'), strtotime($achievement->unlocked_at))); ?>
                            </time>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Reading progress shortcode
     *
     * Usage: [roleander_progress show_completed="true" limit="5"]
     */
    public function progress_shortcode($atts) {
        $atts = shortcode_atts(array(
            'show_completed' => 'true',
            'show_in_progress' => 'true',
            'limit' => 10,
            'class' => 'roleander-progress'
        ), $atts, 'roleander_progress');

        if (!is_user_logged_in()) {
            return $this->get_login_required_message();
        }

        $user_id = get_current_user_id();
        if (!$this->auth->is_user_connected($user_id)) {
            return $this->get_connection_required_message();
        }

        $roleander_user_id = $this->auth->get_roleander_user_id($user_id);
        if (!$roleander_user_id) {
            return '<p>' . __('Unable to load progress data.', 'roleander-integration') . '</p>';
        }

        // Get progress data from API
        $progress_data = $this->api->get_user_progress($roleander_user_id);
        if (is_wp_error($progress_data)) {
            return '<p>' . __('Error loading progress data.', 'roleander-integration') . '</p>';
        }

        if (empty($progress_data)) {
            return '<p>' . __('No reading progress found.', 'roleander-integration') . '</p>';
        }

        // Filter and limit results
        $filtered_progress = array();
        foreach ($progress_data as $progress) {
            if (($atts['show_completed'] === 'true' && $progress['completed']) ||
                ($atts['show_in_progress'] === 'true' && !$progress['completed'])) {
                $filtered_progress[] = $progress;
                if (count($filtered_progress) >= intval($atts['limit'])) {
                    break;
                }
            }
        }

        ob_start();
        ?>
        <div class="roleander-progress <?php echo esc_attr($atts['class']); ?>">
            <?php foreach ($filtered_progress as $progress): ?>
                <div class="roleander-progress-item <?php echo $progress['completed'] ? 'completed' : 'in-progress'; ?>">
                    <div class="roleander-progress-header">
                        <h4><?php echo esc_html($progress['audiobook_title']); ?></h4>
                        <span class="roleander-progress-status">
                            <?php echo $progress['completed'] ? __('Completed', 'roleander-integration') : __('In Progress', 'roleander-integration'); ?>
                        </span>
                    </div>

                    <?php if (!$progress['completed']): ?>
                        <div class="roleander-progress-bar">
                            <div class="roleander-progress-fill" style="width: <?php echo esc_attr($progress['progress_percentage']); ?>%"></div>
                        </div>
                        <div class="roleander-progress-text">
                            <?php echo esc_html($progress['progress_percentage']); ?>% complete
                        </div>
                    <?php endif; ?>

                    <div class="roleander-progress-meta">
                        <span>Last read: <?php echo esc_html(date_i18n(get_option('date_format'), strtotime($progress['last_read']))); ?></span>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Content recommendations shortcode
     *
     * Usage: [roleander_recommendations limit="5" show_reasons="true"]
     */
    public function recommendations_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 5,
            'show_reasons' => 'true',
            'show_ratings' => 'true',
            'class' => 'roleander-recommendations'
        ), $atts, 'roleander_recommendations');

        if (!is_user_logged_in()) {
            return $this->get_login_required_message();
        }

        $user_id = get_current_user_id();
        if (!$this->auth->is_user_connected($user_id)) {
            return $this->get_connection_required_message();
        }

        // Get recommendations from local database
        global $wpdb;
        $recommendations = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}roleander_recommendations
             WHERE wp_user_id = %d AND clicked_at IS NULL
             ORDER BY confidence_score DESC, recommended_at DESC
             LIMIT %d",
            $user_id, intval($atts['limit'])
        ));

        if (empty($recommendations)) {
            return '<p>' . __('No recommendations available.', 'roleander-integration') . '</p>';
        }

        ob_start();
        ?>
        <div class="roleander-recommendations <?php echo esc_attr($atts['class']); ?>">
            <?php foreach ($recommendations as $rec): ?>
                <div class="roleander-recommendation-item" data-audiobook-id="<?php echo esc_attr($rec->audiobook_id); ?>">
                    <div class="roleander-recommendation-content">
                        <h4 class="roleander-recommendation-title">
                            <a href="<?php echo esc_url($this->api->get_api_url() . '/audiobooks/' . $rec->audiobook_id); ?>" target="_blank">
                                <?php echo esc_html($rec->audiobook_title); ?>
                            </a>
                        </h4>

                        <?php if ($atts['show_reasons'] === 'true' && !empty($rec->recommendation_reason)): ?>
                            <p class="roleander-recommendation-reason">
                                <?php echo esc_html($this->get_reason_text($rec->recommendation_reason)); ?>
                            </p>
                        <?php endif; ?>

                        <?php if ($atts['show_ratings'] === 'true'): ?>
                            <div class="roleander-recommendation-confidence">
                                <?php echo esc_html(number_format($rec->confidence_score * 100, 1)); ?>% match
                            </div>
                        <?php endif; ?>
                    </div>

                    <div class="roleander-recommendation-actions">
                        <a href="<?php echo esc_url($this->api->get_api_url() . '/audiobooks/' . $rec->audiobook_id); ?>"
                           class="roleander-btn roleander-btn-primary" target="_blank">
                            <?php _e('Listen Now', 'roleander-integration'); ?>
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Audiobook embedding shortcode
     *
     * Usage: [roleander_audiobook id="123" autoplay="false"]
     */
    public function audiobook_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'autoplay' => 'false',
            'width' => '100%',
            'height' => '400px',
            'class' => 'roleander-audiobook'
        ), $atts, 'roleander_audiobook');

        if (empty($atts['id'])) {
            return '<p>' . __('Audiobook ID is required.', 'roleander-integration') . '</p>';
        }

        ob_start();
        ?>
        <div class="roleander-embed <?php echo esc_attr($atts['class']); ?>"
             style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">
            <iframe
                src="<?php echo esc_url($this->api->get_api_url() . '/embed/audiobook/' . $atts['id'] . '?autoplay=' . $atts['autoplay']); ?>"
                width="100%"
                height="100%"
                frameborder="0"
                allowfullscreen
                loading="lazy">
            </iframe>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Featured content shortcode
     *
     * Usage: [roleander_featured limit="6" category="popular"]
     */
    public function featured_content_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 6,
            'category' => 'popular', // popular, featured, new
            'class' => 'roleander-featured'
        ), $atts, 'roleander_featured');

        // Get featured content from API
        $featured_content = $this->api->get_featured_content();
        if (is_wp_error($featured_content)) {
            return '<p>' . __('Error loading featured content.', 'roleander-integration') . '</p>';
        }

        // Filter by category
        if ($atts['category'] !== 'all' && isset($featured_content[$atts['category']])) {
            $content_items = array_slice($featured_content[$atts['category']], 0, intval($atts['limit']));
        } else {
            $content_items = array_slice($featured_content, 0, intval($atts['limit']));
        }

        if (empty($content_items)) {
            return '<p>' . __('No featured content available.', 'roleander-integration') . '</p>';
        }

        ob_start();
        ?>
        <div class="roleander-featured <?php echo esc_attr($atts['class']); ?>">
            <?php foreach ($content_items as $item): ?>
                <div class="roleander-featured-item">
                    <?php if (!empty($item['cover_image'])): ?>
                        <img src="<?php echo esc_url($item['cover_image']); ?>"
                             alt="<?php echo esc_attr($item['title']); ?>"
                             class="roleander-featured-image" />
                    <?php endif; ?>

                    <div class="roleander-featured-content">
                        <h4><?php echo esc_html($item['title']); ?></h4>
                        <p><?php echo esc_html($item['description']); ?></p>
                        <a href="<?php echo esc_url($this->api->get_api_url() . '/audiobooks/' . $item['id']); ?>"
                           class="roleander-btn" target="_blank">
                            <?php _e('Listen Now', 'roleander-integration'); ?>
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Connect button shortcode
     *
     * Usage: [roleander_connect text="Connect Roleander Account" class="custom-class"]
     */
    public function connect_button_shortcode($atts) {
        $atts = shortcode_atts(array(
            'text' => __('Connect Roleander Account', 'roleander-integration'),
            'class' => 'roleander-connect-btn',
            'redirect' => ''
        ), $atts, 'roleander_connect');

        if (!is_user_logged_in()) {
            return '<p>' . __('Please log in to connect your Roleander account.', 'roleander-integration') . '</p>';
        }

        $user_id = get_current_user_id();
        $is_connected = $this->auth->is_user_connected($user_id);

        if ($is_connected) {
            return '<p class="roleander-connected-notice">' . __('✓ Your Roleander account is connected.', 'roleander-integration') . '</p>';
        }

        ob_start();
        ?>
        <button class="roleander-connect-button <?php echo esc_attr($atts['class']); ?>"
                data-redirect="<?php echo esc_attr($atts['redirect']); ?>">
            <?php echo esc_html($atts['text']); ?>
        </button>
        <?php
        return ob_get_clean();
    }

    /**
     * Helper method to get login required message
     */
    private function get_login_required_message() {
        return '<p>' . sprintf(
            __('Please <a href="%s">log in</a> to view this content.', 'roleander-integration'),
            wp_login_url(get_permalink())
        ) . '</p>';
    }

    /**
     * Helper method to get connection required message
     */
    private function get_connection_required_message() {
        return '<p>' . __('Please connect your Roleander account to view this content.', 'roleander-integration') .
               ' <button class="roleander-connect-button">' . __('Connect Account', 'roleander-integration') . '</button></p>';
    }

    /**
     * Helper method to get recommendation reason text
     */
    private function get_reason_text($reason) {
        $reasons = array(
            'similar_genre' => __('Based on books you\'ve enjoyed in this genre', 'roleander-integration'),
            'author_favorite' => __('You\'ve enjoyed other books by this author', 'roleander-integration'),
            'series_continuation' => __('Continue your favorite series', 'roleander-integration'),
            'popular_choice' => __('Popular among readers with similar tastes', 'roleander-integration'),
            'new_release' => __('New release you might enjoy', 'roleander-integration'),
            'staff_pick' => __('Staff recommendation', 'roleander-integration')
        );

        return isset($reasons[$reason]) ? $reasons[$reason] : __('Personalized recommendation', 'roleander-integration');
    }
}