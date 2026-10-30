<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Models\Pedido;
use App\Models\StockReserva;
use App\Services\Catalogo\CatalogoApiService;
use Illuminate\Support\Facades\Log;

final class LiberarStockReservaAction
{
    public function __construct(
        private readonly CatalogoApiService $catalogo
    ) {}

    /**
     * Libera las reservas de stock asociadas a un pedido y restituye el stock en el catálogo.
     */
    public function execute(Pedido $pedido): int
    {
        $reservas = StockReserva::where('pedido_id', $pedido->id)->get();
        $liberadas = 0;

        if ($reservas->isNotEmpty()) {
            foreach ($reservas as $reserva) {
                $productoId = (int) $reserva->producto_id;
                $cantidad = (int) $reserva->cantidad;

                if ($productoId > 0 && $cantidad > 0) {
                    $this->catalogo->ajustarStockProducto($productoId, $cantidad);
                    $liberadas++;
                }

                $reserva->delete();
            }
        } else {
            // Fallback garantizado: si no había registros en stock_reservas (ej. pedidos creados en draft/Wompi),
            // restaurar el stock a partir de los items del pedido guardados en pedido_detalles.
            $items = $pedido->items()->get();
            $itemsPorProducto = [];

            foreach ($items as $item) {
                $productoId = (int) $item->producto_id;
                $cantidad = (int) $item->cantidad;

                if ($productoId > 0 && $cantidad > 0) {
                    $itemsPorProducto[$productoId] = ($itemsPorProducto[$productoId] ?? 0) + $cantidad;
                }
            }

            foreach ($itemsPorProducto as $productoId => $cantidad) {
                $this->catalogo->ajustarStockProducto($productoId, $cantidad);
                $liberadas++;
            }
        }

        Log::info('LiberarStockReservaAction — Stock devuelto al catálogo y reservas liberadas', [
            'pedido_id' => $pedido->id,
            'codigo_pedido' => $pedido->codigo_pedido,
            'items_devueltos' => $liberadas,
        ]);

        return $liberadas;
    }
}
