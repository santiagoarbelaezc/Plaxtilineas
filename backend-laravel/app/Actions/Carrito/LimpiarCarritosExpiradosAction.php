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
     * Limpia los carritos expirados (más de 3 horas sin actualizar)
     * y devuelve el stock reservado al catálogo externo.
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
            $prodId = (int) $item->producto_id;
            $cantidad = (int) $item->cantidad;

            if ($prodId > 0 && $cantidad > 0) {
                Log::info('[LIMPIAR_CARRITO_EXPIRADO] Devolviendo stock por carrito expirado', [
                    'producto_id' => $prodId,
                    'cantidad' => $cantidad,
                    'usuario_id' => $item->usuario_id,
                ]);

                $this->catalogo->ajustarStockProducto($prodId, $cantidad);
            }

            $item->delete();
            $totalLimpiados++;
        }

        Log::info('[LIMPIAR_CARRITO_EXPIRADO] Carritos expirados limpiados', [
            'cantidad_items' => $totalLimpiados,
        ]);

        return $totalLimpiados;
    }
}
