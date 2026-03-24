<?php
/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║   Plaxtilineas API – Suite de Pruebas Funcionales         ║
 * ║   Solo accesible en APP_ENV === 'development'             ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Acceso: GET /api/test_api.php
 */

require_once __DIR__ . '/config/config.php';

// ── Bloquear en producción ────────────────────────────────────────────────────
if (!defined('APP_ENV') || APP_ENV !== 'development') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Acceso denegado. Solo disponible en entorno development.']);
    exit;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ejecutar una petición a la API usando un subproceso PHP.
 * Evita el deadlock del servidor monohilo (php -S).
 *
 * El cuerpo de la petición se pasa por stdin (php://input en CLI).
 * El HTTP status code se recibe por stderr (emitido por _test_runner.php en shutdown).
 * La respuesta JSON llega por stdout.
 */
function apiRequest(string $url, string $method = 'GET', ?array $body = null, array $headers = []): array
{
    $start  = microtime(true);
    $parsed = parse_url($url);
    $path   = $parsed['path'] ?? '/';
    $query  = $parsed['query'] ?? '';
    $uri    = $path . ($query ? "?$query" : '');

    // Extraer Authorization si viene en $headers
    $authValue = '';
    foreach ($headers as $h) {
        if (stripos($h, 'Authorization:') === 0) {
            $authValue = trim(substr($h, strlen('Authorization:')));
            break;
        }
    }

    // Variables de entorno para _test_runner.php
    $env = array_merge(getenv() ?: [], [
        'TR_METHOD' => $method,
        'TR_URI'    => $uri,
        'TR_AUTH'   => $authValue,
        'TR_BODY'   => $body !== null ? json_encode($body) : '',
    ]);

    $runnerPath  = __DIR__ . '/_test_runner.php';
    $descriptors = [
        0 => ['pipe', 'r'],  // stdin  (no se usa; body llega por TR_BODY env var)
        1 => ['pipe', 'w'],  // stdout → response JSON
        2 => ['pipe', 'w'],  // stderr → HTTP status code
    ];

    $proc = proc_open([PHP_BINARY, $runnerPath], $descriptors, $pipes, __DIR__, $env);

    if (!is_resource($proc)) {
        return ['status' => 0, 'body' => 'proc_open fallido', 'elapsed' => 0];
    }

    fclose($pipes[0]); // cerrar stdin inmediatamente (no se necesita)

    $responseBody = stream_get_contents($pipes[1]);
    $statusLine   = trim(stream_get_contents($pipes[2]));
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);

    $elapsed    = round((microtime(true) - $start) * 1000, 1);
    $statusCode = (int)($statusLine ?: 0);

    return ['status' => $statusCode, 'body' => $responseBody, 'elapsed' => $elapsed];
}

function runTest(string $name, string $url, string $method, int $expectedStatus, ?array $body = null, array $headers = []): array
{
    $result = apiRequest($url, $method, $body, $headers);
    $passed = $result['status'] === $expectedStatus;

    return [
        'name'     => $name,
        'url'      => $url,
        'method'   => $method,
        'expected' => $expectedStatus,
        'got'      => $result['status'],
        'elapsed'  => $result['elapsed'],
        'passed'   => $passed,
    ];
}

// ── Configuración ─────────────────────────────────────────────────────────────
$scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host    = $_SERVER['HTTP_HOST'] ?? 'localhost';

// Detectar base URL dinámicamente:
// Si entramos por /api/test_api.php, el base es /api
// Si corremos php -S dentro de api/, el base es /
$scriptPath = $_SERVER['SCRIPT_NAME']; // e.g. /api/test_api.php o /test_api.php
$baseDir    = str_replace('\\', '/', dirname($scriptPath));
if ($baseDir === '/') $baseDir = '';

$baseUrl = $scheme . '://' . $host . $baseDir;

// Si por alguna razón terminamos en la raíz y no hay prefijo /api, 
// lo añadimos a menos que estemos corriendo el servidor localmente en la carpeta api directamente.
if ($baseDir === '' && !str_contains($_SERVER['REQUEST_URI'], 'test_api.php')) {
    $baseUrl .= '/api';
}

