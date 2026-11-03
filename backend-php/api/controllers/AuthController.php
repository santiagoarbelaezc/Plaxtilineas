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
     * Garantiza que la tabla de captchas exista en la base de datos
     */
    private static function ensureCaptchasTable(): void
    {
        try {
            $db = Database::getConnection();
            $db->exec("
                CREATE TABLE IF NOT EXISTS `captchas` (
                  `id` VARCHAR(64) PRIMARY KEY,
                  `codigo` VARCHAR(255) NOT NULL,
                  `expires_at` DATETIME NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (Throwable $e) {
            Logger::error('AuthController::ensureCaptchasTable', ['exception' => $e->getMessage()]);
        }
    }

    /**
     * Genera la imagen SVG vectorial con patrón de malla y texto distorsionado de alta seguridad
     */
    private static function generateCaptcha(): array
    {
        $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $text = '';
        $len = strlen($characters);
        for ($i = 0; $i < 5; $i++) {
            $text .= $characters[random_int(0, $len - 1)];
        }
        $width = 150;
        $height = 48;
        
        $svg  = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $width . '" height="' . $height . '" viewBox="0 0 ' . $width . ' ' . $height . '" style="border-radius: 50px; font-family: \'Montserrat\', sans-serif;">';
        $svg .= '<defs>';
        $svg .= '<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">';
        $svg .= '<stop offset="0%" stop-color="#0a0e17"/>';
        $svg .= '<stop offset="100%" stop-color="#141a28"/>';
        $svg .= '</linearGradient>';
        $svg .= '<pattern id="meshGrid" width="10" height="10" patternUnits="userSpaceOnUse">';
        $svg .= '<path d="M 10 0 L 0 0 0 10" fill="none" stroke="#2a3346" stroke-width="0.75" opacity="0.4"/>';
        $svg .= '</pattern>';
        $svg .= '</defs>';
        
        // Fondo degradado monocromático
        $svg .= '<rect width="100%" height="100%" fill="url(#bgGrad)" rx="12" />';
        // Malla temática de fondo
        $svg .= '<rect width="100%" height="100%" fill="url(#meshGrid)" rx="12" />';
        
        // Líneas de ruido vectorial monocromáticas (blanco y grises)
        $colors = ['#ffffff', '#94a3b8', '#64748b', '#cbd5e1'];
        for ($i = 0; $i < 5; $i++) {
            $x1 = random_int(0, $width);
            $y1 = random_int(0, $height);
            $x2 = random_int(0, $width);
            $y2 = random_int(0, $height);
            $stroke = $colors[$i % count($colors)];
            $svg .= '<line x1="' . $x1 . '" y1="' . $y1 . '" x2="' . $x2 . '" y2="' . $y2 . '" stroke="' . $stroke . '" stroke-width="1.2" opacity="0.3"/>';
        }
        
        // Caracteres distorsionados y estilizados en escala de grises y blancos de alto contraste
        $textColors = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#f1f5f9'];
        $fonts = ['Montserrat', 'Impact', 'Trebuchet MS', 'Arial Black', 'Verdana'];
        for ($i = 0; $i < strlen($text); $i++) {
            $char = $text[$i];
            $fontSize = 25 + random_int(0, 5);
            $angle = -14 + random_int(0, 28);
            $x = 18 + $i * 27 + random_int(0, 3);
            $y = 34 + random_int(0, 4);
            $font = $fonts[random_int(0, count($fonts) - 1)];
            $color = $textColors[$i % count($textColors)];
            
            $svg .= '<text x="' . $x . '" y="' . $y . '" font-family="' . $font . '" font-size="' . $fontSize . '" font-weight="900" fill="' . $color . '" transform="rotate(' . $angle . ', ' . $x . ', ' . $y . ')" opacity="0.95" letter-spacing="1">' . htmlspecialchars($char, ENT_QUOTES, 'UTF-8') . '</text>';
        }
        
        // Puntos de dispersión monocromáticos
        for ($i = 0; $i < 30; $i++) {
            $cx = random_int(0, $width);
            $cy = random_int(0, $height);
            $dotColor = $colors[random_int(0, count($colors) - 1)];
            $svg .= '<circle cx="' . $cx . '" cy="' . $cy . '" r="1" fill="' . $dotColor . '" opacity="0.4"/>';
        }
        
        $svg .= '</svg>';
        return ['text' => $text, 'svg' => $svg];
    }

    /**
     * GET /api/auth/captcha
     * Retorna { id: string, svg: string }
     */
    public static function getCaptcha(): void
    {
        try {
            self::ensureCaptchasTable();
            $db = Database::getConnection();

            // Limpia captchas vencidos
            $db->exec('DELETE FROM captchas WHERE expires_at < NOW()');

            $captchaData = self::generateCaptcha();
            $text = $captchaData['text'];
            $svg = $captchaData['svg'];
            $captchaId = bin2hex(random_bytes(16));
            $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutos de validez
            $hashedCode = password_hash(strtolower(trim($text)), PASSWORD_BCRYPT);

            $stmt = $db->prepare('INSERT INTO captchas (id, codigo, expires_at) VALUES (?, ?, ?)');
            $stmt->execute([$captchaId, $hashedCode, $expiresAt]);

            ResponseHandler::success([
                'id' => $captchaId,
                'svg' => $svg
            ]);
        } catch (Throwable $e) {
            Logger::error('AuthController::getCaptcha – error', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al generar el captcha', 500);
        }
    }

    /**
     * Valida y consume de uso único el captcha especificado
     */
    public static function verifyCaptcha(?string $captchaId, ?string $captchaCode): bool
    {
        if (empty($captchaId) || empty($captchaCode)) {
            return false;
        }

        try {
            self::ensureCaptchasTable();
            $db = Database::getConnection();

            // 1. Limpia vencidos
            $db->exec('DELETE FROM captchas WHERE expires_at < NOW()');

            // 2. Busca registro del captcha
            $stmt = $db->prepare('SELECT * FROM captchas WHERE id = ?');
            $stmt->execute([$captchaId]);
            $captchaRecord = $stmt->fetch();

            if (!$captchaRecord) {
                return false;
            }

            // 3. Elimina inmediatamente para uso único (one-time use)
            $stmtDel = $db->prepare('DELETE FROM captchas WHERE id = ?');
            $stmtDel->execute([$captchaId]);

            // 4. Verifica coincidencia del texto (insensible a mayúsculas)
            return password_verify(strtolower(trim($captchaCode)), $captchaRecord['codigo']);
        } catch (Throwable $e) {
            Logger::error('AuthController::verifyCaptcha – error', ['exception' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * POST /api/auth/login
     * Body: { correo, password, captchaId, captchaCode }
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
                'requiere_cambio_password' => (bool)($usuario['requiere_cambio_password'] ?? 0),
                'usuario' => [
                    'id'     => $usuario['id'],
                    'correo' => $usuario['correo'],
                    'nombre' => $usuario['nombre'] ?? '',
                    'telefono' => $usuario['telefono'] ?? '',
                    'rol'    => $usuario['rol'],
                    'requiere_cambio_password' => (bool)($usuario['requiere_cambio_password'] ?? 0),
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
     * Garantiza la presencia de la columna requiere_cambio_password en usuarios
     */
    private static function ensureRequiereCambioPasswordColumn(): void
    {
        try {
            $db = Database::getConnection();
            $db->exec("ALTER TABLE `usuarios` ADD COLUMN `requiere_cambio_password` TINYINT(1) NOT NULL DEFAULT 0;");
        } catch (Throwable $e) {
            // Ignorar si la columna ya existe
        }
    }

    /**
     * POST /api/auth/recuperar-password
     * Genera y envía una clave temporal al correo del usuario
     */
    public static function recuperarPassword(): void
    {
        try {
            self::ensureRequiereCambioPasswordColumn();
            $body = ResponseHandler::getBody();
            $correo = ResponseHandler::sanitize($body['correo'] ?? '');
            $captchaId   = $body['captcha_id'] ?? $body['captchaId'] ?? null;
            $captchaCode = $body['captcha_code'] ?? $body['captchaCode'] ?? null;

            if (empty($correo)) {
                throw new InvalidArgumentException('El correo electrónico es obligatorio.');
            }

            if (!self::verifyCaptcha($captchaId, $captchaCode)) {
                throw new InvalidArgumentException('El código de seguridad es incorrecto o ha expirado.');
            }

            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT id, nombre, apellidos, correo FROM usuarios WHERE correo = ? LIMIT 1');
            $stmt->execute([$correo]);
            $usuario = $stmt->fetch();

            if (!$usuario) {
                ResponseHandler::error('No existe ninguna cuenta registrada con este correo electrónico.', 404);
            }

            // Generar clave temporal única de 8 caracteres
            $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            $tempPassword = 'Plx-';
            for ($i = 0; $i < 5; $i++) {
                $tempPassword .= $chars[random_int(0, strlen($chars) - 1)];
            }

            $hashedTemp = password_hash($tempPassword, PASSWORD_BCRYPT);
            $stmtUpd = $db->prepare('UPDATE usuarios SET password = ?, requiere_cambio_password = 1 WHERE id = ?');
            $stmtUpd->execute([$hashedTemp, $usuario['id']]);

            // Enviar correo con la clave temporal
            require_once __DIR__ . '/../utils/EmailService.php';
            $nombreCompleto = trim(($usuario['nombre'] ?? '') . ' ' . ($usuario['apellidos'] ?? ''));
            EmailService::enviarPasswordTemporal($usuario['correo'], $nombreCompleto, $tempPassword);

            ResponseHandler::success([
                'mensaje' => 'Hemos enviado una contraseña temporal a tu correo electrónico. Úsala para ingresar.'
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::recuperarPassword – error', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al procesar la solicitud de recuperación', 500);
        }
    }

    /**
     * POST /api/auth/cambiar-password-temporal
     * Cambia la contraseña temporal por una nueva contraseña definitiva
     */
    public static function cambiarPasswordTemporal(): void
    {
        try {
            $user = AuthMiddleware::authenticate();
            $body = ResponseHandler::getBody();
            $nuevaPassword = $body['nueva_password'] ?? $body['password'] ?? '';

            if (strlen($nuevaPassword) < 8) {
                throw new InvalidArgumentException('La nueva contraseña debe tener al menos 8 caracteres.');
            }

            $db = Database::getConnection();
            $hashedNew = password_hash($nuevaPassword, PASSWORD_BCRYPT);
            $stmt = $db->prepare('UPDATE usuarios SET password = ?, requiere_cambio_password = 0 WHERE id = ?');
            $stmt->execute([$hashedNew, $user['id']]);

            ResponseHandler::success([
                'mensaje' => 'Tu contraseña ha sido actualizada exitosamente.'
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('AuthController::cambiarPasswordTemporal – error', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar la contraseña', 500);
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
     * Body: { nombre, apellidos, edad, direccion, ciudad, correo, password, rol, captchaId, captchaCode }
     */
    public static function register(): void
    {
        try {
            $body = ResponseHandler::getBody();
            $rol = $body['rol'] ?? 'cliente';
            
            $nombre = ResponseHandler::sanitize($body['nombre'] ?? '');
            $correo = ResponseHandler::sanitize($body['correo'] ?? '');
            $password = $body['password'] ?? '';
            
            $captchaId   = $body['captchaId'] ?? $body['captcha_id'] ?? null;
            $captchaCode = $body['captchaCode'] ?? $body['captcha_code'] ?? $body['captcha_respuesta'] ?? null;
            
            if (!$nombre || !$correo || !$password) {
                throw new InvalidArgumentException('Nombre, correo y contraseña son obligatorios.');
            }

            if (!self::verifyCaptcha($captchaId, $captchaCode)) {
                throw new InvalidArgumentException('El código captcha ha expirado o es incorrecto. Intenta nuevamente.');
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
