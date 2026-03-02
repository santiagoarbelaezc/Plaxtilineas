<?php
/**
 * ┌──────────────────────────────────────────────────────┐
 * │   Plaxtilineas API – Router Principal (index.php)    │
 * │   Equivalente a server.js de Node.js/Express         │
 * └──────────────────────────────────────────────────────┘
 *
 * Reescribe las URLs a este archivo gracias al .htaccess.
 * Lee el método HTTP y la URI para despachar al controller correcto.
 */

// ─── Autoload de archivos base ───────────────────────────────────────────────
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/ResponseHandler.php';
require_once __DIR__ . '/utils/TokenHelper.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';

error_reporting(APP_ENV === 'development' ? E_ALL : 0);
ini_set('display_errors', APP_ENV === 'development' ? '1' : '0');


// ─── Controllers ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ProductoController.php';
require_once __DIR__ . '/controllers/CategoriaController.php';
require_once __DIR__ . '/controllers/SubcategoriaController.php';
require_once __DIR__ . '/controllers/VarianteController.php';
require_once __DIR__ . '/controllers/PqrsController.php';
require_once __DIR__ . '/controllers/ImportarController.php';

// ─── CORS headers (siempre primero) ──────────────────────────────────────────
ResponseHandler::setCorsHeaders();

// ─── Parsear método y URI ─────────────────────────────────────────────────────
$method = strtoupper($_SERVER['REQUEST_METHOD']);

// Obtener la URI limpia: quitar el prefijo /api y el query string
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalizar: remover trailing slash excepto en "/"
if ($requestUri !== '/' && str_ends_with($requestUri, '/')) {
    $requestUri = rtrim($requestUri, '/');
}

// Remover el prefijo /api si lo lleva
$uri = preg_replace('#^/api#', '', $requestUri);
if (empty($uri)) $uri = '/';

// ─── Helper de routing ────────────────────────────────────────────────────────
/**
 * Crea un matcher de rutas: soporta segmentos como :id, :nombre, etc.
 * Devuelve un array asociativo con los parámetros capturados o false.
 *
 * @param string $pattern  Ej: '/productos/:id'
 * @param string $uri      Ej: '/productos/42'
 * @return array|false
 */
function matchRoute(string $pattern, string $uri): array|false
{
    $regex = preg_replace('/:([a-zA-Z_]+)/', '(?P<$1>[^/]+)', $pattern);
    $regex = '#^' . $regex . '$#';
    if (preg_match($regex, $uri, $matches)) {
        return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
    }
    return false;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

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
            'debug'         => '/api/debug/extensions'
        ],
    ]);
}

if ($uri === '/debug/extensions') {
    ResponseHandler::success([
        'php_version' => PHP_VERSION,
        'php_ini_path' => php_ini_loaded_file(),
        'loaded_extensions' => get_loaded_extensions(),
        'pdo_drivers' => PDO::getAvailableDrivers(),
        'app_env' => defined('APP_ENV') ? APP_ENV : 'undefined'
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
        'PUT'    => (AuthMiddleware::verify() && ProductoController::actualizarProducto((int)$p['id'])),
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
        'PUT'    => (AuthMiddleware::verify() && CategoriaController::actualizarCategoria((int)$p['id'])),
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

if ($uri === '/importar/hostinger' && $method === 'POST') {
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

// ─── 404 fallback ────────────────────────────────────────────────────────────
ResponseHandler::error(
    "Endpoint no encontrado: [{$method}] /api{$uri}",
    404,
    [
        'ayuda'    => 'Revisa los endpoints disponibles en GET /api/',
        'metodo'   => $method,
        'ruta'     => "/api{$uri}",
    ]
);