// Credenciales de prueba — ajusta en .env con TEST_EMAIL y TEST_PASSWORD
// Formato .env: TEST_EMAIL=correo@plaxtilineas.com  TEST_PASSWORD=tupassword
$testEmail    = defined('TEST_EMAIL')    ? TEST_EMAIL    : env('TEST_EMAIL',    '');
$testPassword = defined('TEST_PASSWORD') ? TEST_PASSWORD : env('TEST_PASSWORD', '');

// ── Ejecutar pruebas ──────────────────────────────────────────────────────────
$startTotal = microtime(true);
$results    = [];
$token      = null;

// 1. Health Check
$results[] = runTest(
    'Health check GET /api/',
    "$baseUrl/", 'GET', 200
);

// 2. Login con credenciales correctas
$loginResult = apiRequest("$baseUrl/auth/login", 'POST', [
    'correo'   => $testEmail,
    'password' => $testPassword,
]);
$loginPassed = $loginResult['status'] === 200;
if ($loginPassed) {
    $decoded = json_decode($loginResult['body'], true);
    $token   = $decoded['token'] ?? null;
}
$results[] = [
    'name'     => 'Login con credenciales correctas POST /api/auth/login',
    'url'      => "$baseUrl/auth/login",
    'method'   => 'POST',
    'expected' => 200,
    'got'      => $loginResult['status'],
    'elapsed'  => $loginResult['elapsed'],
    'passed'   => $loginPassed,
];

// 3. Login con credenciales incorrectas
$results[] = runTest(
    'Login credenciales incorrectas → 401',
    "$baseUrl/auth/login", 'POST', 401,
    ['correo' => 'nadie@nada.com', 'password' => 'wrong']
);

// 4. Ruta protegida sin token → 401
$results[] = runTest(
    'GET /api/auth/perfil sin token → 401',
    "$baseUrl/auth/perfil", 'GET', 401
);

// 5. Ruta protegida con token válido → 200
if ($token) {
    $results[] = runTest(
        'GET /api/auth/perfil con token válido → 200',
        "$baseUrl/auth/perfil", 'GET', 200, null,
        ["Authorization: Bearer $token"]
    );
} else {
    $results[] = [
        'name' => 'GET /api/auth/perfil con token válido → 200',
        'url'  => "$baseUrl/auth/perfil",
        'method' => 'GET',
        'expected' => 200,
        'got'    => 0,
        'elapsed' => 0,
        'passed' => false,
        'note'   => 'Omitido: no hay token (login falló)',
    ];
}

// 6. GET productos
$results[] = runTest(
    'GET /api/productos → 200',
    "$baseUrl/productos", 'GET', 200
);

// 7. GET producto por ID inexistente → 404
$results[] = runTest(
    'GET /api/productos/99999999 (inexistente) → 404',
    "$baseUrl/productos/99999999", 'GET', 404
);

// 8. GET categorias
$results[] = runTest(
    'GET /api/categorias → 200',
    "$baseUrl/categorias", 'GET', 200
);

// 9. GET subcategorias
$results[] = runTest(
    'GET /api/subcategorias → 200',
    "$baseUrl/subcategorias", 'GET', 200
);

// 10. POST pqrs con body válido → 201
$results[] = runTest(
    'POST /api/pqrs con body válido → 201',
    "$baseUrl/pqrs", 'POST', 201,
    [
        'tipo'             => 'PETICION',
        'nombre_completo'  => 'Test Suite',
        'email'            => 'test@test.com',
        'telefono'         => '3001234567',
        'descripcion'      => 'Prueba automática del test suite de la API',
    ]
);

// 11. POST pqrs con body vacío → 400
$results[] = runTest(
    'POST /api/pqrs con body vacío → 400',
    "$baseUrl/pqrs", 'POST', 400, []
);

// 12. Endpoint inexistente → 404
$results[] = runTest(
    'GET /api/ruta-inexistente → 404',
    "$baseUrl/ruta-inexistente", 'GET', 404
);

// ── Calcular totales ──────────────────────────────────────────────────────────
$totalElapsed = round((microtime(true) - $startTotal) * 1000, 1);
$passed       = count(array_filter($results, fn($r) => $r['passed']));
$total        = count($results);
$allPassed    = $passed === $total;

