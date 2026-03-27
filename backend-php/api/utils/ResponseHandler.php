<?php
require_once __DIR__ . '/../config/config.php';

/**
 * ResponseHandler – Respuestas JSON estandarizadas + Headers CORS
 */
class ResponseHandler
{
    /**
     * Enviar headers CORS para Hostinger.
     * Llamar ANTES de cualquier output.
     */
    public static function setCorsHeaders(): void
    {
        $allowed = [
            'https://plaxtilineas.com',
            'https://www.plaxtilineas.com',
            'http://localhost:4200',
            'http://127.0.0.1:4200'
        ];

        // Si FRONTEND_URL del .env no está en la lista, agregarla dinámicamente
        if (defined('FRONTEND_URL') && !in_array(FRONTEND_URL, $allowed, true)) {
            $allowed[] = FRONTEND_URL;
        }

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        } elseif (empty($origin)) {
            header('Access-Control-Allow-Origin: https://www.plaxtilineas.com');
        }

        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');
        header('Content-Type: application/json; charset=utf-8');

        // Pre-flight OPTIONS
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }

    /**
     * Respuesta exitosa
     */
    public static function success(mixed $data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Respuesta de error
     */
    public static function error(string $message, int $code = 400, array $extra = []): void
    {
        http_response_code($code);
        $body = array_merge(['error' => $message], $extra);
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Obtener el body JSON del request (equivalente a req.body en Express)
     */
    public static function getBody(): array
    {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }
        // Fallback a $_POST (multipart/form-data)
        return $_POST;
    }

    /**
     * Sanear string de entrada
     */
    public static function sanitize(?string $value): string
    {
        if ($value === null) return '';
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Obtener un parámetro de query string sanado
     */
    public static function query(string $key, mixed $default = null): mixed
    {
        return isset($_GET[$key]) ? self::sanitize($_GET[$key]) : $default;
    }

    /**
     * Obtener parámetro de ruta (set externamente por el router)
     */
    public static function param(string $key): ?string
    {
        return $_REQUEST['_params'][$key] ?? null;
    }
}
