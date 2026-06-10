<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * SubcategoriaController – CRUD de subcategorías
 */
class SubcategoriaController
{
    // ─── GET /api/subcategorias ───────────────────────────────────────────────
    public static function obtenerSubcategorias(): void
    {
        try {
            $db   = Database::getConnection();
            $stmt = $db->query("
                SELECT s.id, s.nombre, s.categoria_id, c.nombre AS categoria
                FROM subcategorias s
                JOIN categorias c ON s.categoria_id = c.id
                ORDER BY c.nombre, s.nombre
            ");
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('SubcategoriaController::obtenerSubcategorias – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener subcategorías', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('SubcategoriaController::obtenerSubcategorias – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en SubcategoriaController::obtenerSubcategorias', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/subcategorias/por-categoria/:categoria_id ──────────────────
    public static function obtenerSubcategoriasPorCategoria(int $catId): void
    {
        try {
            if ($catId <= 0) {
                throw new InvalidArgumentException('El ID de categoría debe ser un entero positivo');
            }
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

        } catch (PDOException $e) {
            Logger::error('SubcategoriaController::obtenerSubcategoriasPorCategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener subcategorías por categoría', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('SubcategoriaController::obtenerSubcategoriasPorCategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en SubcategoriaController::obtenerSubcategoriasPorCategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── POST /api/subcategorias (protegido) ──────────────────────────────────
    public static function crearSubcategoria(): void
    {
        try {
            $body        = ResponseHandler::getBody();
            $nombre      = ResponseHandler::sanitize($body['nombre'] ?? '');
            $categoriaId = (int)($body['categoria_id'] ?? 0);

            if (!$nombre) {
                throw new InvalidArgumentException("El campo 'nombre' es requerido");
            }
            if (!$categoriaId) {
                throw new InvalidArgumentException("El campo 'categoria_id' es requerido");
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare('INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)');
            $stmt->execute([$nombre, $categoriaId]);

            ResponseHandler::success([
                'mensaje' => 'Subcategoría creada con éxito',
                'id'      => (int)$db->lastInsertId(),
            ], 201);

        } catch (PDOException $e) {
            Logger::error('SubcategoriaController::crearSubcategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear subcategoría en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('SubcategoriaController::crearSubcategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en SubcategoriaController::crearSubcategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── PUT /api/subcategorias/:id (protegido) ────────────────────────────────
    public static function actualizarSubcategoria(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de subcategoría debe ser un entero positivo');
            }
            $body        = ResponseHandler::getBody();
            $nombre      = ResponseHandler::sanitize($body['nombre'] ?? '');
            $categoriaId = (int)($body['categoria_id'] ?? 0);

            $db   = Database::getConnection();
            $stmt = $db->prepare('UPDATE subcategorias SET nombre=?, categoria_id=? WHERE id=?');
            $stmt->execute([$nombre, $categoriaId, $id]);

            ResponseHandler::success(['mensaje' => 'Subcategoría actualizada']);

        } catch (PDOException $e) {
            Logger::error('SubcategoriaController::actualizarSubcategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar subcategoría en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('SubcategoriaController::actualizarSubcategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en SubcategoriaController::actualizarSubcategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── DELETE /api/subcategorias/:id (protegido) ────────────────────────────
    public static function eliminarSubcategoria(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de subcategoría debe ser un entero positivo');
            }
            $db    = Database::getConnection();
            $check = $db->prepare('SELECT COUNT(*) as total FROM productos WHERE subcategoria_id = ?');
            $check->execute([$id]);
            $total = (int)$check->fetch()['total'];

            if ($total > 0) {
                ResponseHandler::error("No se puede eliminar: la subcategoría tiene {$total} producto(s) asociado(s)", 400);
            }

            $db->prepare('DELETE FROM subcategorias WHERE id = ?')->execute([$id]);
            ResponseHandler::success(['mensaje' => 'Subcategoría eliminada']);

        } catch (PDOException $e) {
            Logger::error('SubcategoriaController::eliminarSubcategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar subcategoría de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('SubcategoriaController::eliminarSubcategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en SubcategoriaController::eliminarSubcategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── DELETE /api/subcategorias/eliminar-todas (protegido) ────────────────
    public static function eliminarTodas(): void
    {
        try {
            $db = Database::getConnection();

            $prod = $db->query('SELECT COUNT(*) as total FROM productos');
            $totalProd = (int)$prod->fetch()['total'];

            if ($totalProd > 0) {
                ResponseHandler::error(
                    "No se pueden eliminar todas las subcategorías porque aún existen {$totalProd} producto(s). Elimina los productos primero.",
                    400
                );
            }

            $delStmt = $db->prepare('DELETE FROM subcategorias');
            $delStmt->execute();

            ResponseHandler::success([
                'mensaje' => 'Todas las subcategorías han sido eliminadas con éxito',
                'eliminadas' => $delStmt->rowCount()
            ]);

        } catch (PDOException $e) {
            Logger::error('SubcategoriaController::eliminarTodas – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar todas las subcategorías de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('SubcategoriaController::eliminarTodas – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }
}
