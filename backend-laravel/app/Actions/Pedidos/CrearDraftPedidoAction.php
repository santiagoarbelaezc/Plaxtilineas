<?php

declare(strict_types=1);

namespace App\Actions\Pedidos;

use App\Enums\EstadoPedido;
use App\Exceptions\Domain\AccesoNoPermitidoException;
use App\Exceptions\Domain\StockInsuficienteException;
use App\Mail\PagoConfirmadoMailable;
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
        private readonly CatalogoApiService $catalogo
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function execute(Usuario $user, array $input): array
    {
        // 1. Validación de pedidos pendientes simultáneos
        if ($user->correo !== 'arbelaezz.c11@gmail.com') {
            $pendingCount = Pedido::where('usuario_id', $user->id)
                ->whereIn('estado', [
                    EstadoPedido::DRAFT,
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

            /** @var array<int, array<string, mixed>> $items */
            $items = $input['items'] ?? [];

            foreach ($items as $item) {
                $productoId = (int) ($item['producto_id'] ?? 0);
                $varianteId = ! empty($item['variante_id']) ? (int) $item['variante_id'] : null;
                $cantidad = max(1, (int) ($item['cantidad'] ?? 1));
                $imagenUrl = (string) ($item['imagen_url'] ?? '');

                // ── Verificar stock y obtener precio desde la API del catálogo externo ──
                $resultado = $this->catalogo->verificarStockYPrecio($productoId, $varianteId, $cantidad);

                if (! $resultado['disponible']) {
                    // Producto no encontrado en la API
                    if ($resultado['stock'] === 0 && $resultado['precio'] === 0.0 && $resultado['nombre'] === "Producto #{$productoId}") {
                        throw new NotFoundHttpException("Producto con ID {$productoId} no encontrado en el catálogo.");
                    }
                    // Stock insuficiente
                    throw StockInsuficienteException::paraPedido(
                        $resultado['nombre'],
                        $resultado['stock'],
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

            $ivaPorcentaje = (float) config('business.iva_porcentaje', 0.0);
            $iva = round($subtotal * $ivaPorcentaje, 2);
            $costoEnvio = (float) config('business.costo_envio_cop', 10000.0);
            $total = $subtotal + $iva + $costoEnvio;

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
                'direccion_envio' => (string) ($input['direccion_envio'] ?? ''),
                'ciudad' => $input['ciudad'] ?? null,
                'departamento' => $input['departamento'] ?? null,
                'notas' => $input['notas'] ?? null,
                'subtotal' => $subtotal,
                'iva' => $iva,
                'costo_envio' => $costoEnvio,
                'total' => $total,
                'metodo_pago' => $metodoPago,
                'wompi_referencia' => $wompiRef,
                'estado' => $estadoInicial,
            ]);

            foreach ($detallesParaInsertar as $det) {
                $pedido->items()->create($det);
            }

            $minutos = (int) config('business.reserva_stock_expiracion_minutos', 180);
            $expiraAt = now()->addMinutes($minutos);

            foreach ($detallesParaInsertar as $det) {
                StockReserva::create([
                    'pedido_id' => $pedido->id,
                    'producto_id' => $det['producto_id'],
                    'variante_id' => $det['variante_id'],
                    'cantidad' => $det['cantidad'],
                    'creado_at' => now(),
                    'expira_at' => $expiraAt,
                ]);

                // Descontar inmediatamente en la API del catálogo externo
                $this->catalogo->ajustarStockProducto((int) $det['producto_id'], -(int) $det['cantidad']);
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
                            $total
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
                'total' => $total,
            ]);

            return [
                'mensaje' => 'Pedido creado exitosamente.',
                'pedido_id' => $pedido->id,
                'codigo_pedido' => $codigoPedido,
                'wompi_referencia' => $wompiRef,
                'subtotal' => $subtotal,
                'iva' => $iva,
                'costo_envio' => $costoEnvio,
                'total' => $total,
                'estado' => $estadoInicial->value,
            ];
        });
    }
}
