<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AdminAuditoriaLog;
use App\Models\AdminSesion;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdminAuditService
{
    /**
     * Inicia una nueva sesión de auditoría cuando un administrador se autentica.
     */
    public function iniciarSesion(Usuario $admin, ?int $tokenId = null, ?Request $request = null): ?AdminSesion
    {
        if (! $admin->isAdmin()) {
            return null;
        }

        try {
            $req = $request ?? request();
            $ahora = now();

            $sesion = AdminSesion::create([
                'admin_id' => $admin->id,
                'token_id' => $tokenId,
                'ip_address' => $req?->ip(),
                'user_agent' => $req?->userAgent(),
                'inicio_sesion_at' => $ahora,
                'ultima_actividad_at' => $ahora,
                'duracion_segundos' => 0,
                'activa' => true,
            ]);

            AdminAuditoriaLog::create([
                'sesion_id' => $sesion->id,
                'admin_id' => $admin->id,
                'modulo' => 'AUTH',
                'accion' => 'LOGIN',
                'descripcion' => "Inicio de sesión de administrador ({$admin->nombre} - {$admin->correo})",
                'entidad_tipo' => 'Usuario',
                'entidad_id' => (string) $admin->id,
                'datos_nuevos' => [
                    'correo' => $admin->correo,
                    'ip' => $req?->ip(),
                    'user_agent' => $req?->userAgent(),
                ],
                'ip_address' => $req?->ip(),
                'created_at' => $ahora,
            ]);

            return $sesion;
        } catch (Throwable $e) {
            Log::error('AdminAuditService::iniciarSesion error', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Obtiene o inicializa la sesión activa del administrador y actualiza su tiempo de actividad.
     */
    public function actualizarActividad(Usuario $admin, ?Request $request = null): ?AdminSesion
    {
        if (! $admin->isAdmin()) {
            return null;
        }

        try {
            $req = $request ?? request();
            $tokenId = $this->resolveCurrentTokenId($admin);
            $ahora = now();

            $query = AdminSesion::where('admin_id', $admin->id)->where('activa', true);

            $sesion = null;
            if ($tokenId !== null) {
                $sesion = (clone $query)->where('token_id', $tokenId)->latest('inicio_sesion_at')->first();
            }

            if (! $sesion) {
                $sesion = $query->latest('inicio_sesion_at')->first();
            }

            if (! $sesion) {
                $sesion = AdminSesion::create([
                    'admin_id' => $admin->id,
                    'token_id' => $tokenId,
                    'ip_address' => $req?->ip(),
                    'user_agent' => $req?->userAgent(),
                    'inicio_sesion_at' => $ahora,
                    'ultima_actividad_at' => $ahora,
                    'duracion_segundos' => 0,
                    'activa' => true,
                ]);

                return $sesion;
            }

            $segundos = (int) abs($ahora->diffInSeconds($sesion->inicio_sesion_at));

            $sesion->update([
                'ultima_actividad_at' => $ahora,
                'duracion_segundos' => max((int) $sesion->duracion_segundos, $segundos),
                'ip_address' => $sesion->ip_address ?: $req?->ip(),
            ]);

            return $sesion;
        } catch (Throwable $e) {
            Log::error('AdminAuditService::actualizarActividad error', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Cierra la sesión activa del administrador y consolida el tiempo total logueado.
     */
    public function cerrarSesion(Usuario $admin, ?Request $request = null): ?AdminSesion
    {
        if (! $admin->isAdmin()) {
            return null;
        }

        try {
            $req = $request ?? request();
            $tokenId = $this->resolveCurrentTokenId($admin);
            $ahora = now();

            $query = AdminSesion::where('admin_id', $admin->id)->where('activa', true);

            $sesion = null;
            if ($tokenId !== null) {
                $sesion = (clone $query)->where('token_id', $tokenId)->latest('inicio_sesion_at')->first();
            }

            if (! $sesion) {
                $sesion = $query->latest('inicio_sesion_at')->first();
            }

            $segundos = 0;
            if ($sesion) {
                $segundos = (int) abs($ahora->diffInSeconds($sesion->inicio_sesion_at));
                $segundos = max((int) $sesion->duracion_segundos, $segundos);

                $sesion->update([
                    'ultima_actividad_at' => $ahora,
                    'fin_sesion_at' => $ahora,
                    'duracion_segundos' => $segundos,
                    'activa' => false,
                ]);
            }

            $duracionTexto = AdminSesion::formatearSegundos($segundos);

            AdminAuditoriaLog::create([
                'sesion_id' => $sesion?->id,
                'admin_id' => $admin->id,
                'modulo' => 'AUTH',
                'accion' => 'LOGOUT',
                'descripcion' => "Cierre de sesión de administrador ({$admin->nombre}). Tiempo conectado: {$duracionTexto}",
                'entidad_tipo' => 'Usuario',
                'entidad_id' => (string) $admin->id,
                'datos_nuevos' => [
                    'duracion_segundos' => $segundos,
                    'duracion_formateada' => $duracionTexto,
                    'fin_sesion_at' => $ahora->toIso8601String(),
                ],
                'ip_address' => $req?->ip(),
                'created_at' => $ahora,
            ]);

            return $sesion;
        } catch (Throwable $e) {
            Log::error('AdminAuditService::cerrarSesion error', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Registra una operación realizada por un administrador con trazabilidad completa.
     *
     * @param  array<string, mixed>|null  $datosAnteriores
     * @param  array<string, mixed>|null  $datosNuevos
     */
    public function registrarOperacion(
        string $modulo,
        string $accion,
        string $descripcion,
        ?string $entidadTipo = null,
        string|int|null $entidadId = null,
        ?array $datosAnteriores = null,
        ?array $datosNuevos = null,
        ?Usuario $admin = null,
        ?Request $request = null
    ): ?AdminAuditoriaLog {
        try {
            $req = $request ?? request();
            /** @var Usuario|null $user */
            $user = $admin ?? $req?->user();

            if (! $user || ! $user->isAdmin()) {
                return null;
            }

            $sesion = $this->actualizarActividad($user, $req);

            return AdminAuditoriaLog::create([
                'sesion_id' => $sesion?->id,
                'admin_id' => $user->id,
                'modulo' => strtoupper($modulo),
                'accion' => strtoupper($accion),
                'descripcion' => $descripcion,
                'entidad_tipo' => $entidadTipo,
                'entidad_id' => $entidadId !== null ? (string) $entidadId : null,
                'datos_anteriores' => $datosAnteriores,
                'datos_nuevos' => $datosNuevos,
                'ip_address' => $req?->ip(),
                'created_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::error('AdminAuditService::registrarOperacion error', [
                'modulo' => $modulo,
                'accion' => $accion,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function resolveCurrentTokenId(Usuario $admin): ?int
    {
        try {
            $accessToken = $admin->currentAccessToken();
            if ($accessToken && isset($accessToken->id) && is_numeric($accessToken->id)) {
                return (int) $accessToken->id;
            }
        } catch (Throwable) {
            // Ignorar si es TransientToken en pruebas
        }

        return null;
    }
}
