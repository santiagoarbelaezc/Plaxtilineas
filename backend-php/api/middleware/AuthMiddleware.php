<?php
require_once __DIR__ . '/../utils/TokenHelper.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

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
        try {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION']
                       ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
                       ?? null;

            // Fallback: algunos entornos (nginx, CLI) exponen el header diferente
            if (!$authHeader && function_exists('getallheaders')) {
                $allHeaders = getallheaders();
                if (is_array($allHeaders)) {
                    $authHeader = $allHeaders['Authorization']
                               ?? $allHeaders['authorization']
                               ?? null;
                }
            }

            if (!$authHeader) {
                ResponseHandler::error('Token no proporcionado', 401);
            }

            // Formato esperado: "Bearer <token>"
            $parts = explode(' ', $authHeader, 2);
            if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
                ResponseHandler::error('Formato de token inválido. Usa: Bearer <token>', 401);
            }

            $token = trim($parts[1]);

            if (empty($token)) {
                ResponseHandler::error('Formato de token inválido. Usa: Bearer <token>', 401);
            }

            try {
                $payload = TokenHelper::decode($token);
            } catch (RuntimeException $e) {
                $msg = $e->getMessage();
                if (str_contains(strtolower($msg), 'expirado') || str_contains(strtolower($msg), 'expired')) {
                    ResponseHandler::error('Token expirado, inicia sesión nuevamente', 401);
                }
                ResponseHandler::error('Token inválido', 401);
            } catch (Throwable $e) {
                Logger::error('AuthMiddleware::verify – error interno al decodificar token', [
                    'exception' => $e->getMessage(),
                ]);
                ResponseHandler::error('Error al verificar autenticación', 500);
            }

            return $payload;

        } catch (Throwable $e) {
            // Solo llega aquí si el Throwable no fue capturado internamente
            // (ResponseHandler::error() hace exit, así que sería un error muy raro)
            Logger::error('AuthMiddleware::verify – Throwable inesperado', [
                'exception' => $e->getMessage(),
            ]);
            ResponseHandler::error('Error al verificar autenticación', 500);
        }
    }
}
