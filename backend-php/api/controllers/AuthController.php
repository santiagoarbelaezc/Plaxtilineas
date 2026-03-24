<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/TokenHelper.php';
require_once __DIR__ . '/../utils/Logger.php';

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
        try {
            $body     = ResponseHandler::getBody();
            $correo   = ResponseHandler::sanitize($body['correo'] ?? '');
            $password = $body['password'] ?? '';

            if (!$correo || !$password) {
                throw new InvalidArgumentException('Correo y contraseña son obligatorios');
            }

            $db   = Database::getConnection();
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

        } catch (PDOException $e) {
            Logger::error('AuthController::login – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al autenticar en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::login – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en AuthController::login', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    /**
     * GET /api/auth/perfil (protegido)
     * Devuelve el perfil del usuario autenticado
     */
    public static function perfil(array $user): void
    {
        try {
            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ? LIMIT 1');
            $stmt->execute([$user['id']]);
            $usuario = $stmt->fetch();

            if (!$usuario) {
                ResponseHandler::error('Usuario no encontrado', 404);
            }

            ResponseHandler::success($usuario);

        } catch (PDOException $e) {
            Logger::error('AuthController::perfil – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener perfil de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('AuthController::perfil – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en AuthController::perfil', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }
}
