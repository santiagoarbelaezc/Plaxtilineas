<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Mail\PagoConfirmadoMailable;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\StockReserva;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class ConfirmarPedidoAction
{
    /**
     * Confirma un pedido tras el pago aprobado en Wompi (Two-Phase Commit).
     * Deduce el stock real, elimina reservas temporales y envía correo de confirmación.
     */
    public function execute(
        int $pedidoId,
        string $wompiTransactionId,
        string $wompiEventoId,
        int $wompiMontoCentavos
    ): bool {
        return DB::transaction(function () use (
            $pedidoId,
            $wompiTransactionId,
            $wompiEventoId,
            $wompiMontoCentavos
        ) {
            /** @var Pedido|null $pedido */
            $pedido = Pedido::with(['items.producto', 'usuario'])
                ->where('id', $pedidoId)
                ->lockForUpdate()
                ->first();

            if (! $pedido) {
                Log::error('ConfirmarPedidoAction — Pedido no encontrado', ['pedido_id' => $pedidoId]);

                return false;
            }

            // Idempotencia: evitar doble procesamiento si ya estaba pagado
            if ($pedido->estado === EstadoPedido::PAGADO) {
                Log::info('ConfirmarPedidoAction — Pedido ya estaba pagado (idempotencia)', [
                    'pedido_id' => $pedidoId,
                ]);

                return true;
            }

            // Deducir stock real de cada producto si controlar_stock está habilitado
            foreach ($pedido->items as $item) {
                Producto::where('id', $item->producto_id)
                    ->where('controlar_stock', true)
                    ->decrement('stock', $item->cantidad);
            }

            // Eliminar reservas temporales
            StockReserva::where('pedido_id', $pedidoId)->delete();

            // Actualizar pedido a PAGADO
            $pedido->update([
                'estado' => EstadoPedido::PAGADO,
                'wompi_transaction_id' => $wompiTransactionId,
                'wompi_evento_id' => $wompiEventoId,
                'wompi_monto_centavos' => $wompiMontoCentavos,
                'wompi_pagado_at' => now(),
            ]);

            // Enviar correo de confirmación (no interrumpe si falla)
            try {
                $emailDestinatario = $pedido->email_cliente ?: $pedido->usuario?->correo;
                if ($emailDestinatario) {
                    $detalles = $pedido->items->map(fn ($it) => [
                        'producto_id' => $it->producto_id,
                        'variante_id' => $it->variante_id,
                        'nombre_producto' => $it->nombre_producto,
                        'cantidad' => $it->cantidad,
                        'precio_unitario' => (float) $it->precio_unitario,
                        'subtotal' => (float) $it->subtotal,
                    ])->toArray();

                    $nombreCliente = $pedido->nombre_cliente ?: $pedido->usuario?->nombre ?: 'Cliente';

                    Mail::to($emailDestinatario)->send(
                        new PagoConfirmadoMailable(
                            $nombreCliente,
                            $pedido->codigo_pedido,
                            $detalles,
                            (float) $pedido->subtotal,
                            (float) $pedido->iva,
                            (float) $pedido->costo_envio,
                            (float) $pedido->total
                        )
                    );
                }
            } catch (Throwable $e) {
                Log::error('ConfirmarPedidoAction — Error enviando correo de confirmación', [
                    'pedido_id' => $pedidoId,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('ConfirmarPedidoAction — Pedido confirmado y pagado OK', [
                'pedido_id' => $pedidoId,
                'codigo_pedido' => $pedido->codigo_pedido,
                'wompi_transaction_id' => $wompiTransactionId,
            ]);

            return true;
        });
    }
}
