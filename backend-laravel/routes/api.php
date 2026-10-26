<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CarritoController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ComponentesController;
use App\Http\Controllers\Api\ConfiguracionController;
use App\Http\Controllers\Api\DashboardAssistantController;
use App\Http\Controllers\Api\LeadsController;
use App\Http\Controllers\Api\PedidoController;
use App\Http\Controllers\Api\PqrsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\WompiController;
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

// ═════════════════════════════════════════════════════════════════════════════
// PEDIDOS  /api/pedidos/*
// ═════════════════════════════════════════════════════════════════════════════

Route::middleware('auth:sanctum')->prefix('pedidos')->group(function () {
    Route::post('/draft', [PedidoController::class, 'crearDraft']);
    Route::get('/mis-pedidos', [PedidoController::class, 'obtenerMisPedidos']);
    Route::get('/estado', [PedidoController::class, 'verificarEstado']);
    Route::post('/{id}/cancelar', [PedidoController::class, 'cancelar']);
    Route::delete('/{id}', [PedidoController::class, 'eliminar']);

    // Compatibilidad legacy para rutas anidadas bajo /pedidos/admin/
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/todos', [PedidoController::class, 'adminObtenerTodos']);
        Route::put('/actualizar-estado/{id}', [PedidoController::class, 'adminActualizarEstado']);
    });

});

Route::middleware('auth:sanctum')->post('/productos/verificar-stock', [PedidoController::class, 'verificarStock']);

// Rutas admin estándar
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/pedidos', [PedidoController::class, 'adminObtenerTodos']);
    Route::put('/pedidos/{id}/estado', [PedidoController::class, 'adminActualizarEstado']);
    Route::delete('/pedidos/{id}', [PedidoController::class, 'adminEliminar']);
});

// ═════════════════════════════════════════════════════════════════════════════
// WOMPI  /api/wompi/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('wompi')->group(function () {
    // Generación de link de pago (requiere autenticación)
    Route::post('/datos-pago', [WompiController::class, 'datosPago'])->middleware('auth:sanctum');

    // Webhook público para eventos de Wompi (protegido por checksum)
    Route::post('/webhook', [WompiController::class, 'webhook'])->middleware('throttle:wompi-webhook');
});

// ═════════════════════════════════════════════════════════════════════════════
// PQRS  /api/pqrs/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('pqrs')->group(function () {
    Route::post('/', [PqrsController::class, 'crearPQR']);
    Route::get('/consulta/{id}', [PqrsController::class, 'obtenerPQRPorId']);

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::get('/', [PqrsController::class, 'obtenerPQRS']);
        Route::get('/estadisticas', [PqrsController::class, 'obtenerEstadisticas']);
        Route::get('/ultimas', [PqrsController::class, 'obtenerUltimaPQR']);
        Route::get('/buscar', [PqrsController::class, 'buscarPQRS']);
        Route::put('/{id}/estado', [PqrsController::class, 'actualizarEstadoPQR']);
        Route::post('/{id}/respuestas', [PqrsController::class, 'agregarRespuesta']);
        Route::delete('/{id}', [PqrsController::class, 'eliminarPQR']);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// CHAT ASISTENTE MATEO  /api/chat/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('chat')->middleware('throttle:chat')->group(function () {
    Route::post('/', [ChatController::class, 'chat']);
    Route::get('/historial', [ChatController::class, 'historial']);
    Route::delete('/limpiar', [ChatController::class, 'limpiar']);
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD ASSISTANT  /api/dashboard-assistant
// ═════════════════════════════════════════════════════════════════════════════

Route::post('/dashboard-assistant', [DashboardAssistantController::class, 'chat'])
    ->middleware(['auth:sanctum', 'admin']);

// ═════════════════════════════════════════════════════════════════════════════
// LEADS  /api/leads/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('leads')->group(function () {
    Route::post('/', [LeadsController::class, 'create']);

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::get('/stats', [LeadsController::class, 'getStats']);
        Route::get('/', [LeadsController::class, 'getAll']);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTES DINÁMICOS /api/componentes/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('componentes')->group(function () {
    Route::get('/', [ComponentesController::class, 'index']);

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::post('/upload', [ComponentesController::class, 'uploadImage']);
        Route::put('/reordenar', [ComponentesController::class, 'reordenar']);
        Route::post('/', [ComponentesController::class, 'create']);
        Route::put('/{id}', [ComponentesController::class, 'update']);
        Route::delete('/{id}', [ComponentesController::class, 'delete']);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURACIONES /api/configuraciones/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('configuraciones')->group(function () {
    Route::get('/', [ConfiguracionController::class, 'getAll']);
    Route::put('/{clave}', [ConfiguracionController::class, 'update'])->middleware(['auth:sanctum', 'admin']);
});

// ═════════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS Y ANALÍTICA /api/stats/*
// ═════════════════════════════════════════════════════════════════════════════

Route::prefix('stats')->group(function () {
    Route::post('/track', [StatsController::class, 'track']);
    Route::get('/dashboard', [StatsController::class, 'getDashboardStats'])->middleware(['auth:sanctum', 'admin']);
});
