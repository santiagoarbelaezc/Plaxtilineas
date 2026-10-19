<?php

declare(strict_types=1);

namespace App\Actions\Carrito;

use App\Models\Carrito;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

final class LimpiarCarritosExpiradosAction
{
    /**
     * Limpia los carritos expirados (más de 24 horas sin actualizar)
     * y devuelve el stock reservado al inventario.
     */
    public function execute(): int
    {
        $limite = Carbon::now()->subHours(24);

        $expirados = Carrito::with('producto')
            ->where('updated_at', '<', $limite)
            ->get();

        if ($expirados->isEmpty()) {
            return 0;
        }

        $totalLimpiados = 0;

        foreach ($expirados as $item) {
            if ($item->producto && $item->producto->controlar_stock) {
                $item->producto->increment('stock', $item->cantidad);
            }

            $item->delete();
            $totalLimpiados++;
        }

        Log::info('LimpiarCarritosExpiradosAction — Carritos expirados limpiados', [
            'cantidad_items' => $totalLimpiados,
        ]);

        return $totalLimpiados;
    }
}
