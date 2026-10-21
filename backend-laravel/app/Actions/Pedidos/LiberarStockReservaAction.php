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
     * Libera las reservas de stock asociadas a un pedido y restituye el stock en el catálogo externo.
     */
    public function execute(Pedido $pedido): int
    {
        $reservas = StockReserva::where('pedido_id', $pedido->id)->get();

        if ($reservas->isEmpty()) {
            return 0;
        }

        $liberadas = 0;

        foreach ($reservas as $reserva) {
            $productoId = (int) $reserva->producto_id;
            $cantidad = (int) $reserva->cantidad;

            if ($productoId > 0 && $cantidad > 0) {
                // Devolver stock al catálogo externo vía PUT
                $this->catalogo->ajustarStockProducto($productoId, $cantidad);
            }

            $reserva->delete();
            $liberadas++;
        }

        Log::info('LiberarStockReservaAction — Reservas liberadas y stock devuelto', [
            'pedido_id' => $pedido->id,
            'codigo_pedido' => $pedido->codigo_pedido,
            'cantidad_reservas' => $liberadas,
        ]);

        return $liberadas;
    }
}
