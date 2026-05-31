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

// ─── CORS headers (siempre primero) ──────────────────────────────────────────
ResponseHandler::setCorsHeaders();

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

    if ($uri === '/auth/perfil' && $method === 'GET') {
        $user = AuthMiddleware::verify();
        AuthController::perfil($user);
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
    // ASISTENTE VIRTUAL MATEO  /api/chat/*
    // ═════════════════════════════════════════════════════════════════════════════
    require_once __DIR__ . '/routes/chat.routes.php';

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
