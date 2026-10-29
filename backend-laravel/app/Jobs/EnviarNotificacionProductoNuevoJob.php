<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\RolUsuario;
use App\Models\NotificacionProducto;
use App\Models\Usuario;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Orquestador: cuenta los clientes elegibles y encola un job por destinatario.
 * Es liviano (solo IDs), así que no excede el retry_after de la cola.
 */
class EnviarNotificacionProductoNuevoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $notificacionId) {}

    /**
     * Clientes con rol cliente, correo verificado y opt-in a novedades.
     *
     * @return \Illuminate\Database\Eloquent\Builder<Usuario>
     */
    public static function destinatarios(): \Illuminate\Database\Eloquent\Builder
    {
        return Usuario::query()
            ->where('rol', RolUsuario::CLIENTE->value)
            ->where('email_verificado', true)
            ->where('acepta_novedades', true)
            ->whereNotNull('correo')
            ->where('correo', '!=', '');
    }

    public function handle(): void
    {
        $notificacion = NotificacionProducto::query()->find($this->notificacionId);

        if ($notificacion === null || $notificacion->estado !== NotificacionProducto::ESTADO_PENDIENTE) {
            return;
        }

        if (! (bool) config('services.catalogo.notificaciones_activas', true)) {
            return;
        }

        $total = self::destinatarios()->count();

        $notificacion->update([
            'total_destinatarios' => $total,
            'estado' => $total === 0
                ? NotificacionProducto::ESTADO_COMPLETADA
                : NotificacionProducto::ESTADO_ENVIANDO,
        ]);

        if ($total === 0) {
            return;
        }

        self::destinatarios()->select('usuarios.id')->chunkById(200, function ($usuarios) use ($notificacion): void {
            foreach ($usuarios as $usuario) {
                EnviarCorreoProductoNuevoJob::dispatch($notificacion->id, (int) $usuario->id);
            }
        });
    }
}

