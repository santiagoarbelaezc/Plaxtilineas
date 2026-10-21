<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Pedidos\LiberarStockReservaAction;
use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\StockReserva;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

final class LiberarReservasExpiradasCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stock:liberar-expirados';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Libera reservas de stock vencidas (3 horas sin compra), devuelve el inventario al catálogo externo y cancela pedidos draft no pagados.';

    public function handle(LiberarStockReservaAction $liberarAction): int
    {
        $this->info('Iniciando verificación de reservas de stock expiradas...');

        // Buscar reservas cuya fecha de expiración sea menor o igual a ahora
        $reservasExpiradas = StockReserva::expiradas()->get();

        if ($reservasExpiradas->isEmpty()) {
            $this->info('No hay reservas expiradas para procesar.');

            return self::SUCCESS;
        }

        $pedidoIds = $reservasExpiradas->pluck('pedido_id')->unique()->filter();
        $totalPedidos = 0;
        $totalReservas = 0;

        foreach ($pedidoIds as $pedidoId) {
            /** @var Pedido|null $pedido */
            $pedido = Pedido::find($pedidoId);
            if (! $pedido) {
                // Si el pedido ya no existe en la BD, limpiar las reservas huérfanas
                StockReserva::where('pedido_id', $pedidoId)->delete();
                continue;
            }

            // Solo liberar si el pedido sigue pendiente de pago o en draft
            if (in_array($pedido->estado, [EstadoPedido::DRAFT, EstadoPedido::PENDIENTE_PAGO], true)) {
                $liberadas = $liberarAction->execute($pedido);
                $totalReservas += $liberadas;

                $pedido->update([
                    'estado' => EstadoPedido::CANCELADO,
                    'notas' => trim(($pedido->notas ?? '') . ' [Cancelado automáticamente por expiración del tiempo de reserva de 3 horas]'),
                ]);

                $totalPedidos++;
                $this->line("Pedido #{$pedido->codigo_pedido} cancelado y stock restituido al catálogo.");
            } else {
                // Si el pedido ya estaba pagado, confirmado o cancelado, solo limpiar la fila de reserva
                StockReserva::where('pedido_id', $pedido->id)->delete();
            }
        }

        $this->info("Proceso completado: {$totalPedidos} pedidos cancelados, {$totalReservas} reservas liberadas.");
        Log::info('LiberarReservasExpiradasCommand — Proceso completado', [
            'pedidos_cancelados' => $totalPedidos,
            'reservas_liberadas' => $totalReservas,
        ]);

        return self::SUCCESS;
    }
}
