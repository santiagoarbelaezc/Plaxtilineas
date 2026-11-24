<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\GoogleAuthClientInterface;
use App\Enums\RolUsuario;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ActualizarPasswordConCodigoRequest;
use App\Http\Requests\Auth\ActualizarPerfilRequest;
use App\Http\Requests\Auth\CambiarPasswordTemporalRequest;
use App\Http\Requests\Auth\GoogleLoginRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RecuperarPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\CodigoCambioPasswordMailable;
use App\Mail\PasswordTemporalMailable;
use App\Mail\VerificacionEmailMailable;
use App\Models\Usuario;
use App\Services\AdminAuditService;
use App\Services\CaptchaService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    private const MAX_CAMBIOS_PASSWORD_VENTANA = 2;

    private const VENTANA_DIAS_CAMBIO_PASSWORD = 15;

    public function __construct(
        protected CaptchaService $captchaService,
        protected GoogleAuthClientInterface $googleAuthService,
        protected AdminAuditService $auditService
    ) {}

    /**
     * GET /api/auth/captcha
     */
    public function captcha(): JsonResponse
    {
        $captcha = $this->captchaService->generate();

        return ApiResponse::success($captcha);
    }

    /**
     * POST /api/auth/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $correo = (string) $request->input('correo');
        $password = (string) $request->input('password');

        /** @var Usuario|null $usuario */
        $usuario = Usuario::query()->where('correo', $correo)->first();

        if (! $usuario) {
            return ApiResponse::error('Usuario no encontrado', 401);
        }

        if (! Hash::check($password, $usuario->password)) {
            return ApiResponse::error('Contraseña incorrecta', 401);
        }

        // Los admins pre-existentes en producción tienen email_verificado = false
        // porque la BD fue creada antes de implementar verificación de email.
        // Los admins no requieren verificación de email.
        if ($usuario->google_id === null && ! $usuario->email_verificado && ! $usuario->isAdmin()) {
            return ApiResponse::error('Debes confirmar tu correo electrónico antes de iniciar sesión. Por favor, revisa tu bandeja de entrada.', 403);
        }

        $newAccessToken = $usuario->createToken('auth-token');
        $token = $newAccessToken->plainTextToken;

        if ($usuario->isAdmin()) {
            $this->auditService->iniciarSesion($usuario, (int) $newAccessToken->accessToken->id, $request);
        }

        return ApiResponse::success([
            'mensaje' => 'Login exitoso',
            'token' => $token,
            'requiere_cambio_password' => $usuario->requiere_cambio_password,
            'usuario' => [
                'id' => $usuario->id,
                'correo' => $usuario->correo,
                'nombre' => $usuario->nombre,
                'telefono' => $usuario->telefono ?? '',
                'rol' => $usuario->rol,
                'requiere_cambio_password' => $usuario->requiere_cambio_password,
            ],
        ]);
    }

    /**
     * POST /api/auth/register
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $captchaId = $request->getCaptchaId();
        $captchaCode = $request->getCaptchaCode();

        if (! $this->captchaService->verifyAndConsume($captchaId, $captchaCode)) {
            return ApiResponse::error('El código captcha ha expirado o es incorrecto. Intenta nuevamente.', 400);
        }

        $correo = (string) $request->input('correo');

        if (Usuario::query()->where('correo', $correo)->exists()) {
            return ApiResponse::error('El correo electrónico ya está registrado', 409);
        }

        $tokenVerificacion = (string) random_int(100000, 999999);
        $tokenExpiraEn = now()->addHours(24);

        /** @var Usuario $usuario */
        $usuario = Usuario::query()->create([
            'nombre' => (string) $request->input('nombre'),
            'apellidos' => $request->input('apellidos'),
            'edad' => $request->input('edad'),
            'direccion' => $request->input('direccion'),
            'ciudad' => $request->input('ciudad'),
            'telefono' => $request->input('telefono'),
            'correo' => $correo,
            'password' => Hash::make((string) $request->input('password')),
            'rol' => (string) $request->input('rol', RolUsuario::CLIENTE->value),
            'email_verificado' => false,
            'token_verificacion' => $tokenVerificacion,
            'token_expira_en' => $tokenExpiraEn,
        ]);

        try {
            Mail::to($correo)->send(new VerificacionEmailMailable($usuario->nombre, $tokenVerificacion));
        } catch (Throwable $e) {
            Log::error('Error enviando correo de verificación', ['correo' => $correo, 'exception' => $e->getMessage()]);
        }

        $token = $usuario->createToken('auth-token')->plainTextToken;

        return ApiResponse::success([
            'mensaje' => 'Registro exitoso. Se ha enviado un código de confirmación a tu correo.',
            'token' => $token,
            'usuario' => [
                'id' => $usuario->id,
                'correo' => $usuario->correo,
                'nombre' => $usuario->nombre,
                'telefono' => $usuario->telefono ?? '',
                'rol' => $usuario->rol,
            ],
            'pendiente_verificacion' => true,
        ], 201);
    }

    /**
     * POST /api/auth/google
     */
    public function googleLogin(GoogleLoginRequest $request): JsonResponse
    {
        $credential = (string) $request->input('credential');
        $googleUser = $this->googleAuthService->verifyCredential($credential);

        /** @var Usuario|null $usuario */
        $usuario = Usuario::query()->where('correo', $googleUser['email'])->first();

        if ($usuario) {
            if ($usuario->google_id === null) {
                $usuario->update([
                    'google_id' => $googleUser['sub'],
                    'email_verificado' => true,
                ]);
            }
        } else {
            /** @var Usuario $usuario */
            $usuario = Usuario::query()->create([
                'nombre' => $googleUser['name'] !== '' ? $googleUser['name'] : 'Usuario Google',
                'correo' => $googleUser['email'],
                'password' => Hash::make(Str::random(32)),
                'rol' => RolUsuario::CLIENTE->value,
                'google_id' => $googleUser['sub'],
                'email_verificado' => true,
            ]);
        }

        $newAccessToken = $usuario->createToken('auth-token');
        $token = $newAccessToken->plainTextToken;

        if ($usuario->isAdmin()) {
            $this->auditService->iniciarSesion($usuario, (int) $newAccessToken->accessToken->id, $request);
        }

        return ApiResponse::success([
            'mensaje' => 'Login con Google exitoso',
            'token' => $token,
            'requiere_cambio_password' => $usuario->requiere_cambio_password,
            'usuario' => [
                'id' => $usuario->id,
                'correo' => $usuario->correo,
                'nombre' => $usuario->nombre,
                'telefono' => $usuario->telefono ?? '',
                'rol' => $usuario->rol,
                'requiere_cambio_password' => $usuario->requiere_cambio_password,
            ],
        ]);
    }

    /**
     * POST /api/auth/recuperar-password
     */
    public function recuperarPassword(RecuperarPasswordRequest $request): JsonResponse
    {
        $captchaId = $request->getCaptchaId();
        $captchaCode = $request->getCaptchaCode();

        if (! $this->captchaService->verifyAndConsume($captchaId, $captchaCode)) {
            return ApiResponse::error('El código de seguridad es incorrecto o ha expirado.', 400);
        }

        $correo = (string) $request->input('correo');

        /** @var Usuario|null $usuario */
        $usuario = Usuario::query()->where('correo', $correo)->first();

        if (! $usuario) {
            return ApiResponse::error('No existe ninguna cuenta registrada con este correo electrónico.', 404);
        }

        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $tempPassword = 'Plx-';
        for ($i = 0; $i < 5; $i++) {
            $tempPassword .= $chars[random_int(0, strlen($chars) - 1)];
        }

        $usuario->update([
            'password' => Hash::make($tempPassword),
            'requiere_cambio_password' => true,
        ]);

        try {
            $nombreCompleto = trim(($usuario->nombre ?? '').' '.($usuario->apellidos ?? ''));
            Mail::to($usuario->correo)->send(new PasswordTemporalMailable($nombreCompleto, $tempPassword));
        } catch (Throwable $e) {
            Log::error('Error enviando password temporal', ['correo' => $usuario->correo, 'exception' => $e->getMessage()]);
        }

        return ApiResponse::success([
            'mensaje' => 'Hemos enviado una contraseña temporal a tu correo electrónico. Úsala para ingresar.',
        ]);
    }

    /**
     * POST /api/auth/cambiar-password-temporal
     */
    public function cambiarPasswordTemporal(CambiarPasswordTemporalRequest $request): JsonResponse
    {
        $nuevaPassword = $request->getNuevaPassword();

        if (strlen($nuevaPassword) < 8) {
            return ApiResponse::error('La nueva contraseña debe tener al menos 8 caracteres.', 400);
        }

        /** @var Usuario $usuario */
        $usuario = $request->user();

        $usuario->update([
            'password' => Hash::make($nuevaPassword),
            'requiere_cambio_password' => false,
        ]);

        return ApiResponse::success([
            'mensaje' => 'Tu contraseña ha sido actualizada exitosamente.',
        ]);
    }

    /**
     * GET /api/auth/password/estado
     * Devuelve el estado del límite de cambios de contraseña (máximo 2 cada 15 días).
     */
    public function estadoLimitePassword(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        return ApiResponse::success([
            'limite_password' => $this->obtenerEstadoLimitePassword($usuario),
        ]);
    }

    /**
     * POST /api/auth/password/solicitar-codigo
     * Genera un código OTP de 6 dígitos (TTL 10 min, cooldown 60s) y lo envía al correo del usuario autenticado.
     */
    public function solicitarCodigoPassword(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        $estadoLimite = $this->obtenerEstadoLimitePassword($usuario);
        if (! $estadoLimite['permitido']) {
            return ApiResponse::error($this->mensajeLimitePasswordAlcanzado($estadoLimite), 429);
        }

        if (! $usuario->correo) {
            return ApiResponse::error('Tu cuenta no tiene un correo electrónico registrado.', 400);
        }

        $cooldownKey = "password_otp_cooldown:{$usuario->id}";
        if (Cache::has($cooldownKey)) {
            $restante = max(1, (int) Cache::get($cooldownKey) - time());

            return ApiResponse::error("Por favor espera {$restante} segundos antes de solicitar un nuevo código.", 429);
        }

        $codigo = (string) random_int(100000, 999999);
        $expiraMinutos = 10;
        $otpKey = "password_otp:{$usuario->id}";

        try {
            $nombre = trim((string) ($usuario->nombre ?? 'Cliente')) ?: 'Cliente';
            Mail::to($usuario->correo)->send(new CodigoCambioPasswordMailable($nombre, $codigo, $expiraMinutos));
        } catch (Throwable $e) {
            Log::error('Error enviando código OTP de cambio de contraseña', [
                'usuario_id' => $usuario->id,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error('No pudimos enviar el código a tu correo en este momento. Intenta de nuevo en unos minutos.', 500);
        }

        Cache::put($otpKey, [
            'hash' => Hash::make($codigo),
            'intentos' => 0,
            'verificado' => false,
        ], now()->addMinutes($expiraMinutos));

        Cache::put($cooldownKey, time() + 60, now()->addSeconds(60));

        return ApiResponse::success([
            'mensaje' => 'Enviamos un código de 6 dígitos a tu correo electrónico.',
            'correo_enmascarado' => $this->enmascararCorreo((string) $usuario->correo),
            'expira_minutos' => $expiraMinutos,
            'cooldown_segundos' => 60,
        ]);
    }

    /**
     * POST /api/auth/password/validar-codigo
     * Verifica que el código OTP de 6 dígitos sea válido antes de habilitar los campos de nueva contraseña.
     */
    public function validarCodigoPassword(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        $estadoLimite = $this->obtenerEstadoLimitePassword($usuario);
        if (! $estadoLimite['permitido']) {
            return ApiResponse::error($this->mensajeLimitePasswordAlcanzado($estadoLimite), 429);
        }

        $codigoIngresado = trim((string) $request->input('codigo', ''));

        if (! preg_match('/^\d{6}$/', $codigoIngresado)) {
            return ApiResponse::error('El código de verificación debe tener exactamente 6 dígitos numéricos.', 422);
        }

        $otpKey = "password_otp:{$usuario->id}";

        /** @var array{hash: string, intentos: int, verificado?: bool}|null $otpData */
        $otpData = Cache::get($otpKey);

        if (! $otpData || empty($otpData['hash'])) {
            return ApiResponse::error('El código ha expirado o no ha sido solicitado. Solicita un nuevo código.', 400);
        }

        if (! Hash::check($codigoIngresado, $otpData['hash'])) {
            $intentos = (int) ($otpData['intentos'] ?? 0) + 1;
            if ($intentos >= 5) {
                Cache::forget($otpKey);

                return ApiResponse::error('Superaste el máximo de intentos fallidos. Solicita un nuevo código.', 429);
            }

            Cache::put($otpKey, [
                'hash' => $otpData['hash'],
                'intentos' => $intentos,
                'verificado' => false,
            ], now()->addMinutes(10));

            $restantes = 5 - $intentos;

            return ApiResponse::error("Código de verificación incorrecto. Te quedan {$restantes} intentos.", 400);
        }

        Cache::put($otpKey, [
            'hash' => $otpData['hash'],
            'intentos' => (int) ($otpData['intentos'] ?? 0),
            'verificado' => true,
        ], now()->addMinutes(10));

        return ApiResponse::success([
            'valido' => true,
            'mensaje' => 'Código verificado correctamente. Ahora puedes establecer tu nueva contraseña.',
        ]);
    }

    /**
     * POST /api/auth/password/actualizar
     * Valida el código OTP (máx. 5 intentos) y actualiza la contraseña cumpliendo la política segura.
     */
    public function actualizarPasswordConCodigo(ActualizarPasswordConCodigoRequest $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        $estadoLimite = $this->obtenerEstadoLimitePassword($usuario);
        if (! $estadoLimite['permitido']) {
            return ApiResponse::error($this->mensajeLimitePasswordAlcanzado($estadoLimite), 429);
        }

        $otpKey = "password_otp:{$usuario->id}";

        /** @var array{hash: string, intentos: int}|null $otpData */
        $otpData = Cache::get($otpKey);

        if (! $otpData || empty($otpData['hash'])) {
            return ApiResponse::error('El código ha expirado o no ha sido solicitado. Solicita un nuevo código.', 400);
        }

        $codigoIngresado = trim((string) $request->input('codigo'));
        if (! Hash::check($codigoIngresado, $otpData['hash'])) {
            $intentos = (int) ($otpData['intentos'] ?? 0) + 1;
            if ($intentos >= 5) {
                Cache::forget($otpKey);

                return ApiResponse::error('Superaste el máximo de intentos fallidos. Solicita un nuevo código.', 429);
            }

            Cache::put($otpKey, [
                'hash' => $otpData['hash'],
                'intentos' => $intentos,
            ], now()->addMinutes(10));

            $restantes = 5 - $intentos;

            return ApiResponse::error("Código de verificación incorrecto. Te quedan {$restantes} intentos.", 400);
        }

        $nuevaPassword = (string) $request->input('nueva_password');
        if ($usuario->password && Hash::check($nuevaPassword, (string) $usuario->password)) {
            return ApiResponse::error('La nueva contraseña debe ser diferente a tu contraseña actual.', 422);
        }

        $historialReciente = $this->filtrarHistorialPasswordReciente($usuario);
        $historialReciente[] = now()->toIso8601String();

        $usuario->update([
            'password' => Hash::make($nuevaPassword),
            'requiere_cambio_password' => false,
            'password_cambios_historial' => $historialReciente,
        ]);

        Cache::forget($otpKey);
        Cache::forget("password_otp_cooldown:{$usuario->id}");

        Log::info('Contraseña actualizada mediante código OTP', ['usuario_id' => $usuario->id]);

        return ApiResponse::success([
            'mensaje' => 'Tu contraseña ha sido actualizada correctamente.',
            'limite_password' => $this->obtenerEstadoLimitePassword($usuario->fresh() ?? $usuario),
        ]);
    }

    /**
     * @return list<string>
     */
    private function filtrarHistorialPasswordReciente(Usuario $usuario): array
    {
        $raw = $usuario->password_cambios_historial;
        if (! is_array($raw)) {
            return [];
        }

        $limiteInicio = now()->subDays(self::VENTANA_DIAS_CAMBIO_PASSWORD);
        $fechas = [];

        foreach ($raw as $item) {
            if (! is_string($item) || $item === '') {
                continue;
            }
            try {
                $fecha = Carbon::parse($item);
                if ($fecha->greaterThanOrEqualTo($limiteInicio)) {
                    $fechas[] = $fecha;
                }
            } catch (Throwable) {
                continue;
            }
        }

        usort($fechas, static fn (Carbon $a, Carbon $b): int => $a->getTimestamp() <=> $b->getTimestamp());

        return array_map(static fn (Carbon $f): string => $f->toIso8601String(), $fechas);
    }

    /**
     * @return array{
     *     usados: int,
     *     maximo: int,
     *     restantes: int,
     *     ventana_dias: int,
     *     permitido: bool,
     *     proximo_disponible_en: string|null,
     *     dias_restantes: int
     * }
     */
    private function obtenerEstadoLimitePassword(Usuario $usuario): array
    {
        $recientes = $this->filtrarHistorialPasswordReciente($usuario);
        $usados = count($recientes);
        $maximo = self::MAX_CAMBIOS_PASSWORD_VENTANA;
        $restantes = max(0, $maximo - $usados);
        $permitido = $usados < $maximo;

        $proximoDisponibleIso = null;
        $diasRestantes = 0;

        if (! $permitido && isset($recientes[0])) {
            $fechaMasAntigua = Carbon::parse($recientes[0]);
            $proximoDisponible = $fechaMasAntigua->copy()->addDays(self::VENTANA_DIAS_CAMBIO_PASSWORD);
            $proximoDisponibleIso = $proximoDisponible->toIso8601String();
            $segundosRestantes = max(1, $proximoDisponible->getTimestamp() - now()->getTimestamp());
            $diasRestantes = (int) ceil($segundosRestantes / 86400);
        }

        return [
            'usados' => $usados,
            'maximo' => $maximo,
            'restantes' => $restantes,
            'ventana_dias' => self::VENTANA_DIAS_CAMBIO_PASSWORD,
            'permitido' => $permitido,
            'proximo_disponible_en' => $proximoDisponibleIso,
            'dias_restantes' => $diasRestantes,
        ];
    }

    /**
     * @param  array{usados: int, maximo: int, restantes: int, ventana_dias: int, permitido: bool, proximo_disponible_en: string|null, dias_restantes: int}  $estado
     */
    private function mensajeLimitePasswordAlcanzado(array $estado): string
    {
        $dias = $estado['dias_restantes'];
        $etiquetaDias = $dias === 1 ? '1 día' : "{$dias} días";

        return "Has alcanzado el límite de {$estado['maximo']} cambios de contraseña cada {$estado['ventana_dias']} días. Podrás cambiarla nuevamente en {$etiquetaDias}.";
    }

    private function enmascararCorreo(string $correo): string
    {
        $parts = explode('@', $correo);
        if (count($parts) !== 2) {
            return $correo;
        }
        [$local, $dominio] = $parts;
        $visible = mb_substr($local, 0, min(2, mb_strlen($local)));

        return $visible.str_repeat('•', max(3, mb_strlen($local) - 2)).'@'.$dominio;
    }

    /**
     * GET /api/auth/verificar-email
     */
    public function verificarEmail(Request $request): JsonResponse
    {
        $token = (string) $request->query('token', '');
        $correo = (string) $request->query('correo', '');

        if ($token === '' || $correo === '') {
            return ApiResponse::error('Token y correo son obligatorios.', 400);
        }

        /** @var Usuario|null $usuario */
        $usuario = Usuario::query()->where('correo', $correo)->first();

        if (! $usuario) {
            return ApiResponse::error('Usuario no encontrado.', 404);
        }

        if ($usuario->email_verificado) {
            $token = $usuario->createToken('auth-token')->plainTextToken;

            return ApiResponse::success([
                'mensaje' => 'El correo ya ha sido verificado previamente.',
                'token' => $token,
                'usuario' => $this->usuarioResponse($usuario),
            ]);
        }

        if ($usuario->token_verificacion !== $token) {
            return ApiResponse::error('Código de verificación inválido.', 400);
        }

        if ($usuario->token_expira_en && $usuario->token_expira_en->isPast()) {
            return ApiResponse::error('El código de verificación ha expirado. Solicita un nuevo código.', 400);
        }

        $usuario->update([
            'email_verificado' => true,
            'token_verificacion' => null,
            'token_expira_en' => null,
        ]);

        $token = $usuario->createToken('auth-token')->plainTextToken;

        return ApiResponse::success([
            'mensaje' => 'Correo electrónico verificado exitosamente. Ya puedes iniciar sesión.',
            'token' => $token,
            'usuario' => $this->usuarioResponse($usuario),
        ]);
    }

    /**
     * @return array{id: mixed, correo: mixed, nombre: mixed, telefono: mixed, rol: mixed}
     */
    private function usuarioResponse(Usuario $usuario): array
    {
        return [
            'id' => $usuario->id,
            'correo' => $usuario->correo,
            'nombre' => $usuario->nombre,
            'telefono' => $usuario->telefono ?? '',
            'rol' => $usuario->rol,
        ];
    }

    /**
     * GET /api/auth/perfil
     */
    public function perfil(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        return ApiResponse::success([
            'id' => $usuario->id,
            'nombre' => $usuario->nombre,
            'apellidos' => $usuario->apellidos,
            'correo' => $usuario->correo,
            'edad' => $usuario->edad,
            'direccion' => $usuario->direccion,
            'ciudad' => $usuario->ciudad,
            'telefono' => $usuario->telefono,
            'rol' => $usuario->rol,
        ]);
    }

    /**
     * PUT /api/auth/actualizar
     */
    public function actualizar(ActualizarPerfilRequest $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        $usuario->update([
            'nombre' => (string) $request->input('nombre'),
            'apellidos' => (string) $request->input('apellidos'),
            'edad' => (int) $request->input('edad'),
            'direccion' => (string) $request->input('direccion'),
            'ciudad' => (string) $request->input('ciudad'),
            'telefono' => (string) $request->input('telefono'),
        ]);

        return ApiResponse::success([
            'mensaje' => 'Perfil actualizado exitosamente',
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'apellidos' => $usuario->apellidos,
                'correo' => $usuario->correo,
                'edad' => $usuario->edad,
                'direccion' => $usuario->direccion,
                'ciudad' => $usuario->ciudad,
                'telefono' => $usuario->telefono,
                'rol' => $usuario->rol,
            ],
        ]);
    }

    /**
     * DELETE /api/auth/cuenta
     */
    public function cuenta(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        if ($usuario->isAdmin()) {
            return ApiResponse::error('No se pueden eliminar cuentas de administrador.', 403);
        }

        // Revocar todos los tokens de Sanctum
        $usuario->tokens()->delete();
        $usuario->delete();

        return ApiResponse::success([
            'mensaje' => 'Cuenta eliminada exitosamente',
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if ($usuario) {
            if ($usuario->isAdmin()) {
                $this->auditService->cerrarSesion($usuario, $request);
            }

            try {
                $usuario->currentAccessToken()->delete();
            } catch (Throwable) {
                // Ignorar en entornos de prueba con TransientToken
            }
        }

        return ApiResponse::success([
            'mensaje' => 'Sesión cerrada exitosamente.',
        ]);
    }
}
