<?php
/**
 * Roleander API Communication Class
 *
 * Handles all API communication with the Roleander platform
 */

if (!defined('ABSPATH')) {
    exit;
}

class Roleander_API {

    /**
     * API base URL
     */
    private $api_url;

    /**
     * Client ID for OAuth
     */
    private $client_id;

    /**
     * Client secret for OAuth
     */
    private $client_secret;

    /**
     * Access token for API calls
     */
    private $access_token;

    /**
     * Token expiration time
     */
    private $token_expires;

    /**
     * Constructor
     */
    public function __construct() {
        $this->api_url = get_option('roleander_api_url', 'https://roleanderbooks.com');
        $this->client_id = get_option('roleander_client_id', '');
        $this->client_secret = get_option('roleander_client_secret', '');
        $this->access_token = get_option('roleander_access_token', '');
        $this->token_expires = get_option('roleander_token_expires', 0);
    }

    /**
     * Initialize the API handler
     */
    public function init() {
        // Schedule token refresh
        add_action('roleander_refresh_token', array($this, 'refresh_access_token'));
    }

    /**
     * Make authenticated API request
     */
    public function make_request($endpoint, $method = 'GET', $data = null, $requires_auth = true) {
        $url = $this->api_url . '/api' . $endpoint;

        $args = array(
            'method' => $method,
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'Roleander-WordPress/' . ROLEANDER_VERSION
            )
        );

        // Add authentication if required
        if ($requires_auth) {
            $token = $this->get_valid_access_token();
            if (!$token) {
                return new WP_Error('auth_failed', 'Failed to obtain access token');
            }
            $args['headers']['Authorization'] = 'Bearer ' . $token;
        }

        // Add request body for POST/PUT requests
        if (in_array($method, array('POST', 'PUT', 'PATCH')) && $data) {
            $args['body'] = wp_json_encode($data);
        }

        // Add query parameters for GET requests
        if ($method === 'GET' && $data) {
            $url = add_query_arg($data, $url);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        // Handle token expiration
        if ($response_code === 401) {
            // Try to refresh token and retry once
            if ($this->refresh_access_token()) {
                return $this->make_request($endpoint, $method, $data, $requires_auth);
            }
            return new WP_Error('auth_failed', 'Authentication failed');
        }

        // Parse JSON response
        $parsed_response = json_decode($response_body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_parse_error', 'Failed to parse API response');
        }

        return $parsed_response;
    }

    /**
     * Get a valid access token
     */
    private function get_valid_access_token() {
        // Check if current token is still valid
        if ($this->access_token && $this->token_expires > time() + 300) { // 5 minutes buffer
            return $this->access_token;
        }

        // Try to refresh token
        if ($this->refresh_access_token()) {
            return $this->access_token;
        }

        // Get new token using client credentials
        return $this->get_client_credentials_token();
    }

    /**
     * Get access token using client credentials flow
     */
    private function get_client_credentials_token() {
        if (!$this->client_id || !$this->client_secret) {
            return false;
        }

        $response = wp_remote_post($this->api_url . '/oauth/token', array(
            'body' => array(
                'grant_type' => 'client_credentials',
                'client_id' => $this->client_id,
                'client_secret' => $this->client_secret,
                'scope' => 'wordpress-integration'
            ),
            'timeout' => 30
        ));

        if (is_wp_error($response)) {
            error_log('Roleander API: Failed to get client credentials token - ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            error_log('Roleander API: Token request failed with code ' . $response_code . ' - ' . $response_body);
            return false;
        }

        $token_data = json_decode($response_body, true);
        if (!$token_data || !isset($token_data['access_token'])) {
            error_log('Roleander API: Invalid token response - ' . $response_body);
            return false;
        }

        $this->access_token = $token_data['access_token'];
        $this->token_expires = time() + ($token_data['expires_in'] ?? 3600);

        // Store token in options
        update_option('roleander_access_token', $this->access_token);
        update_option('roleander_token_expires', $this->token_expires);

        return $this->access_token;
    }

    /**
     * Refresh access token
     */
    public function refresh_access_token() {
        // For client credentials, we just get a new token
        return $this->get_client_credentials_token();
    }

    /**
     * Get user profile from Roleander
     */
    public function get_user_profile($roleander_user_id) {
        return $this->make_request("/users/{$roleander_user_id}/profile");
    }

    /**
     * Get user achievements
     */
    public function get_user_achievements($roleander_user_id) {
        return $this->make_request("/users/{$roleander_user_id}/achievements");
    }

    /**
     * Get user reading progress
     */
    public function get_user_progress($roleander_user_id) {
        return $this->make_request("/users/{$roleander_user_id}/progress");
    }

    /**
     * Get user character sheets
     */
    public function get_user_characters($roleander_user_id) {
        return $this->make_request("/users/{$roleander_user_id}/characters");
    }

    /**
     * Get content recommendations for user
     */
    public function get_recommendations($roleander_user_id, $limit = 10) {
        return $this->make_request("/users/{$roleander_user_id}/recommendations", 'GET', array('limit' => $limit));
    }

    /**
     * Sync user data to Roleander
     */
    public function sync_user_data($roleander_user_id, $user_data) {
        return $this->make_request("/users/{$roleander_user_id}/sync", 'POST', $user_data);
    }

    /**
     * Get audiobook details
     */
    public function get_audiobook($audiobook_id) {
        return $this->make_request("/audiobooks/{$audiobook_id}");
    }

    /**
     * Get series information
     */
    public function get_series($series_id) {
        return $this->make_request("/series/{$series_id}");
    }

    /**
     * Search audiobooks
     */
    public function search_audiobooks($query, $filters = array()) {
        $params = array_merge(array('q' => $query), $filters);
        return $this->make_request('/audiobooks/search', 'GET', $params);
    }

    /**
     * Get popular audiobooks
     */
    public function get_popular_audiobooks($limit = 10) {
        return $this->make_request('/audiobooks/popular', 'GET', array('limit' => $limit));
    }

    /**
     * Get featured content
     */
    public function get_featured_content() {
        return $this->make_request('/content/featured');
    }

    /**
     * Validate API connection
     */
    public function test_connection() {
        $response = $this->make_request('/health', 'GET', null, false);
        return !is_wp_error($response) && isset($response['status']) && $response['status'] === 'ok';
    }

    /**
     * Get API status and version info
     */
    public function get_api_info() {
        return $this->make_request('/info', 'GET', null, false);
    }

    /**
     * Log API request for debugging
     */
    private function log_request($endpoint, $method, $response_code, $error = null) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $log_message = sprintf(
                '[Roleander API] %s %s - Response: %d',
                $method,
                $endpoint,
                $response_code
            );

            if ($error) {
                $log_message .= ' - Error: ' . $error;
            }

            error_log($log_message);
        }
    }
}