<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * AdminUserController - Gestión avanzada de usuarios y sus carritos/pedidos para panel de administración
 */
class AdminUserController
{
    /**
     * GET /api/admin/usuarios-detalle
     * Retorna la lista de usuarios registrados con sus datos de perfil,
     * el total de sus compras confirmadas/entregadas, el estado de sus pedidos
     * y los productos activos que tienen en el carrito.
     */
    public static function obtenerUsuariosDetalle(array $user): void
    {
        try {
            $db = Database::getConnection();

            // 1. Obtener todos los usuarios del sistema (excepto administradores o según rol)
            $stmtUsers = $db->query("
                SELECT id, nombre, apellidos, correo, edad, direccion, ciudad, rol, email_verificado 
                FROM usuarios 
                WHERE rol != 'admin'
                ORDER BY nombre ASC
            ");
            $usuarios = $stmtUsers->fetchAll();

            // 2. Por cada usuario, obtener sus compras y carrito
            foreach ($usuarios as &$u) {
                // Obtener total comprado
                $stmtTotal = $db->prepare("
                    SELECT COALESCE(SUM(total), 0) as total_compras, COUNT(*) as cantidad_pedidos 
                    FROM pedidos 
                    WHERE usuario_id = ? AND estado != 'cancelado'
                ");
                $stmtTotal->execute([$u['id']]);
                $compraStats = $stmtTotal->fetch();
                $u['total_compras'] = (float)$compraStats['total_compras'];
                $u['cantidad_pedidos'] = (int)$compraStats['cantidad_pedidos'];

                // Obtener lista de pedidos detallada
                $stmtPedidos = $db->prepare("
                    SELECT id, codigo_pedido, fecha, total, estado 
                    FROM pedidos 
                    WHERE usuario_id = ?
                    ORDER BY fecha DESC
                ");
                $stmtPedidos->execute([$u['id']]);
                $u['pedidos'] = $stmtPedidos->fetchAll();

                // Obtener items del carrito
                $stmtCarrito = $db->prepare("
                    SELECT c.id, c.cantidad, c.precio_unitario, p.nombre as producto_nombre, p.imagen_url
                    FROM carritos c
                    JOIN productos p ON c.producto_id = p.id
                    WHERE c.usuario_id = ?
                ");
                $stmtCarrito->execute([$u['id']]);
                $u['carrito'] = $stmtCarrito->fetchAll();
            }

            ResponseHandler::success($usuarios);

        } catch (Throwable $e) {
            Logger::error('AdminUserController::obtenerUsuariosDetalle', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener el detalle de usuarios.', 500);
        }
    }

    /**
     * DELETE /api/admin/usuarios/:id
     * Elimina a un usuario si no tiene pedidos activos pendientes
     */
    public static function eliminarUsuario(int $usuarioId): void
    {
        try {
            $db = Database::getConnection();
            $db->beginTransaction();

            // Verificar si el usuario existe y no es admin
            $stmtUser = $db->prepare("SELECT id, rol FROM usuarios WHERE id = ?");
            $stmtUser->execute([$usuarioId]);
            $userToDelete = $stmtUser->fetch();

            if (!$userToDelete) {
                $db->rollBack();
                ResponseHandler::error('Usuario no encontrado.', 404);
                return;
            }

            if ($userToDelete['rol'] === 'admin') {
                $db->rollBack();
                ResponseHandler::error('No se pueden eliminar administradores.', 403);
                return;
            }

            // Verificar si tiene pedidos activos ('cancelado', 'entregado', 'draft' no bloquean)
            $stmtPedidosActivos = $db->prepare("
                SELECT COUNT(*) FROM pedidos 
                WHERE usuario_id = ? 
                AND estado NOT IN ('cancelado', 'entregado', 'draft')
            ");
            $stmtPedidosActivos->execute([$usuarioId]);
            $pedidosActivos = (int)$stmtPedidosActivos->fetchColumn();

            if ($pedidosActivos > 0) {
                $db->rollBack();
                ResponseHandler::error('El usuario tiene pedidos pendientes y no puede ser eliminado.', 400);
                return;
            }

            // Eliminar carrito del usuario
            $stmtCarrito = $db->prepare("DELETE FROM carritos WHERE usuario_id = ?");
            $stmtCarrito->execute([$usuarioId]);

            // Desvincular pedidos pasados o cancelados (para mantener historial de ventas)
            $stmtUpdatePedidos = $db->prepare("UPDATE pedidos SET usuario_id = NULL WHERE usuario_id = ?");
            $stmtUpdatePedidos->execute([$usuarioId]);

            // Eliminar al usuario
            $stmtDelete = $db->prepare("DELETE FROM usuarios WHERE id = ?");
            $stmtDelete->execute([$usuarioId]);

            $db->commit();
            ResponseHandler::success(['mensaje' => 'Usuario eliminado correctamente.']);

        } catch (Throwable $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            Logger::error('AdminUserController::eliminarUsuario', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar el usuario.', 500);
        }
    }
}
