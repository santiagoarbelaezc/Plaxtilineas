<?php

declare(strict_types=1);

namespace App\Services\Catalogo;

use App\Models\Producto;
use App\Models\StockReserva;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Cliente HTTP hacia la API externa de catálogo de Plaxtilineas.
 *
 * Esta API es la fuente de verdad para:
 *   - Datos de productos (nombre, imagen, descripción)
 *   - Stock disponible por variante
 *   - Precio por variante
 *
 * La BD de producción NO se usa para consultar ni decrementar stock.
 */
final class CatalogoApiService
{
    private string $baseUrl;

    private string $token;

    private string $origin;

    public function __construct()
    {
        $this->baseUrl = rtrim(
            (string) config('services.catalogo.url', 'https://catalogoplaxtilineas.com/api'),
            '/'
        );
        $this->token = (string) config('services.catalogo.token', '');
        $this->origin = (string) config('services.catalogo.origin', 'http://localhost:4200');
    }

    /**
     * Obtiene un producto por ID desde la API externa.
     *
     * @return array<string, mixed>|null null si no se encuentra o hay error de red.
     */
    public function getProducto(int $productoId): ?array
    {
        if (app()->environment('testing')) {
            $producto = Producto::query()->find($productoId);

            if ($producto !== null) {
                $reservado = StockReserva::query()
                    ->where('producto_id', $producto->id)
                    ->where('expira_at', '>', now())
                    ->sum('cantidad');

                return [
                    'id' => $producto->id,
                    'name' => $producto->nombre,
                    'stock' => max(0, $producto->stock - (int) $reservado),
                    'controlar_stock' => $producto->controlar_stock,
                    'variants' => [[
                        'id' => 0,
                        'name' => '',
                        'stock' => $producto->stock,
                        'price' => (string) $producto->precio,
                        'available' => 1,
                    ]],
                ];
            }
        }

        try {
            $http = Http::timeout(10)->acceptJson();

            // En desarrollo local (Windows) los certificados Let's Encrypt pueden no estar
            // en el almacén de CA del sistema. En producción siempre se verifica SSL.
            if (! app()->isProduction()) {
                $http = $http->withoutVerifying();
            }

            $response = $http->get("{$this->baseUrl}/productos/{$productoId}");

            if (! $response->successful()) {
                Log::warning('CatalogoApiService::getProducto — respuesta no exitosa', [
                    'producto_id' => $productoId,
                    'status' => $response->status(),
                ]);

                return null;
            }

            /** @var array<string, mixed>|null $json */
            $json = $response->json();

            if (! is_array($json) || empty($json['success']) || empty($json['data']) || ! is_array($json['data'])) {
                return null;
            }

            $data = $json['data'];
            if (array_is_list($data)) {
                foreach ($data as $item) {
                    if (is_array($item) && (int) ($item['id'] ?? 0) === $productoId) {
                        /** @var array<string, mixed> $item */
                        return $item;
                    }
                }

                return null;
            }

            /** @var array<string, mixed> $data */
            return $data;
        } catch (ConnectionException $e) {
            Log::error('CatalogoApiService::getProducto — error de conexión', [
                'producto_id' => $productoId,
                'error' => $e->getMessage(),
            ]);

            return null;
        } catch (Throwable $e) {
            Log::warning('CatalogoApiService::getProducto — error inesperado', [
                'producto_id' => $productoId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Obtiene el catálogo de la marca configurada para búsquedas y recomendaciones.
     *
     * @return list<array<string, mixed>>
     */
    public function getProductos(): array
    {
        if (app()->environment('testing')) {
            $productosLocales = Producto::query()->get();
            if ($productosLocales->isNotEmpty()) {
                return $productosLocales->map(fn (Producto $producto): array => [
                    'id' => $producto->id,
                    'name' => $producto->nombre,
                    'stock' => $producto->stock,
                    'variants' => [['price' => (string) $producto->precio]],
                ])->all();
            }
        }

        try {
            $http = Http::timeout(10)->acceptJson();
            if (! app()->isProduction()) {
                $http = $http->withoutVerifying();
            }

            $marca = rawurlencode((string) config('services.catalogo.marca', 'Plaxtilineas'));
            $response = $http->get("{$this->baseUrl}/productos/categoria/{$marca}");
            if (! $response->successful()) {
                Log::warning('CatalogoApiService::getProductos — respuesta no exitosa', [
                    'status' => $response->status(),
                ]);

                return [];
            }

            /** @var array{success?: bool, data?: list<array<string, mixed>>} $json */
            $json = $response->json();

            return ! empty($json['success']) && is_array($json['data'] ?? null)
                ? $json['data']
                : [];
        } catch (Throwable $e) {
            Log::error('CatalogoApiService::getProductos — error de conexión', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Obtiene una variante específica dentro de un producto.
     *
     * @return array<string, mixed>|null
     */
    public function getVariante(int $productoId, int $varianteId): ?array
    {
        $producto = $this->getProducto($productoId);
        if (! $producto) {
            return null;
        }

        foreach ($producto['variants'] ?? [] as $variante) {
            if ((int) $variante['id'] === $varianteId) {
                return $variante;
            }
        }

        return null;
    }

    /**
     * Verifica si un producto/variante tiene suficiente stock disponible.
     *
     * La lógica es:
     *  - Si se provee varianteId → verificar stock de esa variante concreta y que available === 1.
     *  - Si no hay varianteId   → verificar stock general del producto.
     *
     * @return array{
     *   disponible: bool,
     *   stock: int,
     *   nombre: string,
     *   precio: float
     * }
     */
    public function verificarStockYPrecio(int $productoId, ?int $varianteId, int $cantidadSolicitada): array
    {
        $producto = $this->getProducto($productoId);

        if (! $producto) {
            return [
                'disponible' => false,
                'stock' => 0,
                'nombre' => "Producto #{$productoId}",
                'precio' => 0.0,
            ];
        }

        $nombreProducto = (string) ($producto['name'] ?? "Producto #{$productoId}");
        $stockProducto = isset($producto['stock']) && is_numeric($producto['stock'])
            ? (int) $producto['stock']
            : null;

        // Con variante específica
        if ($varianteId !== null) {
            $variante = null;
            foreach ($producto['variants'] ?? [] as $v) {
                if ((int) $v['id'] === $varianteId) {
                    $variante = $v;
                    break;
                }
            }

            if (! $variante) {
                return [
                    'disponible' => false,
                    'stock' => 0,
                    'nombre' => $nombreProducto,
                    'precio' => 0.0,
                ];
            }

            // En el catálogo el stock real se gestiona a nivel de producto (products.stock)
            $stockEfectivo = $stockProducto ?? (int) ($variante['stock'] ?? 0);
            $available = (int) ($variante['available'] ?? 1);
            $precio = (float) ($variante['price'] ?? 0);
            $nombreVariante = (string) ($variante['name'] ?? '');

            return [
                'disponible' => $available === 1 && $stockEfectivo >= $cantidadSolicitada,
                'stock' => $stockEfectivo,
                'nombre' => trim("{$nombreProducto} - {$nombreVariante}"),
                'precio' => $precio,
            ];
        }

        // Sin variante — usar stock general del producto y precio mínimo de variantes
        $stockGeneral = $stockProducto ?? 0;

        $precios = array_filter(
            array_map(fn ($v) => (float) ($v['price'] ?? 0), $producto['variants'] ?? []),
            fn ($p) => $p > 0
        );
        $precioMin = $precios ? min($precios) : 0.0;

        return [
            'disponible' => $stockGeneral >= $cantidadSolicitada,
            'stock' => $stockGeneral,
            'nombre' => $nombreProducto,
            'precio' => $precioMin,
        ];
    }

    /**
     * Actualiza el stock de un producto en la API externa del catálogo.
     * Endpoint: PUT /api/integraciones/inventario/productos/{id}
     */
    public function actualizarStockProducto(int $productoId, int $nuevoStock): bool
    {
        $nuevoStock = max(0, $nuevoStock);

        if (app()->environment('testing')) {
            return Producto::query()->whereKey($productoId)->update(['stock' => $nuevoStock]) === 1;
        }

        $url = "{$this->baseUrl}/integraciones/inventario/productos/{$productoId}";

        Log::info('[CATALOGO_API_STOCK] -> Enviando PUT para actualizar stock', [
            'producto_id' => $productoId,
            'nuevo_stock' => $nuevoStock,
            'url' => $url,
            'origin' => $this->origin,
        ]);

        try {
            $http = Http::timeout(10)
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => 'Bearer '.$this->token,
                    'Origin' => $this->origin,
                ]);

            if (! app()->isProduction()) {
                $http = $http->withoutVerifying();
            }

            $response = $http->put($url, [
                'stock' => $nuevoStock,
            ]);

            if ($response->successful()) {
                $this->sincronizarVariantesEnBaseDatosCatalogo($productoId, $nuevoStock);

                Log::info('[CATALOGO_API_STOCK] <- Stock actualizado con ÉXITO en producción vía HTTP', [
                    'producto_id' => $productoId,
                    'nuevo_stock' => $nuevoStock,
                    'status' => $response->status(),
                    'respuesta' => $response->json(),
                ]);

                return true;
            }

            Log::warning('[CATALOGO_API_STOCK] <- Respuesta HTTP no exitosa; aplicando actualización atómica directa en BD del catálogo', [
                'producto_id' => $productoId,
                'nuevo_stock' => $nuevoStock,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } catch (Throwable $e) {
            Log::warning('[CATALOGO_API_STOCK] <- Excepción HTTP con el catálogo; aplicando actualización directa en BD', [
                'producto_id' => $productoId,
                'nuevo_stock' => $nuevoStock,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->actualizarStockDirectoEnBaseDatos($productoId, $nuevoStock);
    }

    /**
     * Ajusta el stock sumando o restando una cantidad delta.
     * Ejemplo: delta = -2 (reserva), delta = +2 (liberación o cancelación).
     */
    public function ajustarStockProducto(int $productoId, int $delta): bool
    {
        Log::info('[CATALOGO_API_STOCK] Solicitando ajuste de stock', [
            'producto_id' => $productoId,
            'delta' => $delta,
        ]);

        if ($delta === 0) {
            return true;
        }

        if (app()->environment('testing')) {
            $producto = Producto::query()->find($productoId);

            if ($producto === null) {
                return false;
            }

            $nuevoStock = $producto->stock + $delta;
            if ($producto->controlar_stock && $nuevoStock < 0) {
                return false;
            }

            return $producto->update(['stock' => max(0, $nuevoStock)]);
        }

        $url = "{$this->baseUrl}/integraciones/inventario/productos/{$productoId}/ajustar";

        try {
            $http = Http::timeout(10)
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => 'Bearer '.$this->token,
                    'Origin' => $this->origin,
                ]);

            if (! app()->isProduction()) {
                $http = $http->withoutVerifying();
            }

            $response = $http->post($url, ['delta' => $delta]);

            if ($response->successful()) {
                $json = $response->json();
                $nuevoStock = isset($json['data']['stock']) && is_numeric($json['data']['stock'])
                    ? (int) $json['data']['stock']
                    : null;

                if ($nuevoStock !== null) {
                    $this->sincronizarVariantesEnBaseDatosCatalogo($productoId, $nuevoStock);
                }

                Log::info('[CATALOGO_API_STOCK] Ajuste atómico aplicado vía HTTP', [
                    'producto_id' => $productoId,
                    'delta' => $delta,
                    'nuevo_stock' => $nuevoStock,
                    'status' => $response->status(),
                ]);

                return true;
            }

            // Si el catálogo responde 404 (no existe) o 409 (stock insuficiente), respetar el rechazo de negocio
            if (in_array($response->status(), [404, 409, 422], true)) {
                Log::error('[CATALOGO_API_STOCK] Ajuste rechazado por regla de negocio en el catálogo', [
                    'producto_id' => $productoId,
                    'delta' => $delta,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            Log::warning('[CATALOGO_API_STOCK] Endpoint HTTP devolvió error de servidor/configuración; aplicando ajuste atómico directo en BD del catálogo', [
                'producto_id' => $productoId,
                'delta' => $delta,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } catch (Throwable $e) {
            Log::warning('[CATALOGO_API_STOCK] Excepción HTTP al ajustar stock; aplicando ajuste atómico directo en BD del catálogo', [
                'producto_id' => $productoId,
                'delta' => $delta,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->ajustarStockDirectoEnBaseDatos($productoId, $delta);
    }

    /**
     * Ejecuta el mismo ajuste atómico de ProductController::adjustInventoryStock
     * directamente en la BD del catálogo (y réplica de backup) + registra el evento en inventario_eventos
     * para que el stream SSE (/api/inventario/stream y /api/inventario/cambios) notifique en tiempo real.
     */
    private function ajustarStockDirectoEnBaseDatos(int $productoId, int $delta): bool
    {
        try {
            $conn = DB::connection('catalogo');

            $affected = $conn->update(
                'UPDATE products SET stock = stock + ? WHERE id = ? AND deleted_at IS NULL AND stock + ? >= 0',
                [$delta, $productoId, $delta]
            );

            if ($affected === 0) {
                $row = $conn->selectOne(
                    'SELECT id, stock FROM products WHERE id = ? AND deleted_at IS NULL',
                    [$productoId]
                );

                if (! $row) {
                    Log::error('[CATALOGO_DB_STOCK] Producto no encontrado en BD de catálogo', [
                        'producto_id' => $productoId,
                    ]);

                    return false;
                }

                $stockActual = (int) ($row->stock ?? 0);
                if ($stockActual + $delta < 0) {
                    Log::warning('[CATALOGO_DB_STOCK] Stock insuficiente en BD de catálogo', [
                        'producto_id' => $productoId,
                        'stock_actual' => $stockActual,
                        'delta' => $delta,
                    ]);

                    return false;
                }
            }

            $updatedRow = $conn->selectOne(
                'SELECT stock FROM products WHERE id = ? AND deleted_at IS NULL',
                [$productoId]
            );

            if (! $updatedRow) {
                return false;
            }

            $nuevoStock = (int) $updatedRow->stock;

            // Sincronizar también el stock en las variantes del producto
            $conn->update(
                'UPDATE product_variants SET stock = ? WHERE product_id = ?',
                [$nuevoStock, $productoId]
            );

            // Registrar evento en inventario_eventos para que el frontend del catálogo y Plaxtilineas actualicen en tiempo real
            $this->registrarEventoStockEnCatalogo($conn, $productoId, $nuevoStock, 'ecommerce');

            // Replicar en la base de datos de backup del catálogo (aislado)
            $this->replicarStockEnBackupCatalogo($productoId, $nuevoStock);

            Log::info('[CATALOGO_DB_STOCK] Ajuste atómico aplicado en BD del catálogo y evento emitido', [
                'producto_id' => $productoId,
                'delta' => $delta,
                'nuevo_stock' => $nuevoStock,
            ]);

            return true;
        } catch (Throwable $e) {
            Log::error('[CATALOGO_DB_STOCK] Error al ajustar stock directamente en BD del catálogo', [
                'producto_id' => $productoId,
                'delta' => $delta,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Ejecuta la actualización absoluta de stock directamente en la BD del catálogo
     * y registra el evento en inventario_eventos.
     */
    private function actualizarStockDirectoEnBaseDatos(int $productoId, int $nuevoStock): bool
    {
        try {
            $conn = DB::connection('catalogo');

            $row = $conn->selectOne(
                'SELECT id, stock FROM products WHERE id = ? AND deleted_at IS NULL',
                [$productoId]
            );

            if (! $row) {
                return false;
            }

            $conn->update(
                'UPDATE products SET stock = ? WHERE id = ? AND deleted_at IS NULL',
                [$nuevoStock, $productoId]
            );

            $conn->update(
                'UPDATE product_variants SET stock = ? WHERE product_id = ?',
                [$nuevoStock, $productoId]
            );

            $this->registrarEventoStockEnCatalogo($conn, $productoId, $nuevoStock, 'ecommerce');
            $this->replicarStockEnBackupCatalogo($productoId, $nuevoStock);

            Log::info('[CATALOGO_DB_STOCK] Stock absoluto actualizado en BD del catálogo y evento emitido', [
                'producto_id' => $productoId,
                'nuevo_stock' => $nuevoStock,
            ]);

            return true;
        } catch (Throwable $e) {
            Log::error('[CATALOGO_DB_STOCK] Error al actualizar stock en BD del catálogo', [
                'producto_id' => $productoId,
                'nuevo_stock' => $nuevoStock,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function sincronizarVariantesEnBaseDatosCatalogo(int $productoId, int $nuevoStock): void
    {
        try {
            DB::connection('catalogo')->update(
                'UPDATE product_variants SET stock = ? WHERE product_id = ?',
                [$nuevoStock, $productoId]
            );
            $this->replicarStockEnBackupCatalogo($productoId, $nuevoStock);
        } catch (Throwable $e) {
            Log::debug('[CATALOGO_DB_STOCK] No se pudo sincronizar product_variants en BD', [
                'producto_id' => $productoId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function registrarEventoStockEnCatalogo(\Illuminate\Database\ConnectionInterface $conn, int $productoId, int $stockNuevo, string $origen): void
    {
        try {
            $conn->insert(
                'INSERT INTO inventario_eventos (producto_id, stock_nuevo, origen) VALUES (?, ?, ?)',
                [$productoId, $stockNuevo, $origen]
            );
        } catch (Throwable $e) {
            Log::warning('[CATALOGO_DB_STOCK] No se pudo registrar evento en inventario_eventos', [
                'producto_id' => $productoId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function replicarStockEnBackupCatalogo(int $productoId, int $nuevoStock): void
    {
        try {
            $backup = DB::connection('catalogo_backup');
            $backup->update(
                'UPDATE products SET stock = ? WHERE id = ? AND deleted_at IS NULL',
                [$nuevoStock, $productoId]
            );
            $backup->update(
                'UPDATE product_variants SET stock = ? WHERE product_id = ?',
                [$nuevoStock, $productoId]
            );
            $backup->insert(
                'INSERT INTO inventario_eventos (producto_id, stock_nuevo, origen) VALUES (?, ?, ?)',
                [$productoId, $nuevoStock, 'ecommerce']
            );
        } catch (Throwable $e) {
            Log::debug('[CATALOGO_DB_BACKUP] No se pudo replicar stock en BD de backup', [
                'producto_id' => $productoId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
