<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';

/**
 * VarianteController – CRUD de variantes de productos
 */
class VarianteController
{
    // ─── GET /api/variantes/producto/:producto_id ─────────────────────────────
    public static function obtenerVariantesPorProducto(int $prodId): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM variantes WHERE producto_id = ? ORDER BY precio ASC');
        $stmt->execute([$prodId]);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/variantes/:id ───────────────────────────────────────────────
    public static function obtenerVariantePorId(int $id): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM variantes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) ResponseHandler::error('Variante no encontrada', 404);
        ResponseHandler::success($row);
    }

    // ─── POST /api/variantes (protegido) ──────────────────────────────────────
    public static function crearVariante(): void
    {
        $body      = ResponseHandler::getBody();
        $prodId    = (int)($body['producto_id'] ?? 0);
        $nombre    = ResponseHandler::sanitize($body['nombre'] ?? '');
        $precio    = isset($body['precio']) ? (float)$body['precio'] : null;

        if (!$prodId || !$nombre || $precio === null || !is_numeric($precio)) {
            ResponseHandler::error('Datos de variante inválidos (producto_id, nombre, precio)', 400);
        }

        $db   = Database::getConnection();
        $stmt = $db->prepare('INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)');
        $stmt->execute([$prodId, $nombre, $precio]);

        ResponseHandler::success([
            'mensaje' => 'Variante creada con éxito',
            'id'      => (int)$db->lastInsertId(),
        ], 201);
    }

    // ─── PUT /api/variantes/:id (protegido) ───────────────────────────────────
    public static function actualizarVariante(int $id): void
    {
        $body   = ResponseHandler::getBody();
        $nombre = isset($body['nombre']) ? ResponseHandler::sanitize($body['nombre']) : null;
        $precio = isset($body['precio']) ? (float)$body['precio'] : null;

        if ($nombre === null && $precio === null) {
            ResponseHandler::error('Debe proporcionar nombre o precio para actualizar', 400);
        }

        $sets   = [];
        $params = [];
        if ($nombre !== null) { $sets[] = 'nombre = ?'; $params[] = $nombre; }
        if ($precio !== null) { $sets[] = 'precio = ?'; $params[] = $precio; }
        $params[] = $id;

        $db   = Database::getConnection();
        $stmt = $db->prepare('UPDATE variantes SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) ResponseHandler::error('Variante no encontrada', 404);

        $updated = $db->prepare('SELECT * FROM variantes WHERE id = ?');
        $updated->execute([$id]);

        ResponseHandler::success([
            'mensaje'  => 'Variante actualizada con éxito',
            'variante' => $updated->fetch(),
        ]);
    }

    // ─── DELETE /api/variantes/:id (protegido) ────────────────────────────────
    public static function eliminarVariante(int $id): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM variantes WHERE id = ?');
        $stmt->execute([$id]);
        ResponseHandler::success(['mensaje' => 'Variante eliminada exitosamente']);
    }
}
