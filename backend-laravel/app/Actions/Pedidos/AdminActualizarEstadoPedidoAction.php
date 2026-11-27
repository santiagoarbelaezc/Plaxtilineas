<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Mail\CambioEstadoPedidoMailable;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;
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
        bool $solicitudCliente = false,
        ?string $evidenciaEnvioUrl = null,
        ?string $evidenciaEntregaUrl = null
    ): array {
        $estadosValidos = ['pendiente', 'pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];

        if (! in_array($nuevoEstado, $estadosValidos, true)) {
            throw new BadRequestHttpException('Estado inválido. Estados válidos: '.implode(', ', $estadosValidos));
        }

        $estadosPagados = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
        $estadoAnterior = '';
        $estadoFinal = $nuevoEstado;
        $guiaFinal = null;
        $transportadoraFinal = null;
        $evidenciaFinal = null;
        $evidenciaEntregaFinal = null;

        /** @var Pedido $pedido */
        $pedido = DB::transaction(function () use (
            $pedidoId,
            $nuevoEstado,
            $guiaNumero,
            $transportadora,
            $solicitudCliente,
            $evidenciaEnvioUrl,
            $evidenciaEntregaUrl,
            $estadosPagados,
            &$estadoAnterior,
            &$estadoFinal,
            &$guiaFinal,
            &$transportadoraFinal,
            &$evidenciaFinal,
            &$evidenciaEntregaFinal
        ) {
            /** @var Pedido|null $pedidoLocked */
            $pedidoLocked = Pedido::with('usuario')->where('id', $pedidoId)->lockForUpdate()->first();

            if (! $pedidoLocked) {
                throw new NotFoundHttpException('Pedido no encontrado');
            }

            $estadoAnterior = $pedidoLocked->estado->value;
            $eraPagado = in_array($estadoAnterior, $estadosPagados, true);

            // Si se asigna transportadora + guía a un pedido a domicilio pagado/confirmado/en_preparacion
            // sin pedir cancelarlo ni marcarlo entregado, avanzar automáticamente a 'en_camino'.
            // En recogida en tienda NO se auto-promueve a 'en_camino'.
            $esRecogidaTienda = ($pedidoLocked->tipo_entrega ?: 'domicilio') === 'recogida_tienda';
            $tieneDatosDespacho = ! $esRecogidaTienda && ! empty($transportadora) && ! empty($guiaNumero);
            $estadoFinal = $nuevoEstado;
            if (
                $tieneDatosDespacho
                && in_array($estadoAnterior, ['pagado', 'confirmado', 'en_preparacion'], true)
                && in_array($nuevoEstado, ['pagado', 'confirmado', 'en_preparacion'], true)
            ) {
                $estadoFinal = 'en_camino';
            }

            if ($eraPagado) {
                if ($estadoFinal === 'pendiente') {
                    throw new BadRequestHttpException('No puedes cambiar un pedido pagado a estado pendiente.');
                }

                if ($estadoFinal === 'cancelado' && ! $solicitudCliente) {
                    throw new BadRequestHttpException('Un pedido pagado no se puede cancelar directamente por el administrador, a menos que sea a solicitud expresa del cliente.');
                }
            }

            $evidenciaEntregaFinal = $evidenciaEntregaUrl ?? $pedidoLocked->evidencia_entrega_url;
            if ($estadoFinal === 'entregado' && empty($evidenciaEntregaFinal)) {
                throw new BadRequestHttpException('Para marcar un pedido como entregado debes adjuntar una foto de evidencia de la entrega.');
            }

            // Si se cancela el pedido y no estaba cancelado previamente, liberar y devolver el stock al catálogo
            if ($estadoFinal === 'cancelado' && $pedidoLocked->estado !== EstadoPedido::CANCELADO) {
                $this->liberarStockReservaAction->execute($pedidoLocked, $eraPagado);
            }

            $guiaFinal = $guiaNumero ?? $pedidoLocked->guia_numero;
            $transportadoraFinal = $transportadora ?? $pedidoLocked->transportadora;
            $evidenciaFinal = $evidenciaEnvioUrl ?? $pedidoLocked->evidencia_envio_url;
            $fechaEnvio = $pedidoLocked->fecha_envio;
            $fechaEntrega = $pedidoLocked->fecha_entrega;

            if ($estadoFinal === 'en_camino' && ! $fechaEnvio) {
                $fechaEnvio = now();
            }

            if ($estadoFinal === 'entregado' && ! $fechaEntrega) {
                $fechaEntrega = now();
            }

            $pedidoLocked->update([
                'estado' => EstadoPedido::from($estadoFinal),
                'guia_numero' => $guiaFinal,
                'transportadora' => $transportadoraFinal,
                'evidencia_envio_url' => $evidenciaFinal,
                'evidencia_entrega_url' => $evidenciaEntregaFinal,
                'fecha_envio' => $fechaEnvio,
                'fecha_entrega' => $fechaEntrega,
            ]);

            return $pedidoLocked;
        });

        try {
            $destinatario = $pedido->email_cliente ?: $pedido->usuario?->correo;
            if ($destinatario) {
                $nombre = $pedido->nombre_cliente ?: $pedido->usuario?->nombre ?: 'Cliente';
                Mail::to($destinatario)->send(
                    new CambioEstadoPedidoMailable(
                        $nombre,
                        $pedido->codigo_pedido,
                        $estadoAnterior,
                        $estadoFinal,
                        $guiaFinal,
                        $transportadoraFinal,
                        $evidenciaFinal,
                        $evidenciaEntregaFinal
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
            'mensaje' => "Estado actualizado de '{$estadoAnterior}' a '{$estadoFinal}'",
            'codigo_pedido' => $pedido->codigo_pedido,
            'estado_anterior' => $estadoAnterior,
            'estado_nuevo' => $estadoFinal,
            'evidencia_entrega_url' => $evidenciaEntregaFinal,
            'fecha_entrega' => $pedido->fecha_entrega?->toIso8601String(),
        ];
    }
}
