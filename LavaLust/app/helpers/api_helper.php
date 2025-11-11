<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * API helper - common JSON/CORS helpers for controllers
 *
 * Place lightweight, reusable functions here so controllers can call
 * api_set_json_headers() and api_json_response() instead of repeating
 * header blocks in every controller.
 */

/**
 * Set common JSON + CORS headers for API responses.
 * Environment-aware: uses config_item('allow_origin') in production,
 * falls back to development localhost origins.
 *
 * Call early in controller action: api_set_json_headers();
 *
 * @param array|null $allowed_origins Override list (optional)
 * @return void
 */
function api_set_json_headers(?array $allowed_origins = null)
{
    // 1) If caller passed an array, use it
    if (is_array($allowed_origins) && !empty($allowed_origins)) {
        $origins_list = $allowed_origins;
    } else {
        // 2) Check if config_item is available (LavaLust framework)
        $env = config_item('ENVIRONMENT') ?? 'development';
        $cfg_allow = config_item('allow_origin') ?? '';

        if ($env === 'production' && !empty($cfg_allow)) {
            // Production: use config setting (comma-separated or '*')
            if ($cfg_allow === '*') {
                $origins_list = ['*'];
            } else {
                $origins_list = array_map('trim', explode(',', $cfg_allow));
            }
        } else {
            // Development: use default localhost origins
            $origins_list = [
                'http://localhost:5174',  // React Vite dev server
                'http://localhost:3000',  // Fallback
                'http://localhost:5173'   // Alternative Vite port
            ];
        }
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Handle CORS: if '*' is in list, only allow it if credentials are NOT used
    // Since we always use credentials (httpOnly cookies), we must echo specific origin
    if (in_array('*', $origins_list, true)) {
        // Wildcard: only safe without credentials. Since we use credentials, echo the incoming origin.
        // WARNING: This effectively allows any origin when credentials=true (reduces CSRF protection).
        // For production, prefer explicit origin list instead.
        if ($origin) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
    } else {
        // Explicit list: only echo origin if it's in the allowlist
        if ($origin && in_array($origin, $origins_list, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}


/**
 * Send a JSON response and exit.
 *
 * @param mixed $data
 * @param int $status
 * @return void
 */
function api_json_response($data = [], int $status = 200)
{
    http_response_code($status);
    // Ensure data is JSON-serializable; if scalar/string passed, wrap it
    if (!is_array($data) && !is_object($data)) {
        $data = ['message' => $data];
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}


/**
 * Shortcut for sending an error JSON response with a message.
 *
 * @param string $message
 * @param int $status
 * @return void
 */
function api_error(string $message = 'An error occurred', int $status = 400)
{
    api_json_response(['success' => false, 'message' => $message], $status);
}

?>
