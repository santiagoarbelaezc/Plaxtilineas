<?php

declare(strict_types=1);

namespace App\Services\Catalogo;

use App\Models\Producto;
use App\Models\StockReserva;
use Illuminate\Http\Client\ConnectionException;
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

            $stockVariante = (int) ($variante['stock'] ?? 0);
            $available = (int) ($variante['available'] ?? 1);
            $precio = (float) ($variante['price'] ?? 0);
            $nombreVariante = (string) ($variante['name'] ?? '');

            return [
                'disponible' => $available === 1 && $stockVariante >= $cantidadSolicitada,
                'stock' => $stockVariante,
                'nombre' => trim("{$nombreProducto} - {$nombreVariante}"),
                'precio' => $precio,
            ];
        }

        // Sin variante — usar stock general del producto y precio mínimo de variantes
        $stockProducto = (int) ($producto['stock'] ?? 0);

        $precios = array_filter(
            array_map(fn ($v) => (float) ($v['price'] ?? 0), $producto['variants'] ?? []),
            fn ($p) => $p > 0
        );
        $precioMin = $precios ? min($precios) : 0.0;

        return [
            'disponible' => $stockProducto >= $cantidadSolicitada,
            'stock' => $stockProducto,
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

            if (! $response->successful()) {
                Log::error('[CATALOGO_API_STOCK] <- Error en respuesta del catálogo', [
                    'producto_id' => $productoId,
                    'nuevo_stock' => $nuevoStock,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            Log::info('[CATALOGO_API_STOCK] <- Stock actualizado con ÉXITO en producción', [
                'producto_id' => $productoId,
                'nuevo_stock' => $nuevoStock,
                'status' => $response->status(),
                'respuesta' => $response->json(),
            ]);

            return true;
        } catch (Throwable $e) {
            Log::error('[CATALOGO_API_STOCK] <- Excepción al conectar con el catálogo', [
                'producto_id' => $productoId,
                'nuevo_stock' => $nuevoStock,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
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

            if (! $response->successful()) {
                Log::error('[CATALOGO_API_STOCK] Ajuste rechazado por el catálogo', [
                    'producto_id' => $productoId,
                    'delta' => $delta,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            Log::info('[CATALOGO_API_STOCK] Ajuste atómico aplicado', [
                'producto_id' => $productoId,
                'delta' => $delta,
                'status' => $response->status(),
            ]);

            return true;
        } catch (Throwable $e) {
            Log::error('[CATALOGO_API_STOCK] Excepción al ajustar stock', [
                'producto_id' => $productoId,
                'delta' => $delta,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
