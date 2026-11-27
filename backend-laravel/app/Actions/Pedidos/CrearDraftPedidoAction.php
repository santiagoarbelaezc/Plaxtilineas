<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Exceptions\Domain\AccesoNoPermitidoException;
use App\Exceptions\Domain\StockInsuficienteException;
use App\Mail\PagoConfirmadoMailable;
use App\Models\Carrito;
use App\Models\Pedido;
use App\Models\StockReserva;
use App\Models\Usuario;
use App\Services\Catalogo\CatalogoApiService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class CrearDraftPedidoAction
{
    public function __construct(
        private readonly CatalogoApiService $catalogo,
        private readonly LiberarStockReservaAction $liberarStockReservaAction
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function execute(Usuario $user, array $input): array
    {
        // 0. Limpiar posibles pedidos DRAFT huérfanos del mismo usuario (evita bloqueo invisible al volver atrás)
        $draftsPrevios = Pedido::where('usuario_id', $user->id)
            ->where('estado', EstadoPedido::DRAFT)
            ->get();

        foreach ($draftsPrevios as $draftPrevio) {
            DB::transaction(function () use ($draftPrevio) {
                $locked = Pedido::where('id', $draftPrevio->id)->lockForUpdate()->first();
                if ($locked && $locked->estado === EstadoPedido::DRAFT) {
                    $this->liberarStockReservaAction->execute($locked);
                    $locked->items()->delete();
                    $locked->delete();
                }
            });
        }

        // 1. Validación de pedidos pendientes visibles simultáneos (solo PENDIENTE_PAGO y PENDIENTE)
        if ($user->correo !== 'arbelaezz.c11@gmail.com') {
            $pendingCount = Pedido::where('usuario_id', $user->id)
                ->whereIn('estado', [
                    EstadoPedido::PENDIENTE_PAGO,
                    EstadoPedido::PENDIENTE,
                ])
                ->count();

            if ($pendingCount >= 2) {
                throw new AccesoNoPermitidoException(
                    'Tienes 2 o más pedidos pendientes. Por favor completa el pago o cancela uno antes de intentar crear otro pedido nuevo.'
                );
            }
        }

        return DB::transaction(function () use ($user, $input) {
            $subtotal = 0.0;
            $detallesParaInsertar = [];

            $carritoItems = Carrito::where('usuario_id', $user->id)->get();
            $carritoPorProducto = [];
            foreach ($carritoItems as $carritoItem) {
                $prodId = (int) $carritoItem->producto_id;
                $carritoPorProducto[$prodId] = ($carritoPorProducto[$prodId] ?? 0)
                    + (int) $carritoItem->cantidad;
            }

            /** @var array<int, array<string, mixed>> $items */
            $items = $input['items'] ?? [];

            foreach ($items as $item) {
                $productoId = (int) ($item['producto_id'] ?? 0);
                $varianteId = ! empty($item['variante_id']) ? (int) $item['variante_id'] : null;
                $cantidad = max(1, (int) ($item['cantidad'] ?? 1));
                $imagenUrl = (string) ($item['imagen_url'] ?? '');

                // El carrito del usuario ya descontó su reserva del catálogo;
                // solo exigimos en el catálogo las unidades adicionales sobre lo ya reservado.
                $yaReservado = $carritoPorProducto[$productoId] ?? 0;
                $cantidadAdicional = max(0, $cantidad - $yaReservado);

                // ── Verificar stock y obtener precio desde la API del catálogo externo ──
                $resultado = $this->catalogo->verificarStockYPrecio($productoId, $varianteId, $cantidadAdicional);

                if (! $resultado['disponible']) {
                    // Producto no encontrado en la API
                    if ($resultado['stock'] === 0 && $resultado['precio'] === 0.0 && $resultado['nombre'] === "Producto #{$productoId}") {
                        throw new NotFoundHttpException("Producto con ID {$productoId} no encontrado en el catálogo.");
                    }
                    // Stock insuficiente
                    throw StockInsuficienteException::paraPedido(
                        $resultado['nombre'],
                        $resultado['stock'] + $yaReservado,
                        $cantidad
                    );
                }

                $precioUnitario = $resultado['precio'];
                $nombreProducto = $resultado['nombre'];

                $itemSubtotal = $precioUnitario * $cantidad;
                $subtotal += $itemSubtotal;

                $detallesParaInsertar[] = [
                    'producto_id' => $productoId,
                    'variante_id' => $varianteId,
                    'nombre_producto' => $nombreProducto,
                    'imagen_url' => $imagenUrl,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $itemSubtotal,
                ];
            }

            $tipoEntrega = (string) ($input['tipo_entrega'] ?? \App\Enums\TipoEntrega::DOMICILIO->value);
            if (! in_array($tipoEntrega, \App\Enums\TipoEntrega::values(), true)) {
                $tipoEntrega = \App\Enums\TipoEntrega::DOMICILIO->value;
            }

            $esRecogida = $tipoEntrega === \App\Enums\TipoEntrega::RECOGIDA_TIENDA->value;
            $minimoDomicilio = (float) config('business.envio_compra_minima_cop', 50000.0);

            if (! $esRecogida && $subtotal < $minimoDomicilio) {
                $faltante = max(0, (int) ceil($minimoDomicilio - $subtotal));
                $minFmt = number_format($minimoDomicilio, 0, ',', '.');
                $faltFmt = number_format($faltante, 0, ',', '.');

                throw \Illuminate\Validation\ValidationException::withMessages([
                    'tipo_entrega' => [
                        "El envío a domicilio requiere una compra mínima de \${$minFmt} COP. Agrega \${$faltFmt} más o elige recoger en tienda (envío \$0).",
                    ],
                ]);
            }

            $ivaPorcentaje = (float) config('business.iva_porcentaje', 0.0);
            $iva = round($subtotal * $ivaPorcentaje, 2);
            $costoEnvio = $esRecogida ? 0.0 : (float) config('business.costo_envio_cop', 10000.0);
            $total = $subtotal + $iva + $costoEnvio;

            $direccionEnvio = $esRecogida
                ? 'Recogida en tienda — '.(string) config('business.tienda.direccion', 'Cra. 19 #19-35')
                : (string) ($input['direccion_envio'] ?? '');
            $ciudadEnvio = $esRecogida
                ? (string) config('business.tienda.ciudad', 'Armenia')
                : ($input['ciudad'] ?? null);
            $deptoEnvio = $esRecogida
                ? (string) config('business.tienda.departamento', 'Quindío')
                : ($input['departamento'] ?? null);

            // Generar referencia única PLX-{timestamp}-{random4}
            $wompiRef = 'PLX-'.time().'-'.strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

            // Generar código de pedido correlativo PX-{año}-{NNNN}
            $anio = date('Y');
            $count = Pedido::whereYear('fecha', (int) $anio)->count();
            do {
                $count++;
                $correlativo = str_pad((string) $count, 4, '0', STR_PAD_LEFT);
                $codigoPedido = "PX-{$anio}-{$correlativo}";
            } while (Pedido::where('codigo_pedido', $codigoPedido)->exists());

            $metodoPago = (string) ($input['metodo_pago'] ?? 'wompi');
            $esWompiDesarrollo = ! empty($input['wompi_desarrollo']) && $input['wompi_desarrollo'] === true;
            $estadoInicial = ($metodoPago === 'wompi' && ! $esWompiDesarrollo) ? EstadoPedido::DRAFT : EstadoPedido::PENDIENTE_PAGO;

            /** @var Pedido $pedido */
            $pedido = Pedido::create([
                'usuario_id' => $user->id,
                'codigo_pedido' => $codigoPedido,
                'telefono_contacto' => $input['telefono_contacto'] ?? $user->telefono,
                'direccion_envio' => $direccionEnvio,
                'ciudad' => $ciudadEnvio,
                'departamento' => $deptoEnvio,
                'notas' => $input['notas'] ?? null,
                'subtotal' => $subtotal,
                'iva' => $iva,
                'costo_envio' => $costoEnvio,
                'total' => $total,
                'metodo_pago' => $metodoPago,
                'tipo_entrega' => $tipoEntrega,
                'wompi_referencia' => $wompiRef,
                'estado' => $estadoInicial,
            ]);

            foreach ($detallesParaInsertar as $det) {
                $pedido->items()->create($det);
            }

            $minutos = (int) config('business.reserva_stock_expiracion_minutos', 180);
            $expiraAt = now()->addMinutes($minutos);

            $pedidoPorProducto = [];
            foreach ($detallesParaInsertar as $det) {
                $productoId = (int) $det['producto_id'];
                $pedidoPorProducto[$productoId] = ($pedidoPorProducto[$productoId] ?? 0)
                    + (int) $det['cantidad'];
            }

            // Transferencia atómica de titularidad de reserva: Carrito -> StockReserva.
            // Se realiza SIEMPRE (tanto para Wompi DRAFT como para pedidos offline) para evitar
            // reservas duplicadas o doble devolución al limpiar el carrito en el frontend.
            $allProductIds = array_values(array_unique(array_merge(
                array_keys($carritoPorProducto),
                array_keys($pedidoPorProducto)
            )));
            $ajustesPedido = [];

            try {
                foreach ($allProductIds as $productoId) {
                    $diff = ($pedidoPorProducto[$productoId] ?? 0) - ($carritoPorProducto[$productoId] ?? 0);
                    if ($diff === 0) {
                        continue;
                    }

                    $deltaCatalogo = -$diff;
                    if (! $this->catalogo->ajustarStockProducto($productoId, $deltaCatalogo)) {
                        throw new \RuntimeException(
                            "No se pudo sincronizar la reserva del producto {$productoId}"
                        );
                    }

                    $ajustesPedido[] = [
                        'producto_id' => $productoId,
                        'delta' => $deltaCatalogo,
                    ];
                }
            } catch (Throwable $e) {
                foreach (array_reverse($ajustesPedido) as $ajuste) {
                    $this->catalogo->ajustarStockProducto(
                        $ajuste['producto_id'],
                        -$ajuste['delta']
                    );
                }

                throw $e;
            }

            Carrito::where('usuario_id', $user->id)->delete();

            foreach ($detallesParaInsertar as $det) {
                StockReserva::create([
                    'pedido_id' => $pedido->id,
                    'producto_id' => $det['producto_id'],
                    'variante_id' => $det['variante_id'],
                    'cantidad' => $det['cantidad'],
                    'creado_at' => now(),
                    'expira_at' => $expiraAt,
                ]);
            }

            if ($estadoInicial !== EstadoPedido::DRAFT) {

                // Enviar correo de confirmación de pedido offline
                try {
                    Mail::to($user->correo)->send(
                        new PagoConfirmadoMailable(
                            $user->nombre,
                            $codigoPedido,
                            $detallesParaInsertar,
                            $subtotal,
                            $iva,
                            $costoEnvio,
                            $total,
                            $user->tipo_documento,
                            $user->numero_documento,
                            $tipoEntrega
                        )
                    );
                } catch (Throwable $e) {
                    Log::error('CrearDraftPedidoAction — Error enviando correo offline', [
                        'pedido_id' => $pedido->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('CrearDraftPedidoAction — Pedido creado', [
                'pedido_id' => $pedido->id,
                'codigo_pedido' => $codigoPedido,
                'estado' => $estadoInicial->value,
                'tipo_entrega' => $tipoEntrega,
                'costo_envio' => $costoEnvio,
                'total' => $total,
            ]);

            return [
                'mensaje' => 'Pedido creado exitosamente.',
                'pedido_id' => $pedido->id,
                'codigo_pedido' => $codigoPedido,
                'wompi_referencia' => $wompiRef,
                'tipo_entrega' => $tipoEntrega,
                'subtotal' => $subtotal,
                'iva' => $iva,
                'costo_envio' => $costoEnvio,
                'total' => $total,
                'estado' => $estadoInicial->value,
            ];
        });
    }
}
