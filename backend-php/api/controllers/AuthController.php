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
    private static function verifyRecaptcha(string $token): bool
    {
        if (empty($token)) return false;
        
        $secret = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Clave secreta de prueba
        $url = 'https://www.google.com/recaptcha/api/siteverify';
        
        $data = [
            'secret' => $secret,
            'response' => $token
        ];
        
        $options = [
            'http' => [
                'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                'method'  => 'POST',
                'content' => http_build_query($data)
            ]
        ];
        
        $context  = stream_context_create($options);
        $result = @file_get_contents($url, false, $context);
        if ($result === FALSE) return false;
        
        $response = json_decode($result, true);
        return isset($response['success']) && $response['success'] === true;
    }

    /**
     * POST /api/auth/login
     * Body: { correo, password, recaptcha_token }
     */
    public static function login(): void
    {
        try {
            $body     = ResponseHandler::getBody();
            $correo   = ResponseHandler::sanitize($body['correo'] ?? '');
            $password = $body['password'] ?? '';
            $recaptchaToken = $body['recaptcha_token'] ?? '';

            if (!$correo || !$password) {
                throw new InvalidArgumentException('Correo y contraseña son obligatorios');
            }

            if (!self::verifyRecaptcha($recaptchaToken)) {
                throw new InvalidArgumentException('Validación reCAPTCHA fallida. Por favor, recarga la página e intenta de nuevo.');
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

            if ($usuario['google_id'] === null && (int)$usuario['email_verificado'] === 0) {
                ResponseHandler::error('Debes confirmar tu correo electrónico antes de iniciar sesión. Por favor, revisa tu bandeja de entrada.', 403);
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
                    'telefono' => $usuario['telefono'] ?? '',
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
        $stmt = $db->prepare('SELECT id, nombre, apellidos, correo, edad, direccion, ciudad, telefono, rol FROM usuarios WHERE id = ? LIMIT 1');
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

    /**
     * POST /api/auth/register
     * Body: { nombre, apellidos, edad, direccion, ciudad, correo, password, rol (opcional, default 'cliente'), recaptcha_token }
     */
    public static function register(): void
    {
        try {
            $body = ResponseHandler::getBody();
            $rol = $body['rol'] ?? 'cliente';
            
            $nombre = ResponseHandler::sanitize($body['nombre'] ?? '');
            $correo = ResponseHandler::sanitize($body['correo'] ?? '');
            $password = $body['password'] ?? '';
            $recaptchaToken = $body['recaptcha_token'] ?? '';
            
            if (!$nombre || !$correo || !$password) {
                throw new InvalidArgumentException('Nombre, correo y contraseña son obligatorios.');
            }

            if (!self::verifyRecaptcha($recaptchaToken)) {
                throw new InvalidArgumentException('Validación reCAPTCHA fallida. Por favor, recarga la página e intenta de nuevo.');
            }

            $apellidos = null;
            $edad = null;
            $direccion = null;
            $ciudad = null;
            $telefono = null;

            if ($rol === 'cliente') {
                $apellidos = ResponseHandler::sanitize($body['apellidos'] ?? '');
                $edad = filter_var($body['edad'] ?? null, FILTER_VALIDATE_INT);
                $direccion = ResponseHandler::sanitize($body['direccion'] ?? '');
                $ciudad = ResponseHandler::sanitize($body['ciudad'] ?? '');
                $telefono = ResponseHandler::sanitize($body['telefono'] ?? '');
                
                if (!$apellidos || !$edad || !$direccion || !$ciudad || !$telefono) {
                    throw new InvalidArgumentException('Para el registro de clientes, todos los datos del perfil (apellidos, edad, dirección, ciudad, teléfono) son obligatorios.');
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

            // Generar código de verificación de 6 dígitos
            $tokenVerificacion = strval(rand(100000, 999999));
            $tokenExpiraEn = date('Y-m-d H:i:s', strtotime('+24 hours'));

            // Insertar
            $stmtInsert = $db->prepare('
                INSERT INTO usuarios (nombre, apellidos, edad, direccion, ciudad, telefono, correo, password, rol, email_verificado, token_verificacion, token_expira_en) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            ');
            $stmtInsert->execute([$nombre, $apellidos, $edad, $direccion, $ciudad, $telefono, $correo, $hash, $rol, $tokenVerificacion, $tokenExpiraEn]);
            $userId = $db->lastInsertId();

            // Enviar email de verificación con el código
            try {
                require_once __DIR__ . '/../utils/EmailService.php';
                $emailResult = EmailService::enviarConfirmacionEmail($correo, $nombre, $tokenVerificacion);
                if (!$emailResult['success']) {
                    Logger::error('AuthController::register – Error enviando correo de verificación', [
                        'correo' => $correo,
                        'error' => $emailResult['error'] ?? 'desconocido'
                    ]);
                }
            } catch (Throwable $mailEx) {
                Logger::error('AuthController::register – Excepción enviando correo', [
                    'correo' => $correo,
                    'exception' => $mailEx->getMessage()
                ]);
            }

            $tokenJwt = TokenHelper::encode([
                'id'     => $userId,
                'correo' => $correo,
                'rol'    => $rol,
            ]);

            ResponseHandler::success([
                'mensaje' => 'Registro exitoso. Se ha enviado un código de confirmación a tu correo.',
                'token'   => $tokenJwt,
                'usuario' => [
                    'id'     => $userId,
                    'correo' => $correo,
                    'nombre' => $nombre,
                    'telefono' => $telefono,
                    'rol'    => $rol,
                ],
                'pendiente_verificacion' => true
            ], 201);

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
                // Actualizar google_id y marcar como verificado
                $update = $db->prepare('UPDATE usuarios SET google_id = ?, email_verificado = 1 WHERE id = ?');
                $update->execute([$googleId, $usuario['id']]);
                
                $userId = $usuario['id'];
                $rol = $usuario['rol'];
            } else {
                // Registrar silenciosamente como cliente
                $insert = $db->prepare('
                    INSERT INTO usuarios (nombre, apellidos, correo, google_id, rol, email_verificado) 
                    VALUES (?, ?, ?, ?, ?, 1)
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
                    'telefono' => $usuario['telefono'] ?? '',
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

    /**
     * GET /api/auth/verificar-email
     * Query: ?token=TOKEN
     */
    public static function verificarEmail(): void
    {
        try {
            $token = ResponseHandler::sanitize($_GET['token'] ?? $_GET['codigo'] ?? '');

            if (!$token) {
                throw new InvalidArgumentException('El código de verificación es obligatorio');
            }

            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT * FROM usuarios WHERE token_verificacion = ? LIMIT 1');
            $stmt->execute([$token]);
            $usuario = $stmt->fetch();

            if (!$usuario) {
                ResponseHandler::error('El código de verificación es inválido o ya fue utilizado.', 400);
            }

            // Validar expiración del token
            $expiraEn = $usuario['token_expira_en'];
            if ($expiraEn && strtotime($expiraEn) < time()) {
                ResponseHandler::error('El código de verificación ha expirado. Por favor, regístrate de nuevo.', 400);
            }

            // Marcar como verificado y vaciar token
            $update = $db->prepare('
                UPDATE usuarios 
                SET email_verificado = 1, token_verificacion = NULL, token_expira_en = NULL 
                WHERE id = ?
            ');
            $update->execute([$usuario['id']]);

            // Generar token JWT para iniciar sesión automáticamente tras verificar
            $tokenJwt = TokenHelper::encode([
                'id'     => $usuario['id'],
                'correo' => $usuario['correo'],
                'rol'    => $usuario['rol'],
            ]);

            ResponseHandler::success([
                'mensaje' => 'Correo verificado exitosamente. Tu cuenta ha sido activada.',
                'token'   => $tokenJwt,
                'usuario' => [
                    'id'     => $usuario['id'],
                    'correo' => $usuario['correo'],
                    'nombre' => $usuario['nombre'] ?? '',
                    'telefono' => $usuario['telefono'] ?? '',
                    'rol'    => $usuario['rol'],
                ],
            ]);

        } catch (PDOException $e) {
            Logger::error('AuthController::verificarEmail - DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error de base de datos al verificar el correo', 500);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::verificarEmail - inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado al verificar el correo', 500);
        }
    }

    /**
     * PUT /api/auth/actualizar (protegido)
     * Body: { nombre, apellidos, edad, direccion, ciudad, telefono }
     */
    public static function actualizarPerfil(array $user): void
    {
        try {
            $body      = ResponseHandler::getBody();
            $nombre    = ResponseHandler::sanitize($body['nombre'] ?? '');
            $apellidos = ResponseHandler::sanitize($body['apellidos'] ?? '');
            $edad      = filter_var($body['edad'] ?? null, FILTER_VALIDATE_INT);
            $direccion = ResponseHandler::sanitize($body['direccion'] ?? '');
            $ciudad    = ResponseHandler::sanitize($body['ciudad'] ?? '');
            $telefono  = ResponseHandler::sanitize($body['telefono'] ?? '');

            if (!$nombre || !$apellidos || $edad === false || $edad === null || !$direccion || !$ciudad || !$telefono) {
                throw new InvalidArgumentException('Todos los campos de perfil (nombre, apellidos, edad, dirección, ciudad, teléfono) son obligatorios.');
            }

            if ($edad < 0 || $edad > 120) {
                throw new InvalidArgumentException('La edad debe estar entre 0 y 120.');
            }

            if (!preg_match('/^[0-9]{7,15}$/', preg_replace('/\s/', '', $telefono))) {
                throw new InvalidArgumentException('El teléfono debe contener entre 7 y 15 dígitos numéricos.');
            }

            $db = Database::getConnection();
            $stmt = $db->prepare('
                UPDATE usuarios 
                SET nombre = ?, apellidos = ?, edad = ?, direccion = ?, ciudad = ?, telefono = ?
                WHERE id = ?
            ');
            $stmt->execute([$nombre, $apellidos, $edad, $direccion, $ciudad, $telefono, $user['id']]);

            // Obtener el perfil actualizado
            $stmtUser = $db->prepare('SELECT id, nombre, apellidos, correo, edad, direccion, ciudad, telefono, rol FROM usuarios WHERE id = ? LIMIT 1');
            $stmtUser->execute([$user['id']]);
            $usuarioActualizado = $stmtUser->fetch();

            ResponseHandler::success([
                'mensaje' => 'Perfil actualizado exitosamente',
                'usuario' => $usuarioActualizado
            ]);

        } catch (PDOException $e) {
            Logger::error('AuthController::actualizarPerfil – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar perfil en base de datos', 500);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::actualizarPerfil – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado al actualizar perfil', 500);
        }
    }

    /**
     * DELETE /api/auth/cuenta (protegido)
     */
    public static function eliminarCuenta(array $user): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare('DELETE FROM usuarios WHERE id = ?');
            $stmt->execute([$user['id']]);

            ResponseHandler::success([
                'mensaje' => 'Cuenta eliminada exitosamente'
            ]);

        } catch (PDOException $e) {
            Logger::error('AuthController::eliminarCuenta – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar la cuenta en la base de datos', 500);
        } catch (Throwable $e) {
            Logger::error('AuthController::eliminarCuenta – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado al eliminar la cuenta', 500);
        }
    }
}
