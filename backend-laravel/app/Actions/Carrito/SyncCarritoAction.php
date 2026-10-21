<?php

declare(strict_types=1);

namespace App\Actions\Carrito;

use App\Models\Carrito;
use App\Models\Usuario;
use App\Services\Catalogo\CatalogoApiService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class SyncCarritoAction
{
    public function __construct(
        private readonly LimpiarCarritosExpiradosAction $limpiarExpiradosAction,
        private readonly CatalogoApiService $catalogo
    ) {}

    /**
     * Sincroniza el carrito y reserva/libera inmediatamente la diferencia de stock.
     *
     * @param  array<int, array<string, mixed>>  $itemsInput
     */
    public function execute(Usuario $usuario, array $itemsInput): void
    {
        Log::info('[SYNC_CARRITO] Iniciando sincronización de carrito para usuario', [
            'usuario_id' => $usuario->id,
            'items_recibidos' => count($itemsInput),
            'items' => $itemsInput,
        ]);

        $this->limpiarExpiradosAction->execute();
        $ajustesAplicados = [];

        try {
            DB::transaction(function () use ($usuario, $itemsInput, &$ajustesAplicados) {
                // 1. Obtener las cantidades actualmente reservadas por el carrito.
                $oldItems = [];
                foreach (Carrito::where('usuario_id', $usuario->id)->get() as $old) {
                    $productoId = (int) $old->producto_id;
                    $oldItems[$productoId] = ($oldItems[$productoId] ?? 0) + (int) $old->cantidad;
                }

                // 2. Procesar y agrupar nuevos items recibidos.
                $newItems = [];
                foreach ($itemsInput as $item) {
                    $productoId = (int) ($item['producto_id'] ?? 0);
                    $cantidad = max(0, (int) ($item['cantidad'] ?? 0));
                    if ($productoId > 0 && $cantidad > 0) {
                        $newItems[$productoId] = ($newItems[$productoId] ?? 0) + $cantidad;
                    }
                }

                // 3. Ajustar el catálogo antes de confirmar el nuevo carrito.
                $allProductIds = array_values(array_unique(array_merge(
                    array_keys($oldItems),
                    array_keys($newItems)
                )));

                foreach ($allProductIds as $productoId) {
                    $diff = ($newItems[$productoId] ?? 0) - ($oldItems[$productoId] ?? 0);
                    if ($diff === 0) {
                        continue;
                    }

                    $deltaCatalogo = -$diff;
                    if (! $this->catalogo->ajustarStockProducto($productoId, $deltaCatalogo)) {
                        throw new RuntimeException(
                            "No se pudo actualizar el stock del producto {$productoId} en el catálogo"
                        );
                    }

                    $ajustesAplicados[] = [
                        'producto_id' => $productoId,
                        'delta' => $deltaCatalogo,
                    ];
                }

                // 4. Persistir el carrito solo después de ajustar el catálogo.
                Carrito::where('usuario_id', $usuario->id)->delete();

                // 5. Insertar los items actuales.
                foreach ($itemsInput as $item) {
                    $productoId = (int) ($item['producto_id'] ?? 0);
                    $varianteId = ! empty($item['variante_id']) ? (int) $item['variante_id'] : null;
                    $cantidad = max(1, (int) ($item['cantidad'] ?? 1));
                    $precioUnitario = (float) ($item['precio_unitario'] ?? 0);

                    if ($productoId > 0) {
                        Carrito::create([
                            'usuario_id' => $usuario->id,
                            'producto_id' => $productoId,
                            'variante_id' => $varianteId,
                            'cantidad' => $cantidad,
                            'precio_unitario' => $precioUnitario,
                        ]);
                    }
                }

                Log::info('[SYNC_CARRITO] Sincronización de carrito finalizada con éxito');
            });
        } catch (\Throwable $e) {
            foreach (array_reverse($ajustesAplicados) as $ajuste) {
                $this->catalogo->ajustarStockProducto(
                    $ajuste['producto_id'],
                    -$ajuste['delta']
                );
            }

            throw $e;
        }
    }
}
