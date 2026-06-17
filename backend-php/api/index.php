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
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ProductoController.php';
require_once __DIR__ . '/controllers/CategoriaController.php';
require_once __DIR__ . '/controllers/SubcategoriaController.php';
require_once __DIR__ . '/controllers/VarianteController.php';
require_once __DIR__ . '/controllers/PqrsController.php';
require_once __DIR__ . '/controllers/ImportarController.php';
require_once __DIR__ . '/controllers/StatsController.php';
require_once __DIR__ . '/controllers/LeadsController.php';
require_once __DIR__ . '/controllers/ComponentesController.php';
require_once __DIR__ . '/controllers/EstadisticasController.php';
require_once __DIR__ . '/controllers/DashboardAssistantController.php';
require_once __DIR__ . '/controllers/AiController.php';
require_once __DIR__ . '/controllers/PedidoController.php';
require_once __DIR__ . '/controllers/WompiController.php';

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

    // ── Estadísticas Catálogo ───────────────────────────────────────────────
    if (str_starts_with($uri, '/estadisticas/catalogo')) {
        AuthMiddleware::verify();
        if ($method === 'GET') {
            EstadisticasController::getCatalogStats();
            exit;
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
                'auth'          => '/api/auth/login',
                'productos'     => '/api/productos',
                'categorias'    => '/api/categorias',
                'subcategorias' => '/api/subcategorias',
                'variantes'     => '/api/variantes',
                'pqrs'          => '/api/pqrs',
                'importar'      => '/api/importar',
                'chat'          => '/api/chat',
                'debug'         => '/api/debug/extensions'
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

    if ($uri === '/auth/login' && $method === 'POST') {
        AuthController::login();
    }

    if ($uri === '/auth/register' && $method === 'POST') {
        AuthController::register();
    }

    if ($uri === '/auth/google' && $method === 'POST') {
        AuthController::googleLogin();
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

    // ═════════════════════════════════════════════════════════════════════════════
    // PRODUCTOS  /api/productos/*
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/productos' && $method === 'GET') {
        ProductoController::obtenerProductos();
    }
    if ($uri === '/productos' && $method === 'POST') {
        AuthMiddleware::verify();
        ProductoController::crearProducto();
    }
    if ($uri === '/productos/bulk-delete' && $method === 'POST') {
        AuthMiddleware::verify();
        ProductoController::eliminarProductosMasivo();
    }
    if ($uri === '/productos/eliminar-todos' && $method === 'DELETE') {
        AuthMiddleware::verify();
        ProductoController::eliminarTodos();
    }

    if ($uri === '/productos/buscar' && $method === 'GET') {
        ProductoController::buscarProductosPorNombre();
    }
    if ($uri === '/productos/busqueda-avanzada' && $method === 'GET') {
        ProductoController::busquedaAvanzada();
    }
    if ($uri === '/productos/estadisticas' && $method === 'GET') {
        ProductoController::obtenerEstadisticasProductos();
    }
    if ($uri === '/productos/interes/aleatorios' && $method === 'GET') {
        ProductoController::obtenerProductosAleatorios();
    }
    if ($uri === '/productos/novedades/ultimos' && $method === 'GET') {
        ProductoController::obtenerUltimosProductos();
    }
    if ($uri === '/productos/verificar-stock' && $method === 'POST') {
        ProductoController::verificarStockCarrito();
    }
    if ($uri === '/productos/relacionados/por-producto' && $method === 'GET') {
        ProductoController::obtenerProductosRelacionados();
    }

    if ($p = matchRoute('/productos/subcategoria/:subcategoria_id', $uri)) {
        if ($method === 'GET') ProductoController::obtenerProductosPorSubcategoria((int)$p['subcategoria_id']);
    }
    if ($p = matchRoute('/productos/categoria/:categoria_id', $uri)) {
        if ($method === 'GET') ProductoController::obtenerProductosPorCategoria((int)$p['categoria_id']);
    }
    if ($p = matchRoute('/productos/:producto_id/variantes', $uri)) {
        if ($method === 'GET') ProductoController::verificarVariantesProducto((int)$p['producto_id']);
    }
    if ($p = matchRoute('/productos/:id', $uri)) {
        match ($method) {
            'GET'    => ProductoController::obtenerProductoPorId((int)$p['id']),
            'PUT', 'POST'=> (AuthMiddleware::verify() && ProductoController::actualizarProducto((int)$p['id'])),
            'DELETE' => (AuthMiddleware::verify() && ProductoController::eliminarProducto((int)$p['id'])),
            default  => null,
        };
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // CATEGORIAS  /api/categorias/*
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/categorias' && $method === 'GET') {
        CategoriaController::obtenerCategorias();
    }
    if ($uri === '/categorias' && $method === 'POST') {
        AuthMiddleware::verify();
        CategoriaController::crearCategoria();
    }
    if ($uri === '/categorias/eliminar-todas' && $method === 'DELETE') {
        AuthMiddleware::verify();
        CategoriaController::eliminarTodas();
    }
    if ($uri === '/categorias/con-subcategorias' && $method === 'GET') {
        CategoriaController::obtenerCategoriasConSubcategorias();
    }
    if ($p = matchRoute('/categorias/nombre/:nombre', $uri)) {
        if ($method === 'GET') CategoriaController::obtenerPorNombre($p['nombre']);
    }
    if ($p = matchRoute('/categorias/id-por-nombre/:nombre', $uri)) {
        if ($method === 'GET') CategoriaController::getIdPorNombre($p['nombre']);
    }
    if ($p = matchRoute('/categorias/:id', $uri)) {
        match ($method) {
            'PUT', 'POST'=> (AuthMiddleware::verify() && CategoriaController::actualizarCategoria((int)$p['id'])),
            'DELETE' => (AuthMiddleware::verify() && CategoriaController::eliminarCategoria((int)$p['id'])),
            default  => null,
        };
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // SUBCATEGORIAS  /api/subcategorias/*
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/subcategorias' && $method === 'GET') {
        SubcategoriaController::obtenerSubcategorias();
    }
    if ($uri === '/subcategorias' && $method === 'POST') {
        AuthMiddleware::verify();
        SubcategoriaController::crearSubcategoria();
    }
    if ($uri === '/subcategorias/eliminar-todas' && $method === 'DELETE') {
        AuthMiddleware::verify();
        SubcategoriaController::eliminarTodas();
    }
    if ($p = matchRoute('/subcategorias/por-categoria/:categoria_id', $uri)) {
        if ($method === 'GET') SubcategoriaController::obtenerSubcategoriasPorCategoria((int)$p['categoria_id']);
    }
    if ($p = matchRoute('/subcategorias/:id', $uri)) {
        match ($method) {
            'PUT'    => (AuthMiddleware::verify() && SubcategoriaController::actualizarSubcategoria((int)$p['id'])),
            'DELETE' => (AuthMiddleware::verify() && SubcategoriaController::eliminarSubcategoria((int)$p['id'])),
            default  => null,
        };
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // VARIANTES  /api/variantes/*
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/variantes' && $method === 'POST') {
        AuthMiddleware::verify();
        VarianteController::crearVariante();
    }
    if ($p = matchRoute('/variantes/producto/:producto_id', $uri)) {
        if ($method === 'GET') VarianteController::obtenerVariantesPorProducto((int)$p['producto_id']);
    }
    if ($p = matchRoute('/variantes/:id', $uri)) {
        match ($method) {
            'GET'    => VarianteController::obtenerVariantePorId((int)$p['id']),
            'PUT'    => (AuthMiddleware::verify() && VarianteController::actualizarVariante((int)$p['id'])),
            'DELETE' => (AuthMiddleware::verify() && VarianteController::eliminarVariante((int)$p['id'])),
            default  => null,
        };
    }

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
    // IMPORTAR  /api/importar/*
    // ═════════════════════════════════════════════════════════════════════════════

    // ═════════════════════════════════════════════════════════════════════════════
    // DASHBOARD ASSISTANT  /api/dashboard-assistant
    // ═════════════════════════════════════════════════════════════════════════════

    if ($uri === '/dashboard-assistant' && $method === 'POST') {
        AuthMiddleware::verify();
        $controller = new DashboardAssistantController();
        $controller->chat();
    }

    if ($uri === '/importar/ejecutar' && $method === 'POST') {
        AuthMiddleware::verify();
        ImportarController::importarProductosHostinger();
    }
    if ($uri === '/importar/estadisticas' && $method === 'GET') {
        AuthMiddleware::verify();
        ImportarController::obtenerEstadisticasHostinger();
    }
    if ($uri === '/importar/preview' && $method === 'GET') {
        AuthMiddleware::verify();
        ImportarController::previewProductosHostinger();
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
    // INTELIGENCIA ARTIFICIAL  /api/ia/*
    // ═════════════════════════════════════════════════════════════════════════════
    if ($uri === '/ia/sugerir-subcategoria' && $method === 'POST') {
        AuthMiddleware::verify();
        AiController::sugerirSubcategoria();
    }
    if ($uri === '/ia/generar-descripcion' && $method === 'POST') {
        AuthMiddleware::verify();
        AiController::generarDescripcion();
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
        AdminUserController::obtenerUsuariosDetalle($user);
        exit;
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
