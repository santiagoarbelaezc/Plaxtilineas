<?php
/**
 * _test_runner.php – Ejecutado como subproceso por test_api.php
 *
 * Variables de entorno usadas:
 *   TR_METHOD  – GET, POST, PUT, DELETE
 *   TR_URI     – ruta + query string, ej: /auth/login o /productos?page=1
 *   TR_AUTH    – valor completo del header Authorization (sin la clave)
 *   TR_BODY    – body JSON codificado como string (para POST/PUT)
 *
 * El status HTTP final se emite a stderr en el shutdown function.
 * La respuesta JSON va a stdout.
 */

// ── Emitir status code a stderr en shutdown ────────────────────────────────
register_shutdown_function(function () {
    fwrite(STDERR, http_response_code() . PHP_EOL);
});

// ── Montar superglobals ─────────────────────────────────────────────────────
$method  = getenv('TR_METHOD') ?: 'GET';
$uri     = getenv('TR_URI')    ?: '/';
$auth    = getenv('TR_AUTH')   ?: '';
$bodyRaw = getenv('TR_BODY')   ?: '';

$_SERVER = array_merge($_SERVER, [
    'REQUEST_METHOD'  => $method,
    'REQUEST_URI'     => $uri,
    'HTTP_HOST'       => 'localhost:8000',
    'SCRIPT_NAME'     => '/index.php',
    'PHP_SELF'        => '/index.php',
    'SERVER_NAME'     => 'localhost',
    'SERVER_PORT'     => '8000',
    'HTTPS'           => '',
    'REMOTE_ADDR'     => '127.0.0.1',
    'DOCUMENT_ROOT'   => __DIR__,
]);

// Authorization header
if ($auth) {
    $_SERVER['HTTP_AUTHORIZATION'] = $auth;
}

// Query string → $_GET
if (str_contains($uri, '?')) {
    [, $qs] = explode('?', $uri, 2);
    parse_str($qs, $_GET);
} else {
    $_GET = [];
}

// Body → $_POST (fallback que usa ResponseHandler::getBody() cuando php://input está vacío)
$_POST   = [];
$_FILES  = [];
$_COOKIE = [];

if ($bodyRaw) {
    // Decodificar el body JSON y poblarlo en $_POST para que
    // ResponseHandler::getBody() lo recoja si php://input está vacío.
    $decoded = json_decode($bodyRaw, true);
    if (is_array($decoded)) {
        $_POST = $decoded;
    }
}

// También escribir a un archivo temporal para que php://input lo lea
// (en CLI, php://input es stdin; al no escribir al pipe ya está vacío aquí,
// así que la ruta de $_POST es la que funciona).

// ── Incluir router principal ────────────────────────────────────────────────
include __DIR__ . '/index.php';
