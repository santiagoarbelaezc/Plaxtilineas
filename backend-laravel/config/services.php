<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'wompi' => [
        'public_key' => env('WOMPI_PUBLIC_KEY', ''),
        'private_key' => env('WOMPI_PRIVATE_KEY', ''),
        'integrity_key' => env('WOMPI_INTEGRITY_KEY', ''),
        'events_key' => env('WOMPI_EVENTS_KEY', ''),
        'base_url' => env('WOMPI_BASE_URL', 'https://production.wompi.co/v1'),
    ],

    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME', ''),
        'api_key' => env('CLOUDINARY_API_KEY', ''),
        'api_secret' => env('CLOUDINARY_API_SECRET', ''),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY', ''),
        'model' => env('GEMINI_MODEL', 'gemini-1.5-flash'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID', ''),
    ],

];
