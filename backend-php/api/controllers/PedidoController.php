<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/EmailService.php';

/**
 * PedidoController – Gestión transaccional de pedidos (Two-Phase Commit)
 *
 * FLUJO DE PAGO SEGURO:
 *   1. crearDraft()    → Crea pedido con estado 'draft', genera wompi_referencia.
 *                        NO toca stock, NO envía email.
 *   2. [Wompi widget] → El usuario paga.
 *   3. confirmarPedido() → Llamado INTERNAMENTE por WompiController::webhook()
 *                          cuando Wompi envía APPROVED.
 *                          Aquí SÍ se deduce el stock y SÍ se envía el email.
 *
 * Endpoints públicos:
 * - POST   /pedidos/draft                → crearDraft (usuario autenticado)
 * - GET    /pedidos/mis-pedidos          → obtenerMisPedidos (usuario autenticado)
 * - GET    /pedidos/estado               → verificarEstado (usuario autenticado)
 * - GET    /pedidos/admin/todos          → adminObtenerTodos (admin)
 * - PUT    /pedidos/admin/actualizar-estado/:id → adminActualizarEstado (admin)
 */
class PedidoController
{
    // ═══════════════════════════════════════════════════════════════════════
    //  FASE 1 — CREAR DRAFT (cliente autenticado)
    //  No toca stock, no envía email. Solo reserva la intención de compra.
    // ═══════════════════════════════════════════════════════════════════════
    public static function crearDraft(array $user): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        // ── Validación de entrada ────────────────────────────────────────
        if (empty($input['items']) || !is_array($input['items'])) {
            ResponseHandler::error('Debes enviar al menos un producto.', 400);
            return;
        }
        if (empty($input['direccion_envio'])) {
            ResponseHandler::error('La dirección de envío es obligatoria.', 400);
            return;
        }

        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            // ── Verificar stock y calcular montos ────────────────────────
            $subtotal = 0;
            $detallesParaInsertar = [];

