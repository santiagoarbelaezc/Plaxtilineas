<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\GoogleAuthClientInterface;
use App\Enums\RolUsuario;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ActualizarPerfilRequest;
use App\Http\Requests\Auth\CambiarPasswordTemporalRequest;
use App\Http\Requests\Auth\GoogleLoginRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RecuperarPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\PasswordTemporalMailable;
use App\Mail\VerificacionEmailMailable;
use App\Models\Usuario;
use App\Services\CaptchaService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    public function __construct(
        protected CaptchaService $captchaService,
        protected GoogleAuthClientInterface $googleAuthService
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

        $token = $usuario->createToken('auth-token')->plainTextToken;

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

        $token = $usuario->createToken('auth-token')->plainTextToken;

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
        ]);

        return ApiResponse::success([
            'mensaje' => 'Tu contraseña ha sido actualizada exitosamente.',
        ]);
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
}
