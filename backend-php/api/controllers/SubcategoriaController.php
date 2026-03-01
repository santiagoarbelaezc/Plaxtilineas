<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';

/**
 * SubcategoriaController – CRUD de subcategorías
 */
class SubcategoriaController
{
    // ─── GET /api/subcategorias ───────────────────────────────────────────────
    public static function obtenerSubcategorias(): void
    {
        $db   = Database::getConnection();
        $stmt = $db->query("
            SELECT s.id, s.nombre, s.categoria_id, c.nombre AS categoria
            FROM subcategorias s
            JOIN categorias c ON s.categoria_id = c.id
            ORDER BY c.nombre, s.nombre
        ");
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/subcategorias/por-categoria/:categoria_id ──────────────────
    public static function obtenerSubcategoriasPorCategoria(int $catId): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare("
            SELECT s.id, s.nombre, s.categoria_id, c.nombre AS categoria
            FROM subcategorias s
            JOIN categorias c ON s.categoria_id = c.id
            WHERE s.categoria_id = ?
            ORDER BY s.nombre
        ");
        $stmt->execute([$catId]);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── POST /api/subcategorias (protegido) ──────────────────────────────────
    public static function crearSubcategoria(): void
    {
        $body       = ResponseHandler::getBody();
        $nombre     = ResponseHandler::sanitize($body['nombre'] ?? '');
        $categoriaId = (int)($body['categoria_id'] ?? 0);

        if (!$nombre || !$categoriaId) {
            ResponseHandler::error('Nombre y categoria_id son obligatorios', 400);
        }

        $db   = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)');
        $stmt->execute([$nombre, $categoriaId]);

        ResponseHandler::success([
            'mensaje' => 'Subcategoría creada con éxito',
            'id'      => (int)$db->lastInsertId(),
        ], 201);
    }

    // ─── PUT /api/subcategorias/:id (protegido) ────────────────────────────────
    public static function actualizarSubcategoria(int $id): void
    {
        $body       = ResponseHandler::getBody();
        $nombre     = ResponseHandler::sanitize($body['nombre'] ?? '');
        $categoriaId = (int)($body['categoria_id'] ?? 0);

        $db   = Database::getConnection();
        $stmt = $db->prepare('UPDATE subcategorias SET nombre=?, categoria_id=? WHERE id=?');
        $stmt->execute([$nombre, $categoriaId, $id]);

        ResponseHandler::success(['mensaje' => 'Subcategoría actualizada']);
    }

    // ─── DELETE /api/subcategorias/:id (protegido) ────────────────────────────
    public static function eliminarSubcategoria(int $id): void
    {
        $db = Database::getConnection();

        // Verificar que no tenga productos asociados
        $check = $db->prepare('SELECT COUNT(*) as total FROM productos WHERE subcategoria_id = ?');
        $check->execute([$id]);
        $total = (int)$check->fetch()['total'];
        if ($total > 0) {
            ResponseHandler::error("No se puede eliminar: la subcategoría tiene {$total} producto(s) asociado(s)", 400);
        }

        $db->prepare('DELETE FROM subcategorias WHERE id = ?')->execute([$id]);
        ResponseHandler::success(['mensaje' => 'Subcategoría eliminada']);
    }
}
