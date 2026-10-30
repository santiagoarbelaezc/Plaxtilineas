<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class LimpiarPedidosExpiradosAction
{
    public function __construct(
        private readonly LiberarStockReservaAction $liberarStockReservaAction
    ) {}

    /**
     * Elimina pedidos sin confirmación después del tiempo configurado.
     *
     * Los pedidos pagados o confirmados no forman parte de la consulta y se
     * vuelven a verificar dentro de la transacción para evitar una carrera con
     * la confirmación del pago.
     *
     * @return array{pedidos_eliminados: int, reservas_liberadas: int}
     */
    public function execute(): array
    {
        $minutos = max(1, (int) config('business.pedido_expiracion_minutos', 30));
        $fechaLimite = now()->subMinutes($minutos);
        $eliminados = 0;
        $reservasLiberadas = 0;

        Pedido::query()
            ->whereIn('estado', [
                EstadoPedido::DRAFT,
                EstadoPedido::PENDIENTE_PAGO,
                EstadoPedido::PENDIENTE,
            ])
            ->where('fecha', '<=', $fechaLimite)
            ->select('id')
            ->orderBy('id')
            ->chunkById(100, function ($pedidos) use (&$eliminados, &$reservasLiberadas) {
                foreach ($pedidos as $pedidoEncontrado) {
                    DB::transaction(function () use (
                        $pedidoEncontrado,
                        &$eliminados,
                        &$reservasLiberadas
                    ) {
                        /** @var Pedido|null $pedido */
                        $pedido = Pedido::query()->lockForUpdate()->find($pedidoEncontrado->id);

                        if (! $pedido || ! in_array($pedido->estado, [
                            EstadoPedido::DRAFT,
                            EstadoPedido::PENDIENTE_PAGO,
                            EstadoPedido::PENDIENTE,
                        ], true)) {
                            return;
                        }

                        $reservasLiberadas += $this->liberarStockReservaAction->execute($pedido);
                        $pedido->items()->delete();
                        $pedido->delete();
                        $eliminados++;
                    });
                }
            });

        Log::info('LimpiarPedidosExpiradosAction — Limpieza completada', [
            'pedidos_eliminados' => $eliminados,
            'reservas_liberadas' => $reservasLiberadas,
            'minutos_expiracion' => $minutos,
        ]);

        return [
            'pedidos_eliminados' => $eliminados,
            'reservas_liberadas' => $reservasLiberadas,
        ];
    }
}
