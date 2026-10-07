<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Plaxtilineas (Laravel 11)
|--------------------------------------------------------------------------
*/

// Endpoint de prueba GET (para verificar despliegue en Hostinger/Local)
Route::get('/test', function (Request $request) {
    return response()->json([
        'status' => 'success',
        'message' => '¡API Laravel de Plaxtilineas funcionando correctamente! 🚀',
        'framework' => 'Laravel ' . app()->version(),
        'php_version' => PHP_VERSION,
        'environment' => app()->environment(),
        'server_time' => now()->toIso8601String(),
        'client_ip' => $request->ip(),
    ]);
});

// Endpoint de prueba POST (para verificar recepción de payloads y CORS)
Route::post('/test', function (Request $request) {
    return response()->json([
        'status' => 'success',
        'message' => 'Petición POST recibida exitosamente en Laravel',
        'payload' => $request->all(),
        'headers' => [
            'content_type' => $request->header('Content-Type'),
            'user_agent' => $request->header('User-Agent'),
        ],
        'server_time' => now()->toIso8601String(),
    ]);
});

// Endpoint de salud del servidor y permisos de escritura (storage/bootstrap)
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->timestamp,
        'storage_writable' => is_writable(storage_path()),
        'cache_writable' => is_writable(base_path('bootstrap/cache')),
        'php_version' => PHP_VERSION,
        'laravel_version' => app()->version(),
    ]);
});

// Endpoint para probar conexión a base de datos (MySQL en Hostinger)
Route::get('/db-check', function () {
    try {
        DB::connection()->getPdo();
        $dbName = DB::connection()->getDatabaseName();
        $driver = DB::connection()->getDriverName();

        return response()->json([
            'status' => 'success',
            'message' => 'Conexión a la base de datos establecida exitosamente.',
            'driver' => $driver,
            'database' => $dbName,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'warning',
            'message' => 'No hay conexión a la base de datos aún o las credenciales del .env son incorrectas.',
            'error' => $e->getMessage(),
            'tip' => 'Revisa los parámetros DB_HOST, DB_DATABASE, DB_USERNAME y DB_PASSWORD en el archivo .env',
        ], 200);
    }
});

// Ruta protegida con Sanctum (ejemplo)
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
