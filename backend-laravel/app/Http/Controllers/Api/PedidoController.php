<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Pedidos\AdminActualizarEstadoPedidoAction;
use App\Actions\Pedidos\CancelarPedidoAction;
use App\Actions\Pedidos\ConfirmarPedidoAction;
use App\Actions\Pedidos\CrearDraftPedidoAction;
use App\Actions\Pedidos\EliminarPedidoAction;
use App\Actions\Pedidos\LiberarStockReservaAction;
use App\Contracts\MediaStorageInterface;
use App\Contracts\WompiClientInterface;
use App\Enums\EstadoPedido;
use App\Exceptions\Domain\CaptchaInvalidoException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pedidos\AdminActualizarEstadoPedidoRequest;
use App\Http\Requests\Pedidos\CrearDraftPedidoRequest;
use App\Models\Carrito;
use App\Models\Pedido;
use App\Models\Usuario;
use App\Services\AdminAuditService;
use App\Services\CaptchaService;
use App\Services\Catalogo\CatalogoApiService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        protected CatalogoApiService $catalogo,
        protected AdminAuditService $auditService,
        protected MediaStorageInterface $mediaStorage
    ) {}

    /**
     * POST /api/productos/verificar-stock
     * Comprueba disponibilidad actual antes de crear el draft del pedido,
     * descontando las unidades que el propio usuario ya tiene reservadas en su carrito.
     */
    public function verificarStock(Request $request): JsonResponse
    {
        $items = $request->input('items');
        if (! is_array($items) || $items === []) {
            return ApiResponse::validationError([
                'items' => ['Debes enviar al menos un producto.'],
            ]);
        }

        /** @var Usuario|null $user */
        $user = $request->user();
        $carritoPorProducto = [];
        if ($user !== null) {
            foreach (Carrito::where('usuario_id', $user->id)->get() as $carritoItem) {
                $prodId = (int) $carritoItem->producto_id;
                $carritoPorProducto[$prodId] = ($carritoPorProducto[$prodId] ?? 0) + (int) $carritoItem->cantidad;
            }
        }

        // Agrupar cantidades totales solicitadas por producto_id (soporta múltiples variantes del mismo producto)
        $cantidadTotalPorProducto = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $prodId = (int) ($item['producto_id'] ?? 0);
            $cant = (int) ($item['cantidad'] ?? 0);
            if ($prodId > 0 && $cant > 0) {
                $cantidadTotalPorProducto[$prodId] = ($cantidadTotalPorProducto[$prodId] ?? 0) + $cant;
            }
        }

        $errores = [];
        $productosValidados = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                $errores[] = ['nombre' => 'Producto', 'error' => 'Formato de producto inválido.'];

                continue;
            }

            $productoId = (int) ($item['producto_id'] ?? 0);
            $varianteId = isset($item['variante_id']) && $item['variante_id'] !== ''
                ? (int) $item['variante_id']
                : null;
            $cantidad = (int) ($item['cantidad'] ?? 0);

            if ($productoId <= 0 || $cantidad < 1) {
                $errores[] = ['nombre' => 'Producto', 'error' => 'Producto o cantidad inválidos.'];

                continue;
            }

            // Solo exigir al catálogo las unidades adicionales sobre lo que el propio carrito ya reservó
            $yaReservado = $carritoPorProducto[$productoId] ?? 0;
            $cantidadTotalProducto = $cantidadTotalPorProducto[$productoId] ?? $cantidad;
            $cantidadAdicional = max(0, $cantidadTotalProducto - $yaReservado);

            $cacheKey = "{$productoId}:".($varianteId ?? 'null');
            if (! isset($productosValidados[$cacheKey])) {
                $productosValidados[$cacheKey] = $this->catalogo->verificarStockYPrecio(
                    $productoId,
                    $varianteId,
                    $cantidadAdicional,
                    true
                );
            }

            $resultado = $productosValidados[$cacheKey];
            if (! $resultado['disponible']) {
                $stockTotalDisponibleParaUsuario = $resultado['stock'] + $yaReservado;
                $errores[] = [
                    'nombre' => $resultado['nombre'],
                    'stock_disponible' => $stockTotalDisponibleParaUsuario,
                    'cantidad_solicitada' => $cantidadTotalProducto,
                    'error' => $stockTotalDisponibleParaUsuario > 0
                        ? "Solo hay {$stockTotalDisponibleParaUsuario} unidades disponibles."
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
        if ($request->getCaptchaId() !== '' || $request->getCaptchaCode() !== '') {
            if (! $this->captchaService->verifyAndConsume($request->getCaptchaId(), $request->getCaptchaCode())) {
                throw new CaptchaInvalidoException;
            }
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

        $pedidosData = $pedidos->map(function (Pedido $p) use ($user) {
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
                'fecha' => ($p->fecha ?? $p->created_at)?->toIso8601String(),
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
                'fecha_actualizacion' => ($p->updated_at ?? $p->fecha ?? $p->created_at)?->toIso8601String(),
                'wompi_referencia' => $p->wompi_referencia,
                'wompi_transaction_id' => $p->wompi_transaction_id,
                'wompi_pagado_at' => $p->wompi_pagado_at?->toIso8601String(),
                'guia_numero' => $p->guia_numero,
                'transportadora' => $p->transportadora,
                'fecha_envio' => $p->fecha_envio?->toIso8601String(),
                'fecha_entrega' => $p->fecha_entrega?->toIso8601String(),
                'evidencia_envio_url' => $p->evidencia_envio_url,
                'evidencia_entrega_url' => $p->evidencia_entrega_url,
                'cliente_nombre' => $p->nombre_cliente ?: $user->nombre,
                'cliente_correo' => $p->email_cliente ?: $user->correo,
                'cliente_tipo_documento' => $user->tipo_documento,
                'cliente_numero_documento' => $user->numero_documento,
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
     * Consulta de SOLO LECTURA desde la base de datos propia del comercio.
     *
     * Regla oficial Wompi: La URL de redirección es estrictamente informativa.
     * Este endpoint NUNCA aprueba, cancela ni muta órdenes basándose en parámetros
     * del navegador; únicamente el Webhook (y el job S2S programado) actualizan estados.
     */
    public function verificarEstado(Request $request): JsonResponse
    {
        /** @var Usuario $user */
        $user = $request->user();

        $referencia = trim((string) $request->query('ref', ''));
        $wompiTxId = trim((string) $request->query('id', ''));

        /** @var Pedido|null $pedido */
        $pedido = null;

        if ($referencia !== '') {
            $pedido = Pedido::where('usuario_id', $user->id)
                ->where('wompi_referencia', $referencia)
                ->first();
        }

        if (! $pedido && $wompiTxId !== '') {
            $pedido = Pedido::where('usuario_id', $user->id)
                ->where('wompi_transaction_id', $wompiTxId)
                ->first();
        }

        // Si Wompi redirigió con ?id=<tx_id> antes de que llegue el webhook,
        // mostramos la última orden Wompi del usuario sin mutar su estado.
        if (! $pedido) {
            $pedido = Pedido::where('usuario_id', $user->id)
                ->where('metodo_pago', 'wompi')
                ->whereIn('estado', [
                    EstadoPedido::PENDIENTE_PAGO,
                    EstadoPedido::PAGADO,
                    EstadoPedido::CANCELADO,
                ])
                ->orderByDesc('id')
                ->first();
        }

        if (! $pedido) {
            return ApiResponse::error('Pedido no encontrado.', 404);
        }

        return ApiResponse::success([
            'estado' => $pedido->estado->value,
            'codigo_pedido' => $pedido->codigo_pedido,
            'wompi_referencia' => $pedido->wompi_referencia,
            'wompi_transaction_id' => $pedido->wompi_transaction_id ?: ($wompiTxId !== '' ? $wompiTxId : null),
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
                'fecha' => ($p->fecha ?? $p->created_at)?->toIso8601String(),
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
                'fecha_actualizacion' => ($p->updated_at ?? $p->fecha ?? $p->created_at)?->toIso8601String(),
                'wompi_referencia' => $p->wompi_referencia,
                'wompi_transaction_id' => $p->wompi_transaction_id,
                'wompi_pagado_at' => $p->wompi_pagado_at?->toIso8601String(),
                'guia_numero' => $p->guia_numero,
                'transportadora' => $p->transportadora,
                'fecha_envio' => $p->fecha_envio?->toIso8601String(),
                'fecha_entrega' => $p->fecha_entrega?->toIso8601String(),
                'evidencia_envio_url' => $p->evidencia_envio_url,
                'evidencia_entrega_url' => $p->evidencia_entrega_url,
                'cliente_nombre' => $p->nombre_cliente ?: $p->usuario?->nombre,
                'cliente_correo' => $p->email_cliente ?: $p->usuario?->correo,
                'cliente_tipo_documento' => $p->usuario?->tipo_documento,
                'cliente_numero_documento' => $p->usuario?->numero_documento,
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
        $evidenciaEnvioUrl = $request->input('evidencia_envio_url') ? (string) $request->input('evidencia_envio_url') : null;
        $evidenciaEntregaUrl = $request->input('evidencia_entrega_url') ? (string) $request->input('evidencia_entrega_url') : null;
        $solicitudCliente = (bool) $request->input('solicitud_cliente', false);

        /** @var Pedido|null $pedidoAntes */
        $pedidoAntes = Pedido::with('usuario')->find($id);
        $estadoAnterior = $pedidoAntes?->estado->value ?? '';
        $codigo = $pedidoAntes->codigo_pedido ?? "#{$id}";

        $resultado = $this->adminActualizarEstadoAction->execute(
            $id,
            $nuevoEstado,
            $guiaNumero,
            $transportadora,
            $solicitudCliente,
            $evidenciaEnvioUrl,
            $evidenciaEntregaUrl
        );

        $this->auditService->registrarOperacion(
            modulo: 'PEDIDOS',
            accion: 'ACTUALIZAR_ESTADO_PEDIDO',
            descripcion: "Actualizó el estado del pedido {$codigo} de '{$estadoAnterior}' a '{$nuevoEstado}'",
            entidadTipo: 'Pedido',
            entidadId: $codigo,
            datosAnteriores: [
                'id' => $id,
                'codigo_pedido' => $codigo,
                'estado' => $estadoAnterior,
                'guia_numero' => $pedidoAntes?->guia_numero,
                'transportadora' => $pedidoAntes?->transportadora,
            ],
            datosNuevos: [
                'estado' => $nuevoEstado,
                'guia_numero' => $guiaNumero,
                'transportadora' => $transportadora,
                'solicitud_cliente' => $solicitudCliente,
            ],
            admin: $request->user(),
            request: $request
        );

        return ApiResponse::success($resultado);
    }

    /**
     * POST /api/admin/pedidos/{id}/evidencia-envio
     * Admin: sube una foto de evidencia del envío a Cloudinary y la asocia al pedido.
     */
    public function adminSubirEvidenciaEnvio(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'evidencia' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        /** @var Pedido|null $pedido */
        $pedido = Pedido::find($id);
        if (! $pedido) {
            return ApiResponse::error('Pedido no encontrado.', 404);
        }

        $file = $request->file('evidencia');
        if (! $file) {
            return ApiResponse::error('Debes adjuntar una imagen de evidencia.', 422);
        }

        $uploaded = $this->mediaStorage->upload($file, 'plaxtilineas/evidencias_envio');
        $urlAnterior = $pedido->evidencia_envio_url;

        $pedido->update([
            'evidencia_envio_url' => $uploaded['url'],
        ]);

        $this->auditService->registrarOperacion(
            modulo: 'PEDIDOS',
            accion: 'SUBIR_EVIDENCIA_ENVIO',
            descripcion: "Subió foto de evidencia de envío para el pedido {$pedido->codigo_pedido}",
            entidadTipo: 'Pedido',
            entidadId: $pedido->codigo_pedido,
            datosAnteriores: ['evidencia_envio_url' => $urlAnterior],
            datosNuevos: ['evidencia_envio_url' => $uploaded['url']],
            admin: $request->user(),
            request: $request
        );

        return ApiResponse::success([
            'mensaje' => 'Evidencia de envío cargada correctamente.',
            'evidencia_envio_url' => $uploaded['url'],
        ]);
    }

    /**
     * POST /api/admin/pedidos/{id}/evidencia-entrega
     * Admin: sube una foto de evidencia de entrega a Cloudinary y la asocia al pedido.
     */
    public function adminSubirEvidenciaEntrega(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'evidencia' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        /** @var Pedido|null $pedido */
        $pedido = Pedido::find($id);
        if (! $pedido) {
            return ApiResponse::error('Pedido no encontrado.', 404);
        }

        $file = $request->file('evidencia');
        if (! $file) {
            return ApiResponse::error('Debes adjuntar una imagen de evidencia de entrega.', 422);
        }

        $uploaded = $this->mediaStorage->upload($file, 'plaxtilineas/evidencias_entrega');
        $urlAnterior = $pedido->evidencia_entrega_url;

        $pedido->update([
            'evidencia_entrega_url' => $uploaded['url'],
        ]);

        $this->auditService->registrarOperacion(
            modulo: 'PEDIDOS',
            accion: 'SUBIR_EVIDENCIA_ENTREGA',
            descripcion: "Subió foto de evidencia de entrega para el pedido {$pedido->codigo_pedido}",
            entidadTipo: 'Pedido',
            entidadId: $pedido->codigo_pedido,
            datosAnteriores: ['evidencia_entrega_url' => $urlAnterior],
            datosNuevos: ['evidencia_entrega_url' => $uploaded['url']],
            admin: $request->user(),
            request: $request
        );

        return ApiResponse::success([
            'mensaje' => 'Evidencia de entrega cargada correctamente.',
            'evidencia_entrega_url' => $uploaded['url'],
        ]);
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

        /** @var Pedido|null $pedidoAntes */
        $pedidoAntes = Pedido::with('usuario')->find($id);
        $codigo = $pedidoAntes->codigo_pedido ?? "#{$id}";
        $clienteNombre = $pedidoAntes?->nombre_cliente ?: ($pedidoAntes?->usuario->nombre ?? 'Cliente');
        $datosAnteriores = $pedidoAntes ? [
            'id' => $pedidoAntes->id,
            'codigo_pedido' => $pedidoAntes->codigo_pedido,
            'cliente' => $clienteNombre,
            'total' => (float) $pedidoAntes->total,
            'estado' => $pedidoAntes->estado->value,
        ] : ['id' => $id];

        $resultado = $this->eliminarPedidoAction->executeForAdmin($id);

        $this->auditService->registrarOperacion(
            modulo: 'PEDIDOS',
            accion: 'ELIMINAR_PEDIDO',
            descripcion: "Eliminó el pedido {$codigo} del cliente {$clienteNombre}",
            entidadTipo: 'Pedido',
            entidadId: $codigo,
            datosAnteriores: $datosAnteriores,
            datosNuevos: null,
            admin: $request->user(),
            request: $request
        );

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
