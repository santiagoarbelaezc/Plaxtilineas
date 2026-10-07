<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes - Plaxtilineas (Laravel 11)
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return response()->json([
        'status' => 'success',
        'app' => 'Plaxtilineas Backend API (Laravel 11)',
        'message' => '¡Servidor Laravel activo y respondiendo correctamente!',
        'laravel_version' => app()->version(),
        'php_version' => PHP_VERSION,
        'environment' => app()->environment(),
        'endpoints' => [
            'test_get' => url('/api/test'),
            'test_post' => url('/api/test'),
            'health_check' => url('/api/health'),
            'database_check' => url('/api/db-check'),
        ],
    ]);
});
