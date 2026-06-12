<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';
require_once __DIR__ . '/../utils/EmailService.php';

/**
 * PedidoController – Gestión transaccional de pedidos
 * 
 * Endpoints:
 * - POST   /pedidos                       → crearPedido (usuario autenticado)
 * - GET    /pedidos/mis-pedidos            → obtenerMisPedidos (usuario autenticado)
 * - GET    /pedidos/admin/todos            → adminObtenerTodos (admin)
 * - PUT    /pedidos/admin/actualizar-estado/:id → adminActualizarEstado (admin)
 */
class PedidoController
{
    // ═══════════════════════════════════════════════════════════════════════
    //  CREAR PEDIDO (Cliente autenticado)
    // ═══════════════════════════════════════════════════════════════════════
    public static function crearPedido(array $user): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        // ── Validación ──────────────────────────────────────────────────
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

            // ── Generar código de pedido único (PX-2026-XXXX) ───────────
            $anio = date('Y');
            $stmt = $db->query("SELECT COUNT(*) as total FROM pedidos WHERE YEAR(fecha) = $anio");
            $row = $stmt->fetch();
            $correlativo = str_pad(($row['total'] ?? 0) + 1, 4, '0', STR_PAD_LEFT);
            $codigoPedido = "PX-{$anio}-{$correlativo}";

            // ── Calcular totales ────────────────────────────────────────
            $subtotal = 0;
            $detallesParaInsertar = [];

            foreach ($input['items'] as $item) {
                $productoId = (int)($item['producto_id'] ?? 0);
                $varianteId = !empty($item['variante_id']) ? (int)$item['variante_id'] : null;
                $cantidad = max(1, (int)($item['cantidad'] ?? 1));

                // Obtener producto actual para snapshot y validación de stock
                $stmtProd = $db->prepare("SELECT id, nombre, precio, stock, controlar_stock, imagen_url FROM productos WHERE id = ?");
                $stmtProd->execute([$productoId]);
                $producto = $stmtProd->fetch();

                if (!$producto) {
                    $db->rollBack();
                    ResponseHandler::error("Producto con ID {$productoId} no encontrado.", 404);
                    return;
                }

                // Determinar precio (variante o producto)
                $precioUnitario = $producto['precio'];
                $imagenUrl = $producto['imagen_url'];
                if ($varianteId) {
                    $stmtVar = $db->prepare("SELECT precio FROM variantes WHERE id = ? AND producto_id = ?");
                    $stmtVar->execute([$varianteId, $productoId]);
                    $variante = $stmtVar->fetch();
                    if ($variante && $variante['precio']) {
                        $precioUnitario = $variante['precio'];
                    }
                }

                // Validar stock
                if ($producto['controlar_stock'] && $producto['stock'] !== null) {
                    if ($cantidad > $producto['stock']) {
                        $db->rollBack();
                        ResponseHandler::error("Stock insuficiente para \"{$producto['nombre']}\". Disponible: {$producto['stock']}, solicitado: {$cantidad}.", 400);
                        return;
                    }
                }

                $subtotalItem = $precioUnitario * $cantidad;
                $subtotal += $subtotalItem;

                $detallesParaInsertar[] = [
                    'producto_id'     => $productoId,
                    'variante_id'     => $varianteId,
                    'nombre_producto' => $producto['nombre'],
                    'imagen_url'      => $imagenUrl,
                    'cantidad'        => $cantidad,
                    'precio_unitario' => $precioUnitario,
                ];
            }

            $total = $subtotal; // Futuramente se pueden sumar costos de envío / impuestos

