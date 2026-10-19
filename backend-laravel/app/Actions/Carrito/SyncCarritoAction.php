<?php

declare(strict_types=1);

namespace App\Actions\Carrito;

use App\Exceptions\Domain\StockInsuficienteException;
use App\Models\Carrito;
use App\Models\Producto;
use App\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class SyncCarritoAction
{
    public function __construct(
        private readonly LimpiarCarritosExpiradosAction $limpiarExpiradosAction
    ) {}

    /**
     * Sincroniza el carrito de un usuario autenticado con control estricto de concurrencia y stock.
     *
     * @param  array<int, array<string, mixed>>  $itemsInput
     */
    public function execute(Usuario $usuario, array $itemsInput): void
    {
        DB::transaction(function () use ($usuario, $itemsInput) {
            // 0. Limpiar carritos expirados globalmente antes de la sincronización
            $this->limpiarExpiradosAction->execute();

            // 1. Obtener carrito actual del usuario en la base de datos
            $oldCarritos = Carrito::where('usuario_id', $usuario->id)->get();
            $oldItems = [];
            foreach ($oldCarritos as $old) {
                $pid = (int) $old->producto_id;
                $oldItems[$pid] = ($oldItems[$pid] ?? 0) + (int) $old->cantidad;
            }

            // 2. Procesar y agrupar nuevos items recibidos
            $newItems = [];
            foreach ($itemsInput as $item) {
                $productoId = (int) ($item['producto_id'] ?? 0);
                $cantidad = max(0, (int) ($item['cantidad'] ?? 0));
                if ($productoId > 0 && $cantidad > 0) {
                    $newItems[$productoId] = ($newItems[$productoId] ?? 0) + $cantidad;
                }
            }

            // 3. Calcular diferencias y ajustar stock con bloqueo pesimista
            /** @var list<int> $allProductIds */
            $allProductIds = array_values(array_unique(array_merge(array_keys($oldItems), array_keys($newItems))));

            foreach ($allProductIds as $prodId) {
                $oldQty = $oldItems[$prodId] ?? 0;
                $newQty = $newItems[$prodId] ?? 0;
                $diff = $newQty - $oldQty;

                if ($diff === 0) {
                    continue;
                }

                /** @var Producto|null $prod */
                $prod = Producto::where('id', $prodId)->lockForUpdate()->first();

                if (! $prod) {
                    continue;
                }

                if ($prod->controlar_stock) {
                    if ($diff > 0) {
                        if ($prod->stock < $diff) {
                            throw StockInsuficienteException::paraReserva($prod->nombre, $prod->stock);
                        }
                        $prod->decrement('stock', $diff);
                    } else {
                        $prod->increment('stock', abs($diff));
                    }
                }
            }

            // 4. Eliminar el carrito anterior del usuario
            Carrito::where('usuario_id', $usuario->id)->delete();

            // 5. Insertar los items actuales
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
        });
    }
}
