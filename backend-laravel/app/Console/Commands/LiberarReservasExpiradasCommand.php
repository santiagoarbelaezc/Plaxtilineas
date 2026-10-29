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
    protected $description = 'Limpia reservas vencidas que no pertenecen a pedidos pendientes de eliminación.';

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

            // La eliminación de pedidos pendientes la realiza el proceso de 30
            // minutos. Así se evita que esta tarea los cancele y deje registros
            // pendientes en la base de datos.
            if (in_array($pedido->estado, [
                EstadoPedido::DRAFT,
                EstadoPedido::PENDIENTE_PAGO,
                EstadoPedido::PENDIENTE,
            ], true)) {
                continue;
            }

            // Un pedido pagado, confirmado o cancelado no debe ser alterado;
            // únicamente se eliminan reservas que ya no deberían existir.
            StockReserva::where('pedido_id', $pedido->id)->delete();
        }

        $this->info("Proceso completado: {$totalPedidos} pedidos procesados, {$totalReservas} reservas liberadas.");
        Log::info('LiberarReservasExpiradasCommand — Proceso completado', [
            'pedidos_cancelados' => $totalPedidos,
            'reservas_liberadas' => $totalReservas,
        ]);

        return self::SUCCESS;
    }
}
