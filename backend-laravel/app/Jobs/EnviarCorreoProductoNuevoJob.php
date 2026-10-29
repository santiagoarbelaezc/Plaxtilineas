<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\ProductoNuevoMailable;
use App\Models\NotificacionProducto;
use App\Models\Usuario;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Envía el correo de producto nuevo a un único cliente.
 * Un fallo individual no afecta al resto del lote.
 */
class EnviarCorreoProductoNuevoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(
        public int $notificacionId,
        public int $usuarioId,
    ) {}

    public function handle(): void
    {
        $notificacion = NotificacionProducto::query()->find($this->notificacionId);
        $usuario = Usuario::query()->find($this->usuarioId);

        if ($notificacion === null || $usuario === null) {
            return;
        }

        // Pudo darse de baja entre el encolado y el envío.
        if (! $usuario->acepta_novedades) {
            $this->registrar($notificacion, 'fallidos');

            return;
        }

        if ($usuario->token_baja === null || $usuario->token_baja === '') {
            // Query Builder directo: el esquema legado de `usuarios` puede no tener `updated_at`.
            $token = Str::random(48);
            DB::table('usuarios')->where('id', $usuario->id)->update(['token_baja' => $token]);
            $usuario->token_baja = $token;
        }

        Mail::to($usuario->correo)->send(
            new ProductoNuevoMailable(
                nombre: $usuario->nombre,
                producto: $notificacion->payload,
                tokenBaja: (string) $usuario->token_baja,
            )
        );

        $this->registrar($notificacion, 'enviados');
    }

    public function failed(?Throwable $exception): void
    {
        $notificacion = NotificacionProducto::query()->find($this->notificacionId);

        if ($notificacion !== null) {
            $this->registrar($notificacion, 'fallidos');
        }
    }

    private function registrar(NotificacionProducto $notificacion, string $columna): void
    {
        $notificacion->increment($columna);
        $notificacion->refresh();

        if (
            $notificacion->total_destinatarios > 0
            && ($notificacion->enviados + $notificacion->fallidos) >= $notificacion->total_destinatarios
        ) {
            $notificacion->update(['estado' => NotificacionProducto::ESTADO_COMPLETADA]);
        }
    }
}
