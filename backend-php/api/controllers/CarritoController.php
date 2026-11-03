<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * CarritoController - Sincroniza y visualiza los carritos de compras activos de usuarios
 */
class CarritoController
{
    /**
     * Limpia los carritos expirados (más de 24 horas sin actualizar)
     * y devuelve el stock reservado al inventario.
     */
    public static function limpiarCarritosExpirados(PDO $db): void
    {
        try {
            // Buscar items de carritos expirados (más de 24 horas sin actualizar)
            $stmt = $db->query("
                SELECT c.id, c.producto_id, c.cantidad
                FROM carritos c
                WHERE c.updated_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $expirados = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($expirados)) {
                $stmtReturnStock = $db->prepare("
                    UPDATE productos 
                    SET stock = stock + ? 
                    WHERE id = ? AND controlar_stock = 1
                ");
                $stmtDelete = $db->prepare("DELETE FROM carritos WHERE id = ?");

                foreach ($expirados as $item) {
                    // Devolver stock al inventario
                    $stmtReturnStock->execute([$item['cantidad'], $item['producto_id']]);
                    // Eliminar registro del carrito
                    $stmtDelete->execute([$item['id']]);
                }

                Logger::error('CarritoController::limpiarCarritosExpirados - Carritos expirados limpiados', [
                    'cantidad_items' => count($expirados)
                ]);
            }
        } catch (Throwable $e) {
            Logger::error('CarritoController::limpiarCarritosExpirados - Error', [
                'exception' => $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/carrito/sync
     * Guarda/sincroniza el carrito actual del cliente autenticado
     */
    public static function sync(array $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $newItemsInput = $input['items'] ?? [];

            if (!is_array($newItemsInput)) {
                ResponseHandler::error('Los items deben ser un arreglo.', 400);
                return;
            }

            $db = Database::getConnection();
            $db->beginTransaction();

            // ─── 0. Limpiar carritos expirados globalmente en la transacción ───
            self::limpiarCarritosExpirados($db);

            // ─── 1. Obtener carrito actual del usuario en la base de datos ───
            $stmtOld = $db->prepare("SELECT producto_id, cantidad FROM carritos WHERE usuario_id = ?");
            $stmtOld->execute([$user['id']]);
            $oldItems = $stmtOld->fetchAll(PDO::FETCH_KEY_PAIR); // [producto_id => cantidad]

            // ─── 2. Procesar y agrupar nuevos items ───────────────────────────
            $newItems = [];
            foreach ($newItemsInput as $item) {
                $productoId = (int)($item['producto_id'] ?? 0);
                $cantidad = max(0, (int)($item['cantidad'] ?? 0));
                if ($productoId > 0 && $cantidad > 0) {
                    if (isset($newItems[$productoId])) {
                        $newItems[$productoId] += $cantidad;
                    } else {
                        $newItems[$productoId] = $cantidad;
                    }
                }
            }

            // ─── 3. Calcular diferencias y ajustar stock ──────────────────────
            // Combinar todas las llaves (producto_id) de antiguos y nuevos
            $allProductIds = array_unique(array_merge(array_keys($oldItems), array_keys($newItems)));

            $stmtCheckStock = $db->prepare("SELECT stock, controlar_stock, nombre FROM productos WHERE id = ? FOR UPDATE");
            $stmtDeductStock = $db->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
            $stmtReturnStock = $db->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");

            foreach ($allProductIds as $prodId) {
                $oldQty = $oldItems[$prodId] ?? 0;
                $newQty = $newItems[$prodId] ?? 0;
                $diff = $newQty - $oldQty;

                if ($diff === 0) continue;

                // Consultar stock actual y si se controla stock
                $stmtCheckStock->execute([$prodId]);
                $prodData = $stmtCheckStock->fetch(PDO::FETCH_ASSOC);

                if (!$prodData) continue;

                if ($prodData['controlar_stock'] == 1) {
                    if ($diff > 0) {
                        // Se agregaron más unidades, validar si hay suficiente stock
                        if ($prodData['stock'] < $diff) {
                            $db->rollBack();
                            ResponseHandler::error(
                                "Stock insuficiente para \"{$prodData['nombre']}\". "
                                . "Disponible para reservar: {$prodData['stock']}.",
                                400
                            );
                            return;
                        }
                        // Deducir stock
                        $stmtDeductStock->execute([$diff, $prodId]);
                    } else {
                        // Se quitaron unidades o se eliminó el item, devolver stock
                        $returnQty = abs($diff);
                        $stmtReturnStock->execute([$returnQty, $prodId]);
                    }
                }
            }

            // ─── 4. Eliminar el carrito anterior del usuario ──────────────────
            $stmtDel = $db->prepare("DELETE FROM carritos WHERE usuario_id = ?");
            $stmtDel->execute([$user['id']]);

            // ─── 5. Insertar los items actuales ───────────────────────────────
            if (!empty($newItemsInput)) {
                $stmtInsert = $db->prepare("
                    INSERT INTO carritos (usuario_id, producto_id, variante_id, cantidad, precio_unitario) 
                    VALUES (?, ?, ?, ?, ?)
                ");

                foreach ($newItemsInput as $item) {
                    $productoId = (int)($item['producto_id'] ?? 0);
                    $varianteId = !empty($item['variante_id']) ? (int)$item['variante_id'] : null;
                    $cantidad = max(1, (int)($item['cantidad'] ?? 1));
                    $precioUnitario = (float)($item['precio_unitario'] ?? 0);

                    if ($productoId > 0) {
                        $stmtInsert->execute([$user['id'], $productoId, $varianteId, $cantidad, $precioUnitario]);
                    }
                }
            }

            $db->commit();
            ResponseHandler::success(['mensaje' => 'Carrito sincronizado exitosamente.']);

        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('CarritoController::sync', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al sincronizar el carrito.', 500);
        }
    }
}
