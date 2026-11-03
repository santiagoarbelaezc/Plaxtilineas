<?php

declare(strict_types=1);

$rawOrigins = env('CORS_ALLOWED_ORIGINS', 'https://plaxtilineas.com,https://www.plaxtilineas.com,http://localhost:4200,http://127.0.0.1:4200');
$allowedOrigins = is_string($rawOrigins)
    ? array_map('trim', explode(',', $rawOrigins))
    : ['https://plaxtilineas.com', 'https://www.plaxtilineas.com', 'http://localhost:4200', 'http://127.0.0.1:4200'];

if (env('FRONTEND_URL')) {
    $allowedOrigins[] = rtrim((string) env('FRONTEND_URL'), '/');
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique($allowedOrigins)),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-ID'],

    'exposed_headers' => ['X-Request-ID'],

    'max_age' => 86400,

    'supports_credentials' => true,

];
