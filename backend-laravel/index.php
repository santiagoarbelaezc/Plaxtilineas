<?php

// Habilitar reporte de errores para diagnóstico en Hostinger
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

try {
    // Determine if the application is in maintenance mode...
    if (file_exists($maintenance = __DIR__.'/storage/framework/maintenance.php')) {
        require $maintenance;
    }

    // Register the Composer autoloader...
    require __DIR__.'/vendor/autoload.php';

    // Bootstrap Laravel and handle the request...
    $app = require_once __DIR__.'/bootstrap/app.php';
    $app->handleRequest(Request::capture());

} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => 'Error capturado en el arranque de Laravel',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}