            // ── Insertar pedido principal ────────────────────────────────
            $stmtPedido = $db->prepare("
                INSERT INTO pedidos 
                    (codigo_pedido, usuario_id, total, subtotal, estado, direccion_envio, ciudad, departamento, telefono_contacto, metodo_pago, notas)
                VALUES 
                    (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?)
            ");
            $stmtPedido->execute([
                $codigoPedido,
                $user['id'],
                $total,
                $subtotal,
                $input['direccion_envio'],
                $input['ciudad'] ?? null,
                $input['departamento'] ?? null,
                $input['telefono_contacto'] ?? null,
                $input['metodo_pago'] ?? 'contraentrega',
                $input['notas'] ?? null,
            ]);
            $pedidoId = (int)$db->lastInsertId();

            // ── Insertar detalles y deducir stock ───────────────────────
            $stmtDetalle = $db->prepare("
                INSERT INTO pedido_detalles 
                    (pedido_id, producto_id, variante_id, nombre_producto, imagen_url, cantidad, precio_unitario)
                VALUES 
                    (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtStock = $db->prepare("UPDATE productos SET stock = stock - ? WHERE id = ? AND controlar_stock = 1");

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

                // Deducir stock
                $stmtStock->execute([$det['cantidad'], $det['producto_id']]);
            }

            $db->commit();

            // ── Enviar email de confirmación (no bloquea) ───────────────
            try {
                $emailDestinatario = $user['correo'] ?? $user['email'] ?? null;
                if ($emailDestinatario) {
                    EmailService::enviarConfirmacionPedido(
                        $emailDestinatario,
                        $user['nombre'] ?? 'Cliente',
                        $codigoPedido,
                        $detallesParaInsertar,
                        $total
                    );
                }
            } catch (Throwable $e) {
                Logger::error('PedidoController::crearPedido - Error enviando email', [
                    'error' => $e->getMessage()
                ]);
            }

            ResponseHandler::success([
                'mensaje'       => 'Pedido creado exitosamente',
                'codigo_pedido' => $codigoPedido,
                'pedido_id'     => $pedidoId,
                'total'         => $total,
            ], 201);

        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('PedidoController::crearPedido', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear el pedido: ' . $e->getMessage(), 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  OBTENER MIS PEDIDOS (Cliente autenticado)
    // ═══════════════════════════════════════════════════════════════════════
    public static function obtenerMisPedidos(array $user): void
    {
        $db = Database::getConnection();

        try {
            // Obtener todos los pedidos del usuario
            $stmtPedidos = $db->prepare("
                SELECT 
                    p.id, p.codigo_pedido, p.fecha, p.total, p.subtotal, p.estado,
                    p.direccion_envio, p.ciudad, p.departamento, p.telefono_contacto,
                    p.metodo_pago, p.notas, p.fecha_actualizacion
                FROM pedidos p
                WHERE p.usuario_id = ?
                ORDER BY p.fecha DESC
            ");
            $stmtPedidos->execute([$user['id']]);
            $pedidos = $stmtPedidos->fetchAll();

            // Para cada pedido, obtener sus detalles
            $stmtDetalles = $db->prepare("
                SELECT 
                    pd.id, pd.producto_id, pd.variante_id, pd.nombre_producto, 
                    pd.imagen_url, pd.cantidad, pd.precio_unitario, pd.subtotal
                FROM pedido_detalles pd
                WHERE pd.pedido_id = ?
            ");

            foreach ($pedidos as &$pedido) {
                $stmtDetalles->execute([$pedido['id']]);
                $pedido['detalles'] = $stmtDetalles->fetchAll();
                $pedido['total_items'] = array_sum(array_column($pedido['detalles'], 'cantidad'));
            }

            ResponseHandler::success([
                'pedidos' => $pedidos,
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
                    p.id, p.codigo_pedido, p.usuario_id, p.fecha, p.total, p.subtotal, 
                    p.estado, p.direccion_envio, p.ciudad, p.departamento,
                    p.telefono_contacto, p.metodo_pago, p.notas, p.fecha_actualizacion,
                    u.nombre as cliente_nombre, u.correo as cliente_correo
                FROM pedidos p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                ORDER BY p.fecha DESC
            ");
            $pedidos = $stmtPedidos->fetchAll();

            $stmtDetalles = $db->prepare("
                SELECT 
                    pd.id, pd.producto_id, pd.variante_id, pd.nombre_producto, 
                    pd.imagen_url, pd.cantidad, pd.precio_unitario, pd.subtotal
                FROM pedido_detalles pd
                WHERE pd.pedido_id = ?
            ");

            foreach ($pedidos as &$pedido) {
                $stmtDetalles->execute([$pedido['id']]);
                $pedido['detalles'] = $stmtDetalles->fetchAll();
                $pedido['total_items'] = array_sum(array_column($pedido['detalles'], 'cantidad'));
            }

            // Estadísticas generales
            $stats = $db->query("
                SELECT 
                    COUNT(*) as total_pedidos,
                    SUM(total) as ingresos_totales,
                    SUM(CASE WHEN estado IN ('pendiente','confirmado','en_preparacion','en_camino') THEN 1 ELSE 0 END) as pedidos_activos,
                    SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_entregados,
                    SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as pedidos_cancelados
                FROM pedidos
            ")->fetch();

            ResponseHandler::success([
                'pedidos' => $pedidos,
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
            ResponseHandler::error('Estado inválido. Estados válidos: ' . implode(', ', $estadosValidos), 400);
            return;
        }

        $db = Database::getConnection();

        try {
            // Obtener pedido actual con datos del cliente
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

            // Actualizar estado
            $stmtUpdate = $db->prepare("UPDATE pedidos SET estado = ? WHERE id = ?");
            $stmtUpdate->execute([$nuevoEstado, $pedidoId]);

            // Enviar notificación por email al cliente
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
}
