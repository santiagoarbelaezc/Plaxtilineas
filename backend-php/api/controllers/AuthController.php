<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/TokenHelper.php';

/**
 * AuthController – Login de usuarios
 */
class AuthController
{
    /**
     * POST /api/auth/login
     * Body: { correo, password }
     */
    public static function login(): void
    {
        $body  = ResponseHandler::getBody();
        $correo   = ResponseHandler::sanitize($body['correo'] ?? '');
        $password = $body['password'] ?? '';

        if (!$correo || !$password) {
            ResponseHandler::error('Correo y contraseña son obligatorios', 400);
        }

        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM usuarios WHERE correo = ? LIMIT 1');
        $stmt->execute([$correo]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            ResponseHandler::error('Usuario no encontrado', 401);
        }

        if (!password_verify($password, $usuario['password'])) {
            ResponseHandler::error('Contraseña incorrecta', 401);
        }

        $token = TokenHelper::encode([
            'id'     => $usuario['id'],
            'correo' => $usuario['correo'],
            'rol'    => $usuario['rol'],
        ]);

        ResponseHandler::success([
            'mensaje' => 'Login exitoso',
            'token'   => $token,
            'usuario' => [
                'id'     => $usuario['id'],
                'correo' => $usuario['correo'],
                'nombre' => $usuario['nombre'] ?? '',
                'rol'    => $usuario['rol'],
            ],
        ]);
    }

    /**
     * GET /api/auth/perfil (protegido)
     * Devuelve el perfil del usuario autenticado
     */
    public static function perfil(array $user): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ? LIMIT 1');
        $stmt->execute([$user['id']]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            ResponseHandler::error('Usuario no encontrado', 404);
        }

        ResponseHandler::success($usuario);
    }
}
