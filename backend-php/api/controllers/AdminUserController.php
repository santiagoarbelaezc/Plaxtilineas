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
}
