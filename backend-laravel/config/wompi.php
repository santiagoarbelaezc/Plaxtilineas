<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Configuración Wompi – Plaxtilineas
|--------------------------------------------------------------------------
| Todas las variables de Wompi se leen EXCLUSIVAMENTE desde aquí.
| Nunca uses env() directamente en el código de la aplicación.
|
| Sandbox : WOMPI_ENV=sandbox  → base_url apunta a sandbox.wompi.co
| Producción: WOMPI_ENV=production → base_url apunta a production.wompi.co
*/

$env = env('WOMPI_ENV', 'sandbox');

return [

    /*
    |--------------------------------------------------------------------------
    | Ambiente activo
    |--------------------------------------------------------------------------
    */
    'env' => $env,

    /*
    |--------------------------------------------------------------------------
    | URL base del API
    |--------------------------------------------------------------------------
    */
    'base_url' => $env === 'production'
        ? 'https://production.wompi.co/v1'
        : 'https://sandbox.wompi.co/v1',

    /*
    |--------------------------------------------------------------------------
    | Llaves de autenticación
    |--------------------------------------------------------------------------
    */
    'public_key'  => env('WOMPI_PUBLIC_KEY', ''),
    'private_key' => env('WOMPI_PRIVATE_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Secretos de integración técnica
    |--------------------------------------------------------------------------
    */
    'integrity_secret' => env('WOMPI_INTEGRITY_SECRET', ''),
    'events_secret'    => env('WOMPI_EVENTS_SECRET', ''),

    /*
    |--------------------------------------------------------------------------
    | Configuración de HTTP
    |--------------------------------------------------------------------------
    */
    'timeout'       => (int) env('WOMPI_TIMEOUT', 15),
    'retry_times'   => (int) env('WOMPI_RETRY_TIMES', 2),
    'retry_sleep'   => (int) env('WOMPI_RETRY_SLEEP', 500), // ms

    /*
    |--------------------------------------------------------------------------
    | Redirect URL para el Checkout Web / Widget
    |--------------------------------------------------------------------------
    | El frontend debe leer el estado real desde la BD en esta URL, no
    | confiar en los parámetros de query-string que devuelve Wompi.
    */
    'redirect_url' => env('WOMPI_REDIRECT_URL',
        rtrim(env('FRONTEND_URL', 'http://localhost:4200'), '/').'/pago-resultado'
    ),

];
