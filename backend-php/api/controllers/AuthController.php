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

    /**
     * POST /api/auth/register
     * Body: { nombre, apellidos, edad, direccion, ciudad, correo, password, rol (opcional, default 'cliente') }
     */
    public static function register(): void
    {
        try {
            $body = ResponseHandler::getBody();
            $rol = $body['rol'] ?? 'cliente';
            
            $nombre = ResponseHandler::sanitize($body['nombre'] ?? '');
            $correo = ResponseHandler::sanitize($body['correo'] ?? '');
            $password = $body['password'] ?? '';
            
            if (!$nombre || !$correo || !$password) {
                throw new InvalidArgumentException('Nombre, correo y contraseña son obligatorios.');
            }

            $apellidos = null;
            $edad = null;
            $direccion = null;
            $ciudad = null;

            if ($rol === 'cliente') {
                $apellidos = ResponseHandler::sanitize($body['apellidos'] ?? '');
                $edad = filter_var($body['edad'] ?? null, FILTER_VALIDATE_INT);
                $direccion = ResponseHandler::sanitize($body['direccion'] ?? '');
                $ciudad = ResponseHandler::sanitize($body['ciudad'] ?? '');
                
                if (!$apellidos || !$edad || !$direccion || !$ciudad) {
                    throw new InvalidArgumentException('Para el registro de clientes, todos los datos del perfil (apellidos, edad, dirección, ciudad) son obligatorios.');
                }
            }

            $db = Database::getConnection();
            
            // Verificación de duplicados
            $stmt = $db->prepare('SELECT id FROM usuarios WHERE correo = ? LIMIT 1');
            $stmt->execute([$correo]);
            if ($stmt->fetch()) {
                ResponseHandler::error('El correo electrónico ya está registrado', 409);
            }

            // Cifrado de contraseña
            $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

            // Insertar
            $stmtInsert = $db->prepare('
                INSERT INTO usuarios (nombre, apellidos, edad, direccion, ciudad, correo, password, rol) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmtInsert->execute([$nombre, $apellidos, $edad, $direccion, $ciudad, $correo, $hash, $rol]);
            $userId = $db->lastInsertId();

            // Auto-login para clientes
            if ($rol === 'cliente') {
                $token = TokenHelper::encode([
                    'id' => $userId,
                    'correo' => $correo,
                    'rol' => $rol
                ]);

                ResponseHandler::success([
                    'mensaje' => 'Registro y login exitosos',
                    'token' => $token,
                    'usuario' => [
                        'id' => $userId,
                        'correo' => $correo,
                        'nombre' => $nombre,
                        'rol' => $rol
                    ]
                ], 201);
            } else {
                ResponseHandler::success(['mensaje' => 'Usuario registrado exitosamente'], 201);
            }

        } catch (PDOException $e) {
            Logger::error('AuthController::register - DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al registrar usuario en la base de datos', 500);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::register - inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en el registro', 500);
        }
    }

    /**
     * POST /api/auth/google
     * Body: { credential }
     */
    public static function googleLogin(): void
    {
        try {
            $body = ResponseHandler::getBody();
            $credential = $body['credential'] ?? '';
            
            if (!$credential) {
                throw new InvalidArgumentException('El token de Google es obligatorio');
            }

            // Verificar token con Google API
            $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
            $response = @file_get_contents($url);
            
            if ($response === false) {
                throw new InvalidArgumentException('Token de Google inválido o expirado');
            }
            
            $payload = json_decode($response, true);
            if (!isset($payload['email'])) {
                throw new InvalidArgumentException('No se pudo obtener el correo desde Google');
            }

            $googleId = $payload['sub'];
            $correo = $payload['email'];
            $nombre = $payload['given_name'] ?? $payload['name'] ?? 'Usuario';
            $apellidos = $payload['family_name'] ?? '';
            $rol = 'cliente';

            $db = Database::getConnection();
            
            // Buscar si ya existe el correo
            $stmt = $db->prepare('SELECT * FROM usuarios WHERE correo = ? LIMIT 1');
            $stmt->execute([$correo]);
            $usuario = $stmt->fetch();

            if ($usuario) {
                // Actualizar google_id si es null
                if (!$usuario['google_id']) {
                    $update = $db->prepare('UPDATE usuarios SET google_id = ? WHERE id = ?');
                    $update->execute([$googleId, $usuario['id']]);
                }
                
                $userId = $usuario['id'];
                $rol = $usuario['rol'];
            } else {
                // Registrar silenciosamente como cliente
                $insert = $db->prepare('
                    INSERT INTO usuarios (nombre, apellidos, correo, google_id, rol) 
                    VALUES (?, ?, ?, ?, ?)
                ');
                $insert->execute([$nombre, $apellidos, $correo, $googleId, $rol]);
                $userId = $db->lastInsertId();
            }

            $token = TokenHelper::encode([
                'id' => $userId,
                'correo' => $correo,
                'rol' => $rol
            ]);

            ResponseHandler::success([
                'mensaje' => 'Login con Google exitoso',
                'token' => $token,
                'usuario' => [
                    'id' => $userId,
                    'correo' => $correo,
                    'nombre' => $nombre,
                    'rol' => $rol
                ]
            ]);

        } catch (PDOException $e) {
            Logger::error('AuthController::googleLogin - DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error de base de datos en login de Google', 500);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::googleLogin - inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en login de Google', 500);
        }
    }
}
