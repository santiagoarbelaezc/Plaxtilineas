<?php
/**
 * Plaxtilineas – Configuración Central
 *
 * Lee todas las variables desde el archivo .env ubicado en el mismo directorio.
 * NO contiene credenciales hardcodeadas. Agrega .env a tu .gitignore.
 */

// ─── Cargar .env ─────────────────────────────────────────────────────────────
(function () {
    $envFile = __DIR__ . '/../.env';

    if (!file_exists($envFile)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Archivo .env no encontrado. Copia .env.example a .env y completa los valores.']);
        exit;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Ignorar comentarios y líneas vacías
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        // Separar clave=valor (solo en el primer '=')
        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $key   = trim($key);
        $value = trim($value);

        // Remover comillas opcionales
        if (preg_match('/^(["\']).*\1$/', $value)) {
            $value = substr($value, 1, -1);
        }

        if ($key !== '' && !array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
})();

/**
 * Leer una variable de entorno con valor por defecto opcional.
 * Lanza excepción si la variable es requerida y no está definida.
 */
function env(string $key, mixed $default = null): mixed
{
    $value = $_ENV[$key] ?? getenv($key);
    if ($value === false || $value === '') {
        if ($default !== null) return $default;
        if (func_num_args() < 2) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => "Variable de entorno requerida no encontrada: {$key}"]);
            exit;
        }
        return null;
    }
    return $value;
}

// ─── Base de datos principal ──────────────────────────────────────────────────
define('DB_HOST',     env('DB_HOST'));
define('DB_PORT',     env('DB_PORT', '3306'));
define('DB_USER',     env('DB_USER'));
define('DB_PASSWORD', env('DB_PASSWORD'));
define('DB_NAME',     env('DB_NAME'));

// ─── Base de datos catálogo (importación) ─────────────────────────────────────
define('HOSTINGER_DB_HOST',     env('HOSTINGER_DB_HOST'));
define('HOSTINGER_DB_PORT',     env('HOSTINGER_DB_PORT', '3306'));
define('HOSTINGER_DB_USER',     env('HOSTINGER_DB_USER'));
define('HOSTINGER_DB_PASSWORD', env('HOSTINGER_DB_PASSWORD'));
define('HOSTINGER_DB_NAME',     env('HOSTINGER_DB_NAME'));

// ─── Seguridad / Tokens HMAC-SHA256 ──────────────────────────────────────────
define('TOKEN_SECRET',     env('TOKEN_SECRET'));
define('TOKEN_EXPIRATION', (int) env('TOKEN_EXPIRATION', '3600'));

// ─── Cloudinary ───────────────────────────────────────────────────────────────
define('CLOUDINARY_CLOUD_NAME', env('CLOUDINARY_CLOUD_NAME'));
define('CLOUDINARY_API_KEY',    env('CLOUDINARY_API_KEY'));
define('CLOUDINARY_API_SECRET', env('CLOUDINARY_API_SECRET'));
define('CLOUDINARY_UPLOAD_URL', 'https://api.cloudinary.com/v1_1/' . CLOUDINARY_CLOUD_NAME . '/');

// ─── Email SMTP ────────────────────────────────────────────────────────────────
define('SMTP_HOST',       env('SMTP_HOST', 'smtp.gmail.com'));
define('SMTP_PORT',       (int) env('SMTP_PORT', '587'));
define('SMTP_USER',       env('SMTP_USER'));
define('SMTP_PASS',       env('SMTP_PASS'));
define('EMAIL_FROM_NAME', env('EMAIL_FROM_NAME', 'Plaxtilineas SAS'));
define('SUPPORT_EMAIL',   env('SUPPORT_EMAIL', ''));

// ─── Empresa ──────────────────────────────────────────────────────────────────
define('COMPANY_NAME',    env('COMPANY_NAME',    'Plaxtilineas SAS'));
define('COMPANY_PHONE_1', env('COMPANY_PHONE_1', ''));
define('COMPANY_PHONE_2', env('COMPANY_PHONE_2', ''));
define('COMPANY_ADDRESS', env('COMPANY_ADDRESS', ''));

// ─── App ──────────────────────────────────────────────────────────────────────
define('FRONTEND_URL',    env('FRONTEND_URL',  'https://plaxtilineas.com'));
define('UPLOAD_MAX_SIZE', 5242880); // 5 MB
define('APP_ENV',         env('APP_ENV', 'production'));

// ─── Wompi (Pasarela de Pago) ─────────────────────────────────────────────────
define('WOMPI_PUBLIC_KEY',    env('WOMPI_PUBLIC_KEY',    ''));
define('WOMPI_PRIVATE_KEY',   env('WOMPI_PRIVATE_KEY',   ''));
define('WOMPI_INTEGRITY_KEY', env('WOMPI_INTEGRITY_KEY', ''));
define('WOMPI_EVENTS_KEY',    env('WOMPI_EVENTS_KEY',    ''));

// ─── Negocio / Precios ────────────────────────────────────────────────────────
define('COSTO_ENVIO_COP', 10000);   // Tarifa plana de envío en COP
define('IVA_PORCENTAJE',  0.0);    // IVA ya incluido en el precio del producto