// ── Renderizar HTML ───────────────────────────────────────────────────────────
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plaxtilineas API – Test Suite</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
    }
    h1 { font-size: 1.7rem; margin-bottom: 0.3rem; color: #fff; }
    .subtitle { color: #718096; font-size: .9rem; margin-bottom: 2rem; }
    .summary {
      display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;
    }
    .badge {
      padding: .5rem 1.2rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: .9rem;
    }
    .badge-pass { background: #1a4731; color: #68d391; border: 1px solid #276749; }
    .badge-fail { background: #4a1122; color: #fc8181; border: 1px solid #702138; }
    .badge-info { background: #1a2840; color: #63b3ed; border: 1px solid #2a4a7f; }
    table {
      width: 100%; border-collapse: collapse;
      background: #1a1e2e; border-radius: 12px;
      overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.4);
    }
    th {
      background: #242840; color: #a0aec0;
      text-align: left; padding: .75rem 1rem;
      font-size: .8rem; text-transform: uppercase; letter-spacing: .05em;
      border-bottom: 1px solid #2d3748;
    }
    td { padding: .75rem 1rem; border-bottom: 1px solid #2d3748; font-size: .88rem; }
    tr:last-child td { border-bottom: none; }
    tr.pass td:first-child { border-left: 3px solid #48bb78; }
    tr.fail td:first-child { border-left: 3px solid #fc8181; }
    .tag {
      display: inline-block; padding: .15rem .5rem;
      border-radius: 4px; font-size: .75rem; font-weight: 600;
    }
    .tag-pass { background: #1a4731; color: #68d391; }
    .tag-fail { background: #4a1122; color: #fc8181; }
    .tag-method { background: #1a2840; color: #63b3ed; font-family: monospace; }
    .url { font-family: monospace; color: #b794f4; font-size: .83rem; }
    .elapsed { color: #718096; font-size: .82rem; }
    .total-row td { font-weight: 700; background: #242840; }
  </style>
</head>
<body>
  <h1>🧪 Plaxtilineas API – Test Suite</h1>
  <p class="subtitle">Entorno: <strong>development</strong> · Base URL: <code><?= htmlspecialchars($baseUrl) ?></code></p>

  <div class="summary">
    <span class="badge <?= $allPassed ? 'badge-pass' : 'badge-fail' ?>">
      <?= $passed ?>/<?= $total ?> pruebas pasadas
    </span>
    <span class="badge badge-info">⏱ <?= $totalElapsed ?>ms total</span>
    <span class="badge badge-info">📅 <?= date('Y-m-d H:i:s') ?></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Prueba</th>
        <th>Método</th>
        <th>URL</th>
        <th>Esperado</th>
        <th>Recibido</th>
        <th>Tiempo</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($results as $i => $r): ?>
      <tr class="<?= $r['passed'] ? 'pass' : 'fail' ?>">
        <td><?= $i + 1 ?></td>
        <td><?= htmlspecialchars($r['name']) ?><?= isset($r['note']) ? '<br><small style="color:#718096">' . htmlspecialchars($r['note']) . '</small>' : '' ?></td>
        <td><span class="tag tag-method"><?= $r['method'] ?></span></td>
        <td class="url"><?= htmlspecialchars(str_replace($baseUrl, '', $r['url'])) ?></td>
        <td><?= $r['expected'] ?></td>
        <td style="color: <?= $r['passed'] ? '#68d391' : '#fc8181' ?>"><?= $r['got'] ?></td>
        <td class="elapsed"><?= $r['elapsed'] ?>ms</td>
        <td><span class="tag <?= $r['passed'] ? 'tag-pass' : 'tag-fail' ?>"><?= $r['passed'] ? '✅ PASS' : '❌ FAIL' ?></span></td>
      </tr>
      <?php endforeach; ?>
      <tr class="total-row">
        <td colspan="6" style="text-align:right">Total</td>
        <td><?= $totalElapsed ?>ms</td>
        <td><span class="tag <?= $allPassed ? 'tag-pass' : 'tag-fail' ?>"><?= $passed ?>/<?= $total ?></span></td>
      </tr>
    </tbody>
  </table>
</body>
</html>
