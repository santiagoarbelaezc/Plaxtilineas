<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/ResponseHandler.php';
require_once __DIR__ . '/utils/TokenHelper.php';
require_once __DIR__ . '/utils/Logger.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';

error_reporting(APP_ENV === 'development' ? E_ALL : 0);
ini_set('display_errors', APP_ENV === 'development' ? '1' : '0');

// ─── Soporte para PHP Built-in Server (php -S) ────────────────────────────────
// Si el archivo existe físicamente, dejamos que el servidor lo sirva directamente (ej: test_api.php)
if (PHP_SAPI === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    // Limpiar prefijo /api si existe para la comprobación de archivo local
    $localFile = preg_replace('#^/api#', '', $path);
    if ($localFile !== '' && $localFile !== '/' && file_exists(__DIR__ . $localFile) && !is_dir(__DIR__ . $localFile)) {
        return false;
    }
}


// ─── Controllers ─────────────────────────────────────────────────────────────
// Nota: Producto, Categoria, Subcategoria, Variante, Importar, Estadisticas y
// AiController han sido eliminados. El catálogo ahora proviene del API externo
// (catalogoplaxtilineas.sembradoresdevida.org) — solo lectura desde el frontend.
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/PqrsController.php';
require_once __DIR__ . '/controllers/StatsController.php';
require_once __DIR__ . '/controllers/LeadsController.php';
require_once __DIR__ . '/controllers/ComponentesController.php';
require_once __DIR__ . '/controllers/DashboardAssistantController.php';
require_once __DIR__ . '/controllers/PedidoController.php';
require_once __DIR__ . '/controllers/WompiController.php';
require_once __DIR__ . '/controllers/ConfiguracionController.php';

// ─── CORS headers (siempre primero) ──────────────────────────────────────────
ResponseHandler::setCorsHeaders();

// ─── Limpieza automática de carritos expirados (24 horas) ────────────────────
try {
    require_once __DIR__ . '/controllers/CarritoController.php';
    CarritoController::limpiarCarritosExpirados(Database::getConnection());
} catch (Throwable $e) {
    Logger::error('Index.php - Error al limpiar carritos expirados: ' . $e->getMessage());
}

// ─── Parsear método y URI ─────────────────────────────────────────────────────
$method = strtoupper($_SERVER['REQUEST_METHOD']);

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($requestUri !== '/' && str_ends_with($requestUri, '/')) {
    $requestUri = rtrim($requestUri, '/');
}

$uri = preg_replace('#^/api#', '', $requestUri);
if (empty($uri)) $uri = '/';

// ─── Helper de routing ────────────────────────────────────────────────────────
function matchRoute(string $pattern, string $uri): array|false
{
    $regex = preg_replace('/:([a-zA-Z_]+)/', '(?P<$1>[^/]+)', $pattern);
    $regex = '#^' . $regex . '$#';
    if (preg_match($regex, $uri, $matches)) {
        return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
    }
    return false;
}

