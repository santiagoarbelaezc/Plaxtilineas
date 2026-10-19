<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CarritoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Plaxtilineas (Laravel 11)
|--------------------------------------------------------------------------
*/

// Endpoint de prueba GET
Route::get('/test', function (Request $request) {
    return response()->json([
        'status' => 'success',
        'message' => '¡API Laravel de Plaxtilineas funcionando correctamente! 🚀',
        'framework' => 'Laravel '.app()->version(),
        'php_version' => PHP_VERSION,
        'environment' => app()->environment(),
        'server_time' => now()->toIso8601String(),
        'client_ip' => $request->ip(),
    ]);
});

// Endpoint de prueba POST
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

// Endpoint de salud del servidor
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

// Endpoint para probar conexión a base de datos
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
    } catch (Throwable $e) {
        return response()->json([
            'status' => 'warning',
            'message' => 'No hay conexión a la base de datos aún.',
            'error' => $e->getMessage(),
        ], 200);
    }
});

// Ruta de usuario autenticado
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// ═════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION  /api/auth/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('auth')->group(function () {
    Route::get('/captcha', [AuthController::class, 'captcha']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/google', [AuthController::class, 'googleLogin'])->middleware('throttle:auth');
    Route::post('/recuperar-password', [AuthController::class, 'recuperarPassword'])->middleware('throttle:auth');
    Route::get('/verificar-email', [AuthController::class, 'verificarEmail']);

    // Rutas protegidas
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/cambiar-password-temporal', [AuthController::class, 'cambiarPasswordTemporal']);
        Route::get('/perfil', [AuthController::class, 'perfil']);
        Route::put('/actualizar', [AuthController::class, 'actualizar']);
        Route::delete('/cuenta', [AuthController::class, 'cuenta']);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN USUARIOS  /api/admin/*
// ═════════════════════════════════════════════════════════════════════════════

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/usuarios-detalle', [AdminUserController::class, 'obtenerUsuariosDetalle']);
    Route::delete('/usuarios/{id}', [AdminUserController::class, 'eliminarUsuario']);
});

// ═════════════════════════════════════════════════════════════════════════════
// CARRITO  /api/carrito/*
// ═════════════════════════════════════════════════════════════════════════════

Route::middleware('auth:sanctum')->prefix('carrito')->group(function () {
    Route::post('/sync', [CarritoController::class, 'sync']);
});