            foreach ($input['items'] as $item) {
                $productoId = (int)($item['producto_id'] ?? 0);
                $varianteId = !empty($item['variante_id']) ? (int)$item['variante_id'] : null;
                $cantidad   = max(1, (int)($item['cantidad'] ?? 1));

                // Obtener snapshot del producto actual
                $stmtProd = $db->prepare(
                    "SELECT id, nombre, precio, stock, controlar_stock, imagen_url FROM productos WHERE id = ?"
                );
                $stmtProd->execute([$productoId]);
                $producto = $stmtProd->fetch();

                if (!$producto) {
                    $db->rollBack();
                    ResponseHandler::error("Producto con ID {$productoId} no encontrado.", 404);
                    return;
                }

                // Validar stock disponible (incluyendo reservas activas)
                if ($producto['controlar_stock'] && $producto['stock'] !== null) {
                    $stmtReservas = $db->prepare("
                        SELECT COALESCE(SUM(sr.cantidad), 0) as reservado
                        FROM stock_reservas sr
                        INNER JOIN pedidos p ON sr.pedido_id = p.id
                        WHERE sr.producto_id = ?
                          AND p.estado IN ('draft', 'pendiente_pago')
                          AND sr.expira_at > NOW()
                    ");
                    $stmtReservas->execute([$productoId]);
                    $reservado = (int)$stmtReservas->fetchColumn();
                    $stockDisponible = $producto['stock'] - $reservado;

                    if ($cantidad > $stockDisponible) {
                        $db->rollBack();
                        ResponseHandler::error(
                            "Stock insuficiente para \"{$producto['nombre']}\". "
                            . "Disponible: {$stockDisponible}, solicitado: {$cantidad}.",
                            400
                        );
                        return;
                    }
                }

                // Determinar precio (variante o producto base)
                $precioUnitario = (float)$producto['precio'];
                $imagenUrl      = $producto['imagen_url'];
                if ($varianteId) {
                    $stmtVar = $db->prepare(
                        "SELECT precio FROM variantes WHERE id = ? AND producto_id = ?"
                    );
                    $stmtVar->execute([$varianteId, $productoId]);
                    $variante = $stmtVar->fetch();
                    if ($variante && $variante['precio']) {
                        $precioUnitario = (float)$variante['precio'];
                    }
                }

                $subtotal += $precioUnitario * $cantidad;

                $detallesParaInsertar[] = [
                    'producto_id'     => $productoId,
                    'variante_id'     => $varianteId,
                    'nombre_producto' => $producto['nombre'],
                    'imagen_url'      => $imagenUrl,
                    'cantidad'        => $cantidad,
                    'precio_unitario' => $precioUnitario,
                ];
            }

            // ── Calcular IVA y envío ────────────────────────────────────
            $iva        = round($subtotal * IVA_PORCENTAJE, 2);
            $costoEnvio = (float) COSTO_ENVIO_COP;
            $total      = $subtotal + $iva + $costoEnvio;

            // ── Generar referencia única PLX-{timestamp}-{random4} ──────
            $wompiRef = 'PLX-' . time() . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

            // ── Generar código de pedido correlativo PX-{año}-{NNNN} ───
            $anio = date('Y');
            $stmtCount = $db->query("SELECT COUNT(*) FROM pedidos WHERE YEAR(fecha) = {$anio}");
            $correlativo = str_pad((int)$stmtCount->fetchColumn() + 1, 4, '0', STR_PAD_LEFT);
            $codigoPedido = "PX-{$anio}-{$correlativo}";

            // ── Insertar pedido ─────────────────────────
            $metodoPago = $input['metodo_pago'] ?? 'wompi';
            $estadoInicial = ($metodoPago === 'wompi') ? 'draft' : 'pendiente_pago';

            $stmtPedido = $db->prepare("
                INSERT INTO pedidos
                    (codigo_pedido, usuario_id, subtotal, iva, costo_envio, total,
                     estado, direccion_envio, ciudad, departamento,
                     telefono_contacto, metodo_pago, notas, wompi_referencia)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtPedido->execute([
                $codigoPedido,
                $user['id'],
                $subtotal,
                $iva,
                $costoEnvio,
                $total,
                $estadoInicial,
                $input['direccion_envio'],
                $input['ciudad']            ?? null,
                $input['departamento']      ?? null,
                $input['telefono_contacto'] ?? null,
                $metodoPago,
                $input['notas']             ?? null,
                $wompiRef,
            ]);
            $pedidoId = (int)$db->lastInsertId();

            // ── Insertar detalles del pedido ────────────────────────────
            $stmtDetalle = $db->prepare("
                INSERT INTO pedido_detalles
                    (pedido_id, producto_id, variante_id, nombre_producto,
                     imagen_url, cantidad, precio_unitario)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($detallesParaInsertar as $det) {
                $stmtDetalle->execute([
                    $pedidoId,
                    $det['producto_id'],
                    $det['variante_id'],
                    $det['nombre_producto'],
                    $det['imagen_url'],
                    $det['cantidad'],
                    $det['precio_unitario'],
                ]);
            }

            if ($estadoInicial === 'draft') {
                // ── Crear reservas temporales de stock (expiran en 30 min) ──
                $stmtReserva = $db->prepare("
                    INSERT INTO stock_reservas
                        (pedido_id, producto_id, variante_id, cantidad, expira_at)
                    VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
                ");
                foreach ($detallesParaInsertar as $det) {
                    $stmtReserva->execute([
                        $pedidoId,
                        $det['producto_id'],
                        $det['variante_id'],
                        $det['cantidad'],
                    ]);
                }
            } else {
                // ── Deducir stock real inmediatamente para contraentrega/transferencia ──
                $stmtStock = $db->prepare(
                    "UPDATE productos SET stock = stock - ? WHERE id = ? AND controlar_stock = 1"
                );
                foreach ($detallesParaInsertar as $det) {
                    $stmtStock->execute([$det['cantidad'], $det['producto_id']]);
                }
            }

            $db->commit();

            // ── Enviar email para pedidos offline (contraentrega/transferencia) ──
            if ($estadoInicial !== 'draft') {
                try {
                    $emailDestinatario = $user['correo'] ?? null;
                    if ($emailDestinatario) {
                        $detallesEmail = array_map(fn($d) => array_merge($d, [
                            'subtotal' => $d['precio_unitario'] * $d['cantidad']
                        ]), $detallesParaInsertar);

                        EmailService::enviarPagoConfirmado(
                            $emailDestinatario,
                            $user['nombre'] ?? 'Cliente',
                            $codigoPedido,
                            $detallesEmail,
                            (float)$subtotal,
                            (float)$iva,
                            (float)$costoEnvio,
                            (float)$total
                        );
                    }
                } catch (Throwable $e) {
                    Logger::error('PedidoController::crearDraft - Error email offline', [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Logger::error('PedidoController::crearDraft - Pedido creado', [
                'pedido_id'      => $pedidoId,
                'metodo_pago'    => $metodoPago,
                'estado'         => $estadoInicial,
                'usuario_id'     => $user['id'],
                'total'          => $total,
            ]);

            ResponseHandler::success([
                'mensaje'          => 'Pedido creado exitosamente.',
                'pedido_id'        => $pedidoId,
                'codigo_pedido'    => $codigoPedido,
                'wompi_referencia' => $wompiRef,
                'subtotal'         => $subtotal,
                'iva'              => $iva,
                'costo_envio'      => $costoEnvio,
                'total'            => $total,
                'estado'           => $estadoInicial
            ], 201);

        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('PedidoController::crearDraft', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear el pedido: ' . $e->getMessage(), 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FASE 2 — CONFIRMAR PEDIDO (llamado INTERNAMENTE por el webhook)
    //  Aquí SÍ se deduce stock y SÍ se envía el email de confirmación.
    //  NUNCA debe ser llamado directamente por el frontend.
    // ═══════════════════════════════════════════════════════════════════════
    public static function confirmarPedido(
        int    $pedidoId,
        string $wompiTransactionId,
        string $wompiEventoId,
        int    $wompiMontoCentavos
    ): bool {
        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            // ── Bloquear el registro para actualizaciones concurrentes ───
            $stmtPedido = $db->prepare("
                SELECT p.*, u.nombre as cliente_nombre, u.correo as cliente_correo
                FROM pedidos p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                WHERE p.id = ? FOR UPDATE
            ");
            $stmtPedido->execute([$pedidoId]);
            $pedido = $stmtPedido->fetch();

            if (!$pedido) {
                $db->rollBack();
                Logger::error('PedidoController::confirmarPedido - Pedido no encontrado', [
                    'pedido_id' => $pedidoId
                ]);
                return false;
            }

            // ── Evitar doble procesamiento ───────────────────────────────
            if ($pedido['estado'] === 'pagado') {
                $db->rollBack();
                Logger::error('PedidoController::confirmarPedido - Ya estaba pagado (idempotencia)', [
                    'pedido_id' => $pedidoId
                ]);
                return true; // Ya se procesó antes, no es error
            }

            // ── Obtener detalles del pedido ──────────────────────────────
            $stmtDets = $db->prepare("
                SELECT producto_id, variante_id, nombre_producto,
                       imagen_url, cantidad, precio_unitario
                FROM pedido_detalles WHERE pedido_id = ?
            ");
            $stmtDets->execute([$pedidoId]);
            $detalles = $stmtDets->fetchAll();

            // ── Deducir stock de cada producto ───────────────────────────
            $stmtStock = $db->prepare(
                "UPDATE productos SET stock = stock - ? WHERE id = ? AND controlar_stock = 1"
            );
            foreach ($detalles as $det) {
                $stmtStock->execute([$det['cantidad'], $det['producto_id']]);
            }

            // ── Eliminar reservas de stock ya no necesarias ──────────────
            $stmtDelReservas = $db->prepare(
                "DELETE FROM stock_reservas WHERE pedido_id = ?"
            );
            $stmtDelReservas->execute([$pedidoId]);

            // ── Actualizar estado del pedido a 'pagado' ──────────────────
            $stmtUpdate = $db->prepare("
                UPDATE pedidos
                SET estado              = 'pagado',
                    wompi_transaction_id = ?,
                    wompi_evento_id      = ?,
                    wompi_monto_centavos = ?,
                    wompi_pagado_at      = NOW(),
                    fecha_actualizacion  = NOW()
                WHERE id = ?
            ");
            $stmtUpdate->execute([
                $wompiTransactionId,
                $wompiEventoId,
                $wompiMontoCentavos,
                $pedidoId,
            ]);

            $db->commit();

            // ── Enviar email de confirmación (NO bloquea el webhook) ─────
            try {
                $emailDestinatario = $pedido['cliente_correo'] ?? null;
                if ($emailDestinatario) {
                    // Reconstruir detalles con subtotal calculado
                    $detallesEmail = array_map(fn($d) => array_merge($d, [
                        'subtotal' => $d['precio_unitario'] * $d['cantidad']
                    ]), $detalles);

                    EmailService::enviarPagoConfirmado(
                        $emailDestinatario,
                        $pedido['cliente_nombre'] ?? 'Cliente',
                        $pedido['codigo_pedido'],
                        $detallesEmail,
                        (float)$pedido['subtotal'],
                        (float)$pedido['iva'],
                        (float)$pedido['costo_envio'],
                        (float)$pedido['total']
                    );
                }
            } catch (Throwable $e) {
                Logger::error('PedidoController::confirmarPedido - Error email', [
                    'error' => $e->getMessage()
                ]);
                // El email falla en silencio — el pago ya está confirmado
            }

            Logger::error('PedidoController::confirmarPedido - PAGADO OK', [
                'pedido_id'           => $pedidoId,
                'wompi_transaction_id' => $wompiTransactionId,
            ]);

            return true;

        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('PedidoController::confirmarPedido', ['exception' => $e->getMessage()]);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  VERIFICAR ESTADO DE PAGO (frontend polling)
    // ═══════════════════════════════════════════════════════════════════════
    public static function verificarEstado(array $user): void
    {
        $referencia = $_GET['ref'] ?? null;
        if (!$referencia) {
            ResponseHandler::error('Parámetro ?ref= requerido.', 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT p.id, p.codigo_pedido, p.estado, p.total, p.iva,
                   p.costo_envio, p.subtotal, p.wompi_pagado_at,
                   p.wompi_referencia, p.fecha, p.usuario_id
            FROM pedidos p
            WHERE p.wompi_referencia = ?
        ");
        $stmt->execute([$referencia]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            ResponseHandler::error('Pedido no encontrado.', 404);
            return;
        }

        // Seguridad: solo el dueño del pedido puede consultarlo
        if ((int)$pedido['usuario_id'] !== (int)$user['id']) {
            ResponseHandler::error('No autorizado.', 403);
            return;
        }

        ResponseHandler::success([
            'estado'           => $pedido['estado'],
            'codigo_pedido'    => $pedido['codigo_pedido'],
            'total'            => (float)$pedido['total'],
            'wompi_pagado_at'  => $pedido['wompi_pagado_at'],
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  OBTENER MIS PEDIDOS (Cliente autenticado)
    // ═══════════════════════════════════════════════════════════════════════
    public static function obtenerMisPedidos(array $user): void
    {
        $db = Database::getConnection();

        try {
            $stmtPedidos = $db->prepare("
                SELECT
                    p.id, p.codigo_pedido, p.fecha, p.total, p.subtotal, p.iva,
                    p.costo_envio, p.estado, p.direccion_envio, p.ciudad,
                    p.departamento, p.telefono_contacto, p.metodo_pago,
                    p.notas, p.fecha_actualizacion, p.wompi_pagado_at
                FROM pedidos p
                WHERE p.usuario_id = ?
                  AND p.estado NOT IN ('draft')
                ORDER BY p.fecha DESC
            ");
            $stmtPedidos->execute([$user['id']]);
            $pedidos = $stmtPedidos->fetchAll();

            $stmtDetalles = $db->prepare("
                SELECT pd.id, pd.producto_id, pd.variante_id, pd.nombre_producto,
                       pd.imagen_url, pd.cantidad, pd.precio_unitario, pd.subtotal
                FROM pedido_detalles pd WHERE pd.pedido_id = ?
            ");

            foreach ($pedidos as &$pedido) {
                $stmtDetalles->execute([$pedido['id']]);
                $pedido['detalles']    = $stmtDetalles->fetchAll();
                $pedido['total_items'] = array_sum(array_column($pedido['detalles'], 'cantidad'));
            }

            ResponseHandler::success([
                'pedidos'       => $pedidos,
                'total_pedidos' => count($pedidos),
            ]);

        } catch (Throwable $e) {
            Logger::error('PedidoController::obtenerMisPedidos', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener los pedidos', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ADMIN: OBTENER TODOS LOS PEDIDOS
    // ═══════════════════════════════════════════════════════════════════════
    public static function adminObtenerTodos(array $user): void
    {
        $db = Database::getConnection();

        try {
            $stmtPedidos = $db->query("
                SELECT
                    p.id, p.codigo_pedido, p.usuario_id, p.fecha, p.total,
                    p.subtotal, p.iva, p.costo_envio, p.estado,
                    p.direccion_envio, p.ciudad, p.departamento,
                    p.telefono_contacto, p.metodo_pago, p.notas,
                    p.fecha_actualizacion, p.wompi_referencia, p.wompi_pagado_at,
                    u.nombre as cliente_nombre, u.correo as cliente_correo
                FROM pedidos p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                WHERE p.estado NOT IN ('draft')
                ORDER BY p.fecha DESC
            ");
            $pedidos = $stmtPedidos->fetchAll();

            $stmtDetalles = $db->prepare("
                SELECT pd.id, pd.producto_id, pd.variante_id, pd.nombre_producto,
                       pd.imagen_url, pd.cantidad, pd.precio_unitario, pd.subtotal
                FROM pedido_detalles pd WHERE pd.pedido_id = ?
            ");

            foreach ($pedidos as &$pedido) {
                $stmtDetalles->execute([$pedido['id']]);
                $pedido['detalles']    = $stmtDetalles->fetchAll();
                $pedido['total_items'] = array_sum(array_column($pedido['detalles'], 'cantidad'));
            }

            $stats = $db->query("
                SELECT
                    COUNT(*) as total_pedidos,
                    SUM(total) as ingresos_totales,
                    SUM(CASE WHEN estado IN ('pagado','pendiente','confirmado','en_preparacion','en_camino') THEN 1 ELSE 0 END) as pedidos_activos,
                    SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_entregados,
                    SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as pedidos_cancelados
                FROM pedidos WHERE estado NOT IN ('draft')
            ")->fetch();

            ResponseHandler::success([
                'pedidos'      => $pedidos,
                'estadisticas' => $stats,
            ]);

        } catch (Throwable $e) {
            Logger::error('PedidoController::adminObtenerTodos', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener los pedidos', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ADMIN: ACTUALIZAR ESTADO DEL PEDIDO
    // ═══════════════════════════════════════════════════════════════════════
    public static function adminActualizarEstado(int $pedidoId, array $user): void
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $nuevoEstado = $input['estado'] ?? null;

        $estadosValidos = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];
        if (!$nuevoEstado || !in_array($nuevoEstado, $estadosValidos)) {
            ResponseHandler::error(
                'Estado inválido. Estados válidos: ' . implode(', ', $estadosValidos), 400
            );
            return;
        }

        $db = Database::getConnection();

        try {
            $stmt = $db->prepare("
                SELECT p.*, u.nombre as cliente_nombre, u.correo as cliente_correo
                FROM pedidos p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                WHERE p.id = ?
            ");
            $stmt->execute([$pedidoId]);
            $pedido = $stmt->fetch();

            if (!$pedido) {
                ResponseHandler::error('Pedido no encontrado', 404);
                return;
            }

            $estadoAnterior = $pedido['estado'];

            $stmtUpdate = $db->prepare(
                "UPDATE pedidos SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?"
            );
            $stmtUpdate->execute([$nuevoEstado, $pedidoId]);

            try {
                if ($pedido['cliente_correo']) {
                    EmailService::enviarNotificacionEstadoPedido(
                        $pedido['cliente_correo'],
                        $pedido['cliente_nombre'] ?? 'Cliente',
                        $pedido['codigo_pedido'],
                        $estadoAnterior,
                        $nuevoEstado
                    );
                }
            } catch (Throwable $e) {
                Logger::error('PedidoController::adminActualizarEstado - Error email', [
                    'error' => $e->getMessage()
                ]);
            }

            ResponseHandler::success([
                'mensaje'         => "Estado actualizado de '{$estadoAnterior}' a '{$nuevoEstado}'",
                'codigo_pedido'   => $pedido['codigo_pedido'],
                'estado_anterior' => $estadoAnterior,
                'estado_nuevo'    => $nuevoEstado,
            ]);

        } catch (Throwable $e) {
            Logger::error('PedidoController::adminActualizarEstado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar el estado del pedido', 500);
        }
    }

    /**
     * Cancelar pedido por parte del cliente
     */
    public static function cancelarPedido(int $pedidoId, array $user): void
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("SELECT id, estado, usuario_id FROM pedidos WHERE id = ?");
            $stmt->execute([$pedidoId]);
            $pedido = $stmt->fetch();

            if (!$pedido) {
                ResponseHandler::error('Pedido no encontrado.', 404);
                return;
            }

            if ((int)$pedido['usuario_id'] !== (int)$user['id']) {
                ResponseHandler::error('No autorizado.', 403);
                return;
            }

            // No se pueden cancelar pedidos pagados/entregados
            $estadosNoCancelables = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
            if (in_array($pedido['estado'], $estadosNoCancelables)) {
                ResponseHandler::error('No puedes cancelar un pedido que ya ha sido pagado o procesado.', 400);
                return;
            }

            if ($pedido['estado'] === 'cancelado') {
                ResponseHandler::error('El pedido ya está cancelado.', 400);
                return;
            }

            $db->beginTransaction();

            // Actualizar estado a 'cancelado'
            $stmtUpdate = $db->prepare("UPDATE pedidos SET estado = 'cancelado', fecha_actualizacion = NOW() WHERE id = ?");
            $stmtUpdate->execute([$pedidoId]);

            // Liberar reservas de stock
            $stmtDeleteReservas = $db->prepare("DELETE FROM stock_reservas WHERE pedido_id = ?");
            $stmtDeleteReservas->execute([$pedidoId]);

            $db->commit();

            ResponseHandler::success(['mensaje' => 'Pedido cancelado correctamente.']);
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('PedidoController::cancelarPedido', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al cancelar el pedido.', 500);
        }
    }

    /**
     * Eliminar pedido por parte del cliente
     */
    public static function eliminarPedido(int $pedidoId, array $user): void
    {
        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("SELECT id, estado, usuario_id FROM pedidos WHERE id = ?");
            $stmt->execute([$pedidoId]);
            $pedido = $stmt->fetch();

            if (!$pedido) {
                ResponseHandler::error('Pedido no encontrado.', 404);
                return;
            }

            if ((int)$pedido['usuario_id'] !== (int)$user['id']) {
                ResponseHandler::error('No autorizado.', 403);
                return;
            }

            // No se pueden eliminar pedidos pagados/entregados
            $estadosNoEliminables = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
            if (in_array($pedido['estado'], $estadosNoEliminables)) {
                ResponseHandler::error('No puedes eliminar un pedido que ya ha sido pagado o procesado.', 400);
                return;
            }

            $db->beginTransaction();

            // Eliminar reservas de stock
            $stmtDeleteReservas = $db->prepare("DELETE FROM stock_reservas WHERE pedido_id = ?");
            $stmtDeleteReservas->execute([$pedidoId]);

            // Eliminar detalles del pedido
            $stmtDeleteDetalles = $db->prepare("DELETE FROM pedido_detalles WHERE pedido_id = ?");
            $stmtDeleteDetalles->execute([$pedidoId]);

            // Eliminar el pedido
            $stmtDeletePedido = $db->prepare("DELETE FROM pedidos WHERE id = ?");
            $stmtDeletePedido->execute([$pedidoId]);

            $db->commit();

            ResponseHandler::success(['mensaje' => 'Pedido eliminado correctamente.']);
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('PedidoController::eliminarPedido', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar el pedido.', 500);
        }
    }
}
