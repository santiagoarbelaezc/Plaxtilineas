<?php
require_once __DIR__ . '/../utils/TokenHelper.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';

/**
 * AuthMiddleware – Proteger rutas que requieren autenticación
 * Verifica el header: Authorization: Bearer <token>
 */
class AuthMiddleware
{
    /**
     * Verificar token. Si falla, responde JSON y termina la ejecución.
     * Si es válido, devuelve el payload del token (id, correo, rol).
     *
     * @return array  Datos del usuario autenticado
     */
    public static function verify(): array
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION']
                   ?? getallheaders()['Authorization']
                   ?? getallheaders()['authorization']
                   ?? null;

        if (!$authHeader) {
            ResponseHandler::error('Token no proporcionado', 401);
        }

        // Formato esperado: "Bearer <token>"
        $parts = explode(' ', $authHeader, 2);
        if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
            ResponseHandler::error('Formato de token inválido. Usa: Bearer <token>', 401);
        }

        $token = trim($parts[1]);

        try {
            $payload = TokenHelper::decode($token);
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            $code = str_contains($msg, 'expirado') ? 401 : 403;
            ResponseHandler::error('Token inválido: ' . $msg, $code);
        }

        return $payload;
    }
}
