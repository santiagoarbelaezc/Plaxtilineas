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
     * POST /api/carrito/sync
     * Guarda/sincroniza el carrito actual del cliente autenticado
     */
    public static function sync(array $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $items = $input['items'] ?? [];

            if (!is_array($items)) {
                ResponseHandler::error('Los items deben ser un arreglo.', 400);
                return;
            }

            $db = Database::getConnection();
            $db->beginTransaction();

            // 1. Eliminar el carrito anterior del usuario
            $stmtDel = $db->prepare("DELETE FROM carritos WHERE usuario_id = ?");
            $stmtDel->execute([$user['id']]);

            // 2. Insertar los items actuales
            if (!empty($items)) {
                $stmtInsert = $db->prepare("
                    INSERT INTO carritos (usuario_id, producto_id, variante_id, cantidad, precio_unitario) 
                    VALUES (?, ?, ?, ?, ?)
                ");

                foreach ($items as $item) {
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
