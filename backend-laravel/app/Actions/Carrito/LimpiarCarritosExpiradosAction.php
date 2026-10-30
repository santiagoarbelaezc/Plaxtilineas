<?php

declare(strict_types=1);

namespace App\Actions\Carrito;

use App\Models\Carrito;
use App\Services\Catalogo\CatalogoApiService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

final class LimpiarCarritosExpiradosAction
{
    public function __construct(
        private readonly CatalogoApiService $catalogo
    ) {}

    /**
     * Limpia carritos inactivos y devuelve al catálogo el stock reservado.
     */
    public function execute(): int
    {
        $horas = (int) config('business.carrito_expiracion_horas', 3);
        $limite = Carbon::now()->subHours($horas);

        $expirados = Carrito::where('updated_at', '<', $limite)->get();

        if ($expirados->isEmpty()) {
            return 0;
        }

        $totalLimpiados = 0;

        foreach ($expirados as $item) {
            $productoId = (int) $item->producto_id;
            $cantidad = (int) $item->cantidad;

            if ($productoId > 0 && $cantidad > 0
                && ! $this->catalogo->ajustarStockProducto($productoId, $cantidad)) {
                Log::error('[LIMPIAR_CARRITO_EXPIRADO] No se pudo devolver stock; se conserva el carrito', [
                    'usuario_id' => $item->usuario_id,
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                ]);

                continue;
            }

            Log::info('[LIMPIAR_CARRITO_EXPIRADO] Eliminando carrito inactivo y liberando stock', [
                'usuario_id' => $item->usuario_id,
                'producto_id' => $item->producto_id,
                'cantidad' => $item->cantidad,
                'stock_devuelto' => true,
            ]);
            $item->delete();
            $totalLimpiados++;
        }

        Log::info('[LIMPIAR_CARRITO_EXPIRADO] Carritos expirados limpiados', [
            'cantidad_items' => $totalLimpiados,
        ]);

        return $totalLimpiados;
    }
}
