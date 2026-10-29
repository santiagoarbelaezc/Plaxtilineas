<?php

declare(strict_types=1);

namespace App\Actions\Notificaciones;

use App\Jobs\EnviarNotificacionProductoNuevoJob;
use App\Models\NotificacionProducto;

/**
 * Registra el producto nuevo de forma idempotente y despacha el envío en cola.
 */
final class NotificarProductoNuevoAction
{
    /**
     * @param  array<string, mixed>  $producto
     * @return array{notificacion: NotificacionProducto, duplicada: bool}
     */
    public function execute(array $producto): array
    {
        $notificacion = NotificacionProducto::query()->firstOrCreate(
            ['producto_id' => (int) $producto['id']],
            [
                'payload' => $producto,
                'estado' => NotificacionProducto::ESTADO_PENDIENTE,
            ]
        );

        if (! $notificacion->wasRecentlyCreated) {
            return ['notificacion' => $notificacion, 'duplicada' => true];
        }

        EnviarNotificacionProductoNuevoJob::dispatch($notificacion->id);

        return ['notificacion' => $notificacion, 'duplicada' => false];
    }
}

