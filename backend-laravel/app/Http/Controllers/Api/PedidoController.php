<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Pedidos\AdminActualizarEstadoPedidoAction;
use App\Actions\Pedidos\CancelarPedidoAction;
use App\Actions\Pedidos\ConfirmarPedidoAction;
use App\Actions\Pedidos\CrearDraftPedidoAction;
use App\Actions\Pedidos\EliminarPedidoAction;
use App\Actions\Pedidos\LiberarStockReservaAction;
use App\Contracts\WompiClientInterface;
use App\Enums\EstadoPedido;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pedidos\AdminActualizarEstadoPedidoRequest;
use App\Http\Requests\Pedidos\CrearDraftPedidoRequest;
use App\Models\Pedido;
use App\Models\Usuario;
use App\Services\CaptchaService;
use App\Services\Catalogo\CatalogoApiService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PedidoController extends Controller
{
    public function __construct(
        protected CaptchaService $captchaService,
        protected CrearDraftPedidoAction $crearDraftAction,
        protected ConfirmarPedidoAction $confirmarPedidoAction,
        protected CancelarPedidoAction $cancelarPedidoAction,
        protected EliminarPedidoAction $eliminarPedidoAction,
        protected AdminActualizarEstadoPedidoAction $adminActualizarEstadoAction,
        protected WompiClientInterface $wompiService,
        protected LiberarStockReservaAction $liberarStockReservaAction,
        protected CatalogoApiService $catalogo
    ) {}

    /**
     * POST /api/productos/verificar-stock
     * Comprueba disponibilidad actual antes de crear el draft del pedido.
     */
    public function verificarStock(Request $request): JsonResponse
    {
        $items = $request->input('items');
        if (! is_array($items) || $items === []) {
            return ApiResponse::validationError([
                'items' => ['Debes enviar al menos un producto.'],
            ]);
        }

        $errores = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                $errores[] = ['nombre' => 'Producto', 'error' => 'Formato de producto inválido.'];

                continue;
            }

            $productoId = (int) ($item['producto_id'] ?? 0);
            $varianteId = isset($item['variante_id'])
                ? (int) $item['variante_id']
                : null;
            $cantidad = (int) ($item['cantidad'] ?? 0);

            if ($productoId <= 0 || $cantidad < 1) {
                $errores[] = ['nombre' => 'Producto', 'error' => 'Producto o cantidad inválidos.'];

                continue;
            }

            $resultado = $this->catalogo->verificarStockYPrecio($productoId, $varianteId, $cantidad);
            if (! $resultado['disponible']) {
                $errores[] = [
                    'nombre' => $resultado['nombre'],
                    'stock_disponible' => $resultado['stock'],
                    'cantidad_solicitada' => $cantidad,
                    'error' => $resultado['stock'] > 0
                        ? "Solo hay {$resultado['stock']} unidades disponibles."
                        : 'Producto agotado o no disponible.',
                ];
            }
        }

        return ApiResponse::success([
            'valido' => $errores === [],
            'items_con_error' => $errores,
        ]);
    }

    /**
     * POST /api/pedidos/draft
     * Crea un pedido en estado draft y reserva stock temporal.
     */
    public function crearDraft(CrearDraftPedidoRequest $request): JsonResponse
    {
        if (! $this->captchaService->verifyAndConsume(
            $request->getCaptchaId(),
            $request->getCaptchaCode()
        )) {
            return ApiResponse::error(
                'El código captcha ha expirado o es incorrecto. Intenta nuevamente.',
                400
            );
        }

        /** @var Usuario $user */
        $user = $request->user();

        $resultado = $this->crearDraftAction->execute($user, $request->validated());

        return ApiResponse::success($resultado, 201);
    }

    /**
     * GET /api/pedidos/mis-pedidos
     * Lista los pedidos del cliente autenticado (excluyendo drafts incompletos).
     */
    public function obtenerMisPedidos(Request $request): JsonResponse
    {
        /** @var Usuario $user */
        $user = $request->user();

        $pedidos = Pedido::with('items')
            ->where('usuario_id', $user->id)
            ->where('estado', '!=', EstadoPedido::DRAFT)
            ->orderByDesc('fecha')
            ->get();

        $pedidosData = $pedidos->map(function (Pedido $p) {
            $detalles = $p->items->map(fn ($it) => [
                'id' => $it->id,
                'producto_id' => $it->producto_id,
                'variante_id' => $it->variante_id,
                'nombre_producto' => $it->nombre_producto,
                'imagen_url' => $it->imagen_url,
                'cantidad' => $it->cantidad,
                'precio_unitario' => (float) $it->precio_unitario,
                'subtotal' => (float) $it->subtotal,
            ])->all();

            return [
                'id' => $p->id,
                'codigo_pedido' => $p->codigo_pedido,
                'fecha' => $p->created_at?->toIso8601String(),
                'total' => (float) $p->total,
                'subtotal' => (float) $p->subtotal,
                'iva' => (float) $p->iva,
                'costo_envio' => (float) $p->costo_envio,
                'estado' => $p->estado->value,
                'direccion_envio' => $p->direccion_envio,
                'ciudad' => $p->ciudad_envio,
                'departamento' => $p->departamento,
                'telefono_contacto' => $p->telefono_cliente,
                'metodo_pago' => $p->metodo_pago,
                'notas' => $p->notas,
                'fecha_actualizacion' => $p->updated_at?->toIso8601String(),
                'wompi_pagado_at' => $p->wompi_pagado_at?->toIso8601String(),
                'detalles' => $detalles,
                'total_items' => array_sum(array_column($detalles, 'cantidad')),
            ];
        })->all();

        return ApiResponse::success([
            'pedidos' => $pedidosData,
            'total_pedidos' => count($pedidosData),
        ]);
    }

    /**
     * GET /api/pedidos/estado
     * Verifica el estado del pedido por referencia interna o ID de transacción Wompi.
     */
    public function verificarEstado(Request $request): JsonResponse
    {
        $referencia = (string) $request->query('ref', '');
        $wompiTxId = (string) $request->query('id', '');

        if ($referencia === '' && $wompiTxId === '') {
            return ApiResponse::error('Parámetro ?ref= o ?id= requerido.', 400);
        }

        /** @var Pedido|null $pedido */
        $pedido = null;

        if ($wompiTxId !== '') {
            try {
                $txData = $this->wompiService->consultarTransaccion($wompiTxId);
                /** @var array<string, mixed> $data */
                $data = $txData['data'] ?? [];
                $paymentLinkId = (string) ($data['payment_link_id'] ?? '');
                $txRef = (string) ($data['reference'] ?? '');
                $status = (string) ($data['status'] ?? '');

                if ($paymentLinkId !== '') {
                    $pedido = Pedido::where('wompi_link_id', $paymentLinkId)->first();
                }
                if (! $pedido && $txRef !== '') {
                    $pedido = Pedido::where('wompi_referencia', $txRef)->first();
                }

                if ($pedido) {
                    $referencia = (string) $pedido->wompi_referencia;

                    if ($status === 'APPROVED' && $pedido->estado !== EstadoPedido::PAGADO) {
                        $montoCentavos = (int) ($data['amount_in_cents'] ?? 0);
                        $this->confirmarPedidoAction->execute(
                            $pedido->id,
                            $wompiTxId,
                            'query-proactive-'.$wompiTxId,
                            $montoCentavos
                        );
                        $pedido->refresh();
                    } elseif (in_array($status, ['DECLINED', 'VOIDED', 'ERROR'], true) && $pedido->estado !== EstadoPedido::CANCELADO) {
                        $pedido->update([
                            'estado' => EstadoPedido::CANCELADO,
                            'wompi_transaction_id' => $wompiTxId,
                            'wompi_evento_id' => 'query-proactive-'.$wompiTxId,
                        ]);
                        $this->liberarStockReservaAction->execute($pedido);
                        $pedido->refresh();
                    }

                }
            } catch (Throwable $e) {
                Log::error('PedidoController::verificarEstado — Error consultando Wompi API', [
                    'wompi_tx' => $wompiTxId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($referencia === '') {
            return ApiResponse::error('No se pudo resolver la referencia del pedido.', 404);
        }

        if (! $pedido) {
            $pedido = Pedido::where('wompi_referencia', $referencia)->first();
        }

        if (! $pedido) {
            return ApiResponse::error('Pedido no encontrado.', 404);
        }

        /** @var Usuario $user */
        $user = $request->user();
        if ($pedido->usuario_id !== $user->id) {
            return ApiResponse::error('No autorizado.', 403);
        }

        return ApiResponse::success([
            'estado' => $pedido->estado->value,
            'codigo_pedido' => $pedido->codigo_pedido,
            'total' => (float) $pedido->total,
            'wompi_pagado_at' => $pedido->wompi_pagado_at?->toIso8601String(),
        ]);
    }

    /**
     * GET /api/admin/pedidos
     * Admin: obtiene todos los pedidos y estadísticas del sistema.
     */
    public function adminObtenerTodos(): JsonResponse
    {
        $pedidos = Pedido::with(['items', 'usuario'])
            ->where('estado', '!=', EstadoPedido::DRAFT)
            ->orderByDesc('fecha')
            ->get();

        $pedidosData = $pedidos->map(function (Pedido $p) {
            $detalles = $p->items->map(fn ($it) => [
                'id' => $it->id,
                'producto_id' => $it->producto_id,
                'variante_id' => $it->variante_id,
                'nombre_producto' => $it->nombre_producto,
                'imagen_url' => $it->imagen_url,
                'cantidad' => $it->cantidad,
                'precio_unitario' => (float) $it->precio_unitario,
                'subtotal' => (float) $it->subtotal,
            ])->all();

            return [
                'id' => $p->id,
                'codigo_pedido' => $p->codigo_pedido,
                'usuario_id' => $p->usuario_id,
                'fecha' => $p->created_at?->toIso8601String(),
                'total' => (float) $p->total,
                'subtotal' => (float) $p->subtotal,
                'iva' => (float) $p->iva,
                'costo_envio' => (float) $p->costo_envio,
                'estado' => $p->estado->value,
                'direccion_envio' => $p->direccion_envio,
                'ciudad' => $p->ciudad_envio,
                'departamento' => $p->departamento,
                'telefono_contacto' => $p->telefono_cliente,
                'metodo_pago' => $p->metodo_pago,
                'notas' => $p->notas,
                'fecha_actualizacion' => $p->updated_at?->toIso8601String(),
                'wompi_referencia' => $p->wompi_referencia,
                'wompi_pagado_at' => $p->wompi_pagado_at?->toIso8601String(),
                'guia_numero' => $p->guia_numero,
                'transportadora' => $p->transportadora,
                'fecha_envio' => $p->fecha_envio?->toIso8601String(),
                'cliente_nombre' => $p->nombre_cliente ?: $p->usuario?->nombre,
                'cliente_correo' => $p->email_cliente ?: $p->usuario?->correo,
                'detalles' => $detalles,
                'total_items' => array_sum(array_column($detalles, 'cantidad')),
            ];
        })->all();

        $ingresosTotales = (float) Pedido::whereIn('estado', [
            EstadoPedido::PAGADO,
            EstadoPedido::CONFIRMADO,
            EstadoPedido::EN_PREPARACION,
            EstadoPedido::EN_CAMINO,
            EstadoPedido::ENTREGADO,
        ])->sum('total');

        $pedidosActivos = Pedido::whereIn('estado', [
            EstadoPedido::PAGADO,
            EstadoPedido::PENDIENTE,
            EstadoPedido::CONFIRMADO,
            EstadoPedido::EN_PREPARACION,
            EstadoPedido::EN_CAMINO,
        ])->count();

        $pedidosEntregados = Pedido::where('estado', EstadoPedido::ENTREGADO)->count();
        $pedidosCancelados = Pedido::where('estado', EstadoPedido::CANCELADO)->count();

        return ApiResponse::success([
            'pedidos' => $pedidosData,
            'estadisticas' => [
                'total_pedidos' => count($pedidosData),
                'ingresos_totales' => $ingresosTotales,
                'pedidos_activos' => $pedidosActivos,
                'pedidos_entregados' => $pedidosEntregados,
                'pedidos_cancelados' => $pedidosCancelados,
            ],
        ]);
    }

    /**
     * PUT /api/admin/pedidos/{id}/estado
     * Admin: actualiza el estado de un pedido y notifica al cliente.
     */
    public function adminActualizarEstado(int $id, AdminActualizarEstadoPedidoRequest $request): JsonResponse
    {
        $nuevoEstado = (string) $request->input('estado');
        $guiaNumero = $request->input('guia_numero') ? (string) $request->input('guia_numero') : null;
        $transportadora = $request->input('transportadora') ? (string) $request->input('transportadora') : null;
        $solicitudCliente = (bool) $request->input('solicitud_cliente', false);

        $resultado = $this->adminActualizarEstadoAction->execute(
            $id,
            $nuevoEstado,
            $guiaNumero,
            $transportadora,
            $solicitudCliente
        );

        return ApiResponse::success($resultado);
    }

    /**
     * DELETE /api/admin/pedidos/{id}
     * Admin: elimina pedidos que aún no tienen el pago confirmado.
     */
    public function adminEliminar(int $id, Request $request): JsonResponse
    {
        if (strtolower(trim((string) $request->input('confirmacion'))) !== 'eliminar') {
            return ApiResponse::error('Debes escribir la palabra "eliminar" para confirmar.', 422);
        }

        $resultado = $this->eliminarPedidoAction->executeForAdmin($id);

        return ApiResponse::success($resultado);
    }

    /**
     * POST /api/pedidos/{id}/cancelar
     * Cliente cancela su pedido no pagado.
     */
    public function cancelar(int $id, Request $request): JsonResponse
    {
        /** @var Usuario $user */
        $user = $request->user();

        $resultado = $this->cancelarPedidoAction->execute($id, $user);

        return ApiResponse::success($resultado);
    }

    /**
     * DELETE /api/pedidos/{id}
     * Cliente elimina un pedido no pagado.
     */
    public function eliminar(int $id, Request $request): JsonResponse
    {
        /** @var Usuario $user */
        $user = $request->user();

        $resultado = $this->eliminarPedidoAction->execute($id, $user);

        return ApiResponse::success($resultado);
    }
}
