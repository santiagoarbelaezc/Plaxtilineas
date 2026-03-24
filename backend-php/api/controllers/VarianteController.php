<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * VarianteController – CRUD de variantes de productos
 */
class VarianteController
{
    // ─── GET /api/variantes/producto/:producto_id ─────────────────────────────
    public static function obtenerVariantesPorProducto(int $prodId): void
    {
        try {
            if ($prodId <= 0) {
                throw new InvalidArgumentException('El ID del producto debe ser un entero positivo');
            }
            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT * FROM variantes WHERE producto_id = ? ORDER BY precio ASC');
            $stmt->execute([$prodId]);
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('VarianteController::obtenerVariantesPorProducto – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener variantes del producto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('VarianteController::obtenerVariantesPorProducto – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en VarianteController::obtenerVariantesPorProducto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/variantes/:id ───────────────────────────────────────────────
    public static function obtenerVariantePorId(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de variante debe ser un entero positivo');
            }
            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT * FROM variantes WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();

            if (!$row) ResponseHandler::error('Variante no encontrada', 404);
            ResponseHandler::success($row);

        } catch (PDOException $e) {
            Logger::error('VarianteController::obtenerVariantePorId – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener variante', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('VarianteController::obtenerVariantePorId – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en VarianteController::obtenerVariantePorId', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── POST /api/variantes (protegido) ──────────────────────────────────────
    public static function crearVariante(): void
    {
        try {
            $body   = ResponseHandler::getBody();
            $prodId = (int)($body['producto_id'] ?? 0);
            $nombre = ResponseHandler::sanitize($body['nombre'] ?? '');
            $precio = isset($body['precio']) ? (float)$body['precio'] : null;

            if (!$prodId) {
                throw new InvalidArgumentException("El campo 'producto_id' es requerido y debe ser mayor que 0");
            }
            if (!$nombre) {
                throw new InvalidArgumentException("El campo 'nombre' es requerido");
            }
            if ($precio === null || !is_numeric($body['precio'] ?? null)) {
                throw new InvalidArgumentException("El campo 'precio' es requerido y debe ser un número");
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare('INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)');
            $stmt->execute([$prodId, $nombre, $precio]);

            ResponseHandler::success([
                'mensaje' => 'Variante creada con éxito',
                'id'      => (int)$db->lastInsertId(),
            ], 201);

        } catch (PDOException $e) {
            Logger::error('VarianteController::crearVariante – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear variante en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('VarianteController::crearVariante – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en VarianteController::crearVariante', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── PUT /api/variantes/:id (protegido) ───────────────────────────────────
    public static function actualizarVariante(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de variante debe ser un entero positivo');
            }
            $body   = ResponseHandler::getBody();
            $nombre = isset($body['nombre']) ? ResponseHandler::sanitize($body['nombre']) : null;
            $precio = isset($body['precio']) ? (float)$body['precio'] : null;

            if ($nombre === null && $precio === null) {
                throw new InvalidArgumentException('Debe proporcionar nombre o precio para actualizar');
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

        } catch (PDOException $e) {
            Logger::error('VarianteController::actualizarVariante – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar variante en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('VarianteController::actualizarVariante – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en VarianteController::actualizarVariante', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── DELETE /api/variantes/:id (protegido) ────────────────────────────────
    public static function eliminarVariante(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de variante debe ser un entero positivo');
            }
            $db   = Database::getConnection();
            $stmt = $db->prepare('DELETE FROM variantes WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) ResponseHandler::error('Variante no encontrada', 404);

            ResponseHandler::success(['mensaje' => 'Variante eliminada exitosamente']);

        } catch (PDOException $e) {
            Logger::error('VarianteController::eliminarVariante – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar variante de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('VarianteController::eliminarVariante – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en VarianteController::eliminarVariante', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }
}
