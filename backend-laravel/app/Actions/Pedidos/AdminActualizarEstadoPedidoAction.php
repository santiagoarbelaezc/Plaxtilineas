<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Mail\CambioEstadoPedidoMailable;
use App\Models\Pedido;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class AdminActualizarEstadoPedidoAction
{
    public function __construct(
        private readonly LiberarStockReservaAction $liberarStockReservaAction
    ) {}

    /**
     * @return array<string, string>
     */
    public function execute(
        int $pedidoId,
        string $nuevoEstado,
        ?string $guiaNumero = null,
        ?string $transportadora = null,
        bool $solicitudCliente = false
    ): array {
        $estadosValidos = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];

        if (! in_array($nuevoEstado, $estadosValidos, true)) {
            throw new BadRequestHttpException('Estado inválido. Estados válidos: '.implode(', ', $estadosValidos));
        }

        /** @var Pedido|null $pedido */
        $pedido = Pedido::with('usuario')->find($pedidoId);

        if (! $pedido) {
            throw new NotFoundHttpException('Pedido no encontrado');
        }

        $estadoAnterior = $pedido->estado->value;

        $estadosPagados = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
        if (in_array($estadoAnterior, $estadosPagados, true)) {
            if ($nuevoEstado === 'pendiente') {
                throw new BadRequestHttpException('No puedes cambiar un pedido pagado a estado pendiente.');
            }

            if ($nuevoEstado === 'cancelado' && ! $solicitudCliente) {
                throw new BadRequestHttpException('Un pedido pagado no se puede cancelar directamente por el administrador, a menos que sea a solicitud expresa del cliente.');
            }
        }

        // Si se cancela el pedido y no estaba cancelado previamente, liberar y devolver el stock al catálogo
        if ($nuevoEstado === 'cancelado' && $pedido->estado !== EstadoPedido::CANCELADO) {
            $this->liberarStockReservaAction->execute($pedido);
        }

        $guiaFinal = $guiaNumero ?? $pedido->guia_numero;
        $transportadoraFinal = $transportadora ?? $pedido->transportadora;
        $fechaEnvio = $pedido->fecha_envio;

        if ($nuevoEstado === 'en_camino' && ! $fechaEnvio) {
            $fechaEnvio = now();
        }

        $pedido->update([
            'estado' => EstadoPedido::from($nuevoEstado),
            'guia_numero' => $guiaFinal,
            'transportadora' => $transportadoraFinal,
            'fecha_envio' => $fechaEnvio,
        ]);

        try {
            $destinatario = $pedido->email_cliente ?: $pedido->usuario?->correo;
            if ($destinatario) {
                $nombre = $pedido->nombre_cliente ?: $pedido->usuario?->nombre ?: 'Cliente';
                Mail::to($destinatario)->send(
                    new CambioEstadoPedidoMailable(
                        $nombre,
                        $pedido->codigo_pedido,
                        $estadoAnterior,
                        $nuevoEstado,
                        $guiaFinal,
                        $transportadoraFinal
                    )
                );
            }
        } catch (Throwable $e) {
            Log::error('AdminActualizarEstadoPedidoAction — Error enviando correo', [
                'pedido_id' => $pedidoId,
                'error' => $e->getMessage(),
            ]);
        }

        return [
            'mensaje' => "Estado actualizado de '{$estadoAnterior}' a '{$nuevoEstado}'",
            'codigo_pedido' => $pedido->codigo_pedido,
            'estado_anterior' => $estadoAnterior,
            'estado_nuevo' => $nuevoEstado,
        ];
    }
}