// ─── Dispatch (con try/catch global) ─────────────────────────────────────────
try {


    // ── Configuraciones ─────────────────────────────────────────────────────────────
    if (str_starts_with($uri, '/configuraciones')) {
        if ($method === 'GET' && $uri === '/configuraciones') {
            ConfiguracionController::getAll();
            exit;
        }

        if ($method === 'PUT') {
            $user = AuthMiddleware::verify();
            if ($user['rol'] !== 'admin') {
                ResponseHandler::error('No autorizado. Se requiere rol de administrador.', 403);
                exit;
            }
            if (preg_match('#^/configuraciones/([^/]+)$#', $uri, $matches)) {
                ConfiguracionController::update($matches[1]);
                exit;
            }
        }
    }

    // ── Health check ──────────────────────────────────────────────────────────────
    if ($uri === '/' || $uri === '/health') {
        ResponseHandler::success([
            'status'    => 'OK',
            'api'       => 'Plaxtilineas API (PHP)',
            'version'   => '1.0.0',
            'timestamp' => date('c'),
            'endpoints' => [
                'auth'                => '/api/auth/login',
                'pqrs'                => '/api/pqrs',
                'pedidos'             => '/api/pedidos',
                'wompi'               => '/api/wompi/datos-pago',
                'carrito'             => '/api/carrito/sync',
                'componentes'         => '/api/componentes',
                'leads'               => '/api/leads',
                'stats'               => '/api/stats/dashboard',
                'dashboard_assistant' => '/api/dashboard-assistant',
                'configuraciones'     => '/api/configuraciones',
                'chat'                => '/api/chat',
                'debug'               => '/api/debug/extensions',
                'catalogo_externo'    => 'https://catalogoplaxtilineas.sembradoresdevida.org/api',
            ],
        ]);
    }

    if ($uri === '/debug/extensions') {
        ResponseHandler::success([
            'php_version'       => PHP_VERSION,
            'php_ini_path'      => php_ini_loaded_file(),
            'loaded_extensions' => get_loaded_extensions(),
            'pdo_drivers'       => PDO::getAvailableDrivers(),
            'app_env'           => defined('APP_ENV') ? APP_ENV : 'undefined'
        ]);
    }


    // ═════════════════════════════════════════════════════════════════════════════
    // AUTH  /api/auth/*
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/auth/captcha' && $method === 'GET') {
        AuthController::getCaptcha();
    }

    if ($uri === '/auth/login' && $method === 'POST') {
        AuthController::login();
    }

    if ($uri === '/auth/register' && $method === 'POST') {
        AuthController::register();
    }

    if ($uri === '/auth/google' && $method === 'POST') {
        AuthController::googleLogin();
    }

    if ($uri === '/auth/recuperar-password' && $method === 'POST') {
        AuthController::recuperarPassword();
    }

    if ($uri === '/auth/cambiar-password-temporal' && $method === 'POST') {
        AuthController::cambiarPasswordTemporal();
    }

    if ($uri === '/auth/verificar-email' && $method === 'GET') {
        AuthController::verificarEmail();
    }

    if ($uri === '/auth/perfil' && $method === 'GET') {
        $user = AuthMiddleware::verify();
        AuthController::perfil($user);
    }

    if ($uri === '/auth/actualizar' && $method === 'PUT') {
        $user = AuthMiddleware::verify();
        AuthController::actualizarPerfil($user);
    }

    if ($uri === '/auth/cuenta' && $method === 'DELETE') {
        $user = AuthMiddleware::verify();
        AuthController::eliminarCuenta($user);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // NOTA: Las rutas de /productos, /categorias, /subcategorias y /variantes han
    // sido eliminadas. El catálogo de productos es ahora de solo lectura y proviene
    // del API externo: https://catalogoplaxtilineas.sembradoresdevida.org/api
    // El frontend consume ese endpoint directamente (CatalogoService).
    // ─────────────────────────────────────────────────────────────────────────────


    // ═════════════════════════════════════════════════════════════════════════════
    // PQRS  /api/pqrs/*
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/pqrs' && $method === 'POST') {
        PqrsController::crearPQR();
    }
    if ($uri === '/pqrs' && $method === 'GET') {
        AuthMiddleware::verify();
        PqrsController::obtenerPQRS();
    }
    if ($uri === '/pqrs/estadisticas' && $method === 'GET') {
        AuthMiddleware::verify();
        PqrsController::obtenerEstadisticas();
    }
    if ($uri === '/pqrs/ultimas' && $method === 'GET') {
        AuthMiddleware::verify();
        PqrsController::obtenerUltimaPQR();
    }
    if ($uri === '/pqrs/buscar' && $method === 'GET') {
        AuthMiddleware::verify();
        PqrsController::buscarPQRS();
    }
    if ($p = matchRoute('/pqrs/consulta/:id', $uri)) {
        if ($method === 'GET') PqrsController::obtenerPQRPorId($p['id']);
    }
    if ($p = matchRoute('/pqrs/:id/estado', $uri)) {
        if ($method === 'PUT') {
            AuthMiddleware::verify();
            PqrsController::actualizarEstadoPQR($p['id']);
        }
    }
    if ($p = matchRoute('/pqrs/:id/respuestas', $uri)) {
        if ($method === 'POST') {
            $user = AuthMiddleware::verify();
            PqrsController::agregarRespuesta($p['id'], $user);
        }
    }
    if ($p = matchRoute('/pqrs/:id', $uri)) {
        if ($method === 'DELETE') {
            AuthMiddleware::verify();
            PqrsController::eliminarPQR($p['id']);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // DASHBOARD ASSISTANT  /api/dashboard-assistant
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/dashboard-assistant' && $method === 'POST') {
        AuthMiddleware::verify();
        $controller = new DashboardAssistantController();
        $controller->chat();
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // ESTADÍSTICAS Y ANALÍTICA  /api/stats/*
    // ═════════════════════════════════════════════════════════════════════════════
    if ($uri === '/stats/track' && $method === 'POST') {
        StatsController::track();
    }
    if ($uri === '/stats/dashboard' && $method === 'GET') {
        AuthMiddleware::verify();
        StatsController::getDashboardStats();
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // LEADS / REGISTRO DE PERSONAS  /api/leads/*
    // ═════════════════════════════════════════════════════════════════════════════
    if ($uri === '/leads' && $method === 'POST') {
        LeadsController::create();
    }
    if ($uri === '/leads' && $method === 'GET') {
        AuthMiddleware::verify();
        LeadsController::getAll();
    }
    if ($uri === '/leads/stats' && $method === 'GET') {
        AuthMiddleware::verify();
        LeadsController::getStats();
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // COMPONENTES DINÁMICOS /api/componentes/*
    // ═════════════════════════════════════════════════════════════════════════════
    if ($uri === '/componentes' && $method === 'GET') {
        ComponentesController::index();
    }
    if ($uri === '/componentes' && $method === 'POST') {
        AuthMiddleware::verify();
        ComponentesController::create();
    }
    if ($uri === '/componentes/reordenar' && $method === 'PUT') {
        AuthMiddleware::verify();
        ComponentesController::reordenar();
        exit;
    }
    if ($uri === '/componentes/upload' && $method === 'POST') {
        AuthMiddleware::verify();
        ComponentesController::uploadImage();
        exit;
    }
    if ($p = matchRoute('/componentes/:id', $uri)) {
        if ($method === 'PUT') {
            AuthMiddleware::verify();
            ComponentesController::update((int)$p['id']);
        }
        if ($method === 'DELETE') {
            AuthMiddleware::verify();
            ComponentesController::delete((int)$p['id']);
        }
    }


    // ═════════════════════════════════════════════════════════════════════════════
    // ASISTENTE VIRTUAL MATEO  /api/chat/*
    // ═════════════════════════════════════════════════════════════════════════════
    require_once __DIR__ . '/routes/chat.routes.php';

    // ═════════════════════════════════════════════════════════════════════════════
    // CARRITO Y USUARIOS DETALLE (ADMIN/CLIENTE)
    // ═════════════════════════════════════════════════════════════════════════════
    require_once __DIR__ . '/controllers/CarritoController.php';
    require_once __DIR__ . '/controllers/AdminUserController.php';

    if ($uri === '/carrito/sync' && $method === 'POST') {
        $user = AuthMiddleware::verify();
        CarritoController::sync($user);
        exit;
    }

    if ($uri === '/admin/usuarios-detalle' && $method === 'GET') {
        $user = AuthMiddleware::verify();
        // Nota: Deberíamos verificar si $user['rol'] === 'admin', pero si AuthMiddleware ya lo hace, está bien.
        AdminUserController::obtenerUsuariosDetalle($user);
        exit;
    }

    if (str_starts_with($uri, '/admin/usuarios/') && $method === 'DELETE') {
        $user = AuthMiddleware::verify();
        if ($user['rol'] !== 'admin') {
            ResponseHandler::error('No autorizado. Se requiere rol de administrador.', 403);
            exit;
        }
        $idStr = substr($uri, strlen('/admin/usuarios/'));
        if (is_numeric($idStr)) {
            AdminUserController::eliminarUsuario((int)$idStr);
            exit;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // WOMPI  /api/wompi/*
    // ═════════════════════════════════════════════════════════════════════════════

    // Genera firma SHA-256 y devuelve datos para el widget (requiere JWT)
    if ($uri === '/wompi/datos-pago' && $method === 'POST') {
        $user = AuthMiddleware::verify();
        WompiController::datosPago($user);
        exit;
    }

    // Webhook de Wompi (NO requiere JWT, verifica firma propia de Wompi)
    if ($uri === '/wompi/webhook' && $method === 'POST') {
        WompiController::webhook();
        exit;
    }

    // Aprobación simulada de pago de Wompi (Solo habilitado en desarrollo)
    if ($uri === '/wompi/mock-approve' && (defined('APP_ENV') && APP_ENV === 'development')) {
        $referencia = $_GET['ref'] ?? $_POST['ref'] ?? null;
        if (!$referencia) {
            ResponseHandler::error('Parámetro ?ref= requerido.', 400);
            exit;
        }
        $db = Database::getConnection();
        $stmtPedido = $db->prepare("SELECT id, total FROM pedidos WHERE wompi_referencia = ?");
        $stmtPedido->execute([$referencia]);
        $pedido = $stmtPedido->fetch();
        if (!$pedido) {
            ResponseHandler::error('Pedido no encontrado.', 404);
            exit;
        }
        $ok = PedidoController::confirmarPedido(
            (int)$pedido['id'],
            'mock_transaction_' . uniqid(),
            'mock_event_' . uniqid(),
            (int)round((float)$pedido['total'] * 100)
        );
        if ($ok) {
            ResponseHandler::success(['mensaje' => 'Pedido marcado como pagado exitosamente (Mock)']);
        } else {
            ResponseHandler::error('Error al confirmar el pedido (Mock)', 500);
        }
        exit;
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // PEDIDOS  /api/pedidos/*
    // ═════════════════════════════════════════════════════════════════════════════

    // Crear DRAFT de pedido (Fase 1 del Two-Phase Commit)
    if ($uri === '/pedidos/draft' && $method === 'POST') {
        $user = AuthMiddleware::verify();
        PedidoController::crearDraft($user);
        exit;
    }
    // Verificar estado de pago por referencia Wompi
    if ($uri === '/pedidos/estado' && $method === 'GET') {
        $user = AuthMiddleware::verify();
        PedidoController::verificarEstado($user);
        exit;
    }
    if ($uri === '/pedidos/mis-pedidos' && $method === 'GET') {
        $user = AuthMiddleware::verify();
        PedidoController::obtenerMisPedidos($user);
        exit;
    }
    if ($uri === '/pedidos/admin/todos' && $method === 'GET') {
        $user = AuthMiddleware::verify();
        PedidoController::adminObtenerTodos($user);
        exit;
    }
    if ($p = matchRoute('/pedidos/admin/actualizar-estado/:id', $uri)) {
        if ($method === 'PUT') {
            $user = AuthMiddleware::verify();
            PedidoController::adminActualizarEstado((int)$p['id'], $user);
            exit;
        }
    }

    // Cancelar pedido propio
    if ($p = matchRoute('/pedidos/cancelar/:id', $uri)) {
        if ($method === 'PUT') {
            $user = AuthMiddleware::verify();
            PedidoController::cancelarPedido((int)$p['id'], $user);
            exit;
        }
    }

    // Eliminar pedido propio
    if ($p = matchRoute('/pedidos/eliminar/:id', $uri)) {
        if ($method === 'DELETE') {
            $user = AuthMiddleware::verify();
            PedidoController::eliminarPedido((int)$p['id'], $user);
            exit;
        }
    }

    // ─── 404 fallback ────────────────────────────────────────────────────────────
    ResponseHandler::error(
        "Endpoint no encontrado: [{$method}] /api{$uri}",
        404,
        [
            'ayuda'  => 'Revisa los endpoints disponibles en GET /api/',
            'metodo' => $method,
            'ruta'   => "/api{$uri}",
        ]
    );

} catch (PDOException $e) {
    Logger::error('index.php – PDOException global', [
        'exception' => $e->getMessage(),
        'code'      => $e->getCode(),
    ]);
    ResponseHandler::error('Error de base de datos', 500, [
        'tipo'    => 'PDOException',
        'detalle' => APP_ENV === 'development' ? $e->getMessage() : 'Contacta al administrador',
        'codigo'  => $e->getCode(),
    ]);
} catch (InvalidArgumentException $e) {
    ResponseHandler::error($e->getMessage(), 400, ['tipo' => 'InvalidArgumentException']);
} catch (RuntimeException $e) {
    Logger::error('index.php – RuntimeException global', ['exception' => $e->getMessage()]);
    ResponseHandler::error($e->getMessage(), 500, ['tipo' => 'RuntimeException']);
} catch (Throwable $e) {
    Logger::error('index.php – Throwable global', [
        'tipo'      => get_class($e),
        'exception' => $e->getMessage(),
        'archivo'   => $e->getFile() . ':' . $e->getLine(),
    ]);
    ResponseHandler::error('Error inesperado del servidor', 500, [
        'tipo'    => get_class($e),
        'detalle' => APP_ENV === 'development' ? $e->getMessage() : 'Error interno',
        'archivo' => APP_ENV === 'development' ? $e->getFile() . ':' . $e->getLine() : null,
    ]);
}
