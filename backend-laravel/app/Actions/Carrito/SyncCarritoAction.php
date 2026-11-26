<?php

declare(strict_types=1);

namespace App\Actions\Carrito;

use App\Exceptions\Domain\StockInsuficienteException;
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
                // Bloqueo pesimista sobre el usuario y su carrito para serializar clics concurrentes (+/-)
                Usuario::where('id', $usuario->id)->lockForUpdate()->first();

                // 1. Obtener las cantidades actualmente reservadas por el carrito.
                $oldItems = [];
                foreach (Carrito::where('usuario_id', $usuario->id)->lockForUpdate()->get() as $old) {
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

                // 3. Ajustar el catálogo atómicamente (sin consulta previa redundante para cuidar cuota de BD).
                $allProductIds = array_values(array_unique(array_merge(
                    array_keys($oldItems),
                    array_keys($newItems)
                )));

                Log::info('[SYNC_CARRITO] Diff calculado entre carrito en BD y carrito recibido', [
                    'usuario_id' => $usuario->id,
                    'old_items_bd' => $oldItems,
                    'new_items_req' => $newItems,
                    'productos_evaluados' => $allProductIds,
                ]);

                foreach ($allProductIds as $productoId) {
                    $antes = $oldItems[$productoId] ?? 0;
                    $despues = $newItems[$productoId] ?? 0;
                    $diff = $despues - $antes;
                    if ($diff === 0) {
                        continue;
                    }

                    $deltaCatalogo = -$diff;
                    Log::info('[SYNC_CARRITO] Aplicando ajuste de stock por producto', [
                        'usuario_id' => $usuario->id,
                        'producto_id' => $productoId,
                        'cantidad_antes_bd' => $antes,
                        'cantidad_nueva_req' => $despues,
                        'delta_catalogo' => $deltaCatalogo,
                    ]);

                    if (! $this->catalogo->ajustarStockProducto($productoId, $deltaCatalogo)) {
                        if ($diff > 0) {
                            $catalogoActual = $this->catalogo->getProducto($productoId, true);
                            throw StockInsuficienteException::paraReserva(
                                (string) ($catalogoActual['name'] ?? "Producto #{$productoId}"),
                                (int) ($catalogoActual['stock'] ?? 0)
                            );
                        }

                        throw new RuntimeException(
                            "No se pudo sincronizar el stock del producto {$productoId} con el catálogo"
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
            // En producción/desarrollo el catálogo es un servicio externo fuera de nuestra DB::transaction,
            // por lo que debemos compensar manualmente los ajustes ya aplicados al catálogo.
            // En testing la tabla `productos` vive dentro de la misma transacción SQL y ya fue revertida.
            if (! app()->environment('testing')) {
                foreach (array_reverse($ajustesAplicados) as $ajuste) {
                    Log::warning('[SYNC_CARRITO] Compensando ajuste en catálogo tras fallo de sincronización', [
                        'usuario_id' => $usuario->id,
                        'producto_id' => $ajuste['producto_id'],
                        'delta_compensacion' => -$ajuste['delta'],
                    ]);
                    $this->catalogo->ajustarStockProducto(
                        $ajuste['producto_id'],
                        -$ajuste['delta']
                    );
                }
            }

            throw $e;
        }
    }
}
