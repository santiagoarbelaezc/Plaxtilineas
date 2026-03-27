<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/CloudinaryHelper.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * CategoriaController – CRUD de categorías con ícono en Cloudinary
 */
class CategoriaController
{
    // ─── GET /api/categorias ─────────────────────────────────────────────────
    public static function obtenerCategorias(): void
    {
        try {
            $db   = Database::getConnection();
            $stmt = $db->query('SELECT * FROM categorias ORDER BY nombre ASC');
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('CategoriaController::obtenerCategorias – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener categorías', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::obtenerCategorias – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::obtenerCategorias', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/categorias/con-subcategorias ────────────────────────────────
    public static function obtenerCategoriasConSubcategorias(): void
    {
        try {
            $db  = Database::getConnection();
            $sql = "
                SELECT
                    c.id    AS categoria_id,
                    c.nombre AS categoria_nombre,
                    c.icono_url,
                    s.id    AS subcategoria_id,
                    s.nombre AS subcategoria_nombre,
                    COUNT(p.id) AS cantidad_productos
                FROM categorias c
                LEFT JOIN subcategorias s ON s.categoria_id = c.id
                LEFT JOIN productos p     ON p.subcategoria_id = s.id
                GROUP BY c.id, s.id
                ORDER BY c.nombre, s.nombre
            ";

            $rows      = $db->query($sql)->fetchAll();
            $categorias = [];

            foreach ($rows as $row) {
                if (!$row['subcategoria_id']) continue;

                if (!isset($categorias[$row['categoria_id']])) {
                    $categorias[$row['categoria_id']] = [
                        'id'            => $row['categoria_id'],
                        'nombre'        => $row['categoria_nombre'],
                        'icono_url'     => $row['icono_url'],
                        'subcategorias' => [],
                    ];
                }
                $categorias[$row['categoria_id']]['subcategorias'][] = [
                    'id'       => $row['subcategoria_id'],
                    'nombre'   => $row['subcategoria_nombre'],
                    'cantidad' => (int)$row['cantidad_productos'],
                ];
            }

            ResponseHandler::success(array_values($categorias));

        } catch (PDOException $e) {
            Logger::error('CategoriaController::obtenerCategoriasConSubcategorias – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener categorías con subcategorías', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::obtenerCategoriasConSubcategorias – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::obtenerCategoriasConSubcategorias', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/categorias/nombre/:nombre ───────────────────────────────────
    public static function obtenerPorNombre(string $nombre): void
    {
        try {
            $nombre = ResponseHandler::sanitize(urldecode($nombre));
            if (!$nombre) {
                throw new InvalidArgumentException('El nombre es obligatorio');
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT id, nombre, icono_url FROM categorias WHERE nombre = ?');
            $stmt->execute([$nombre]);
            $row = $stmt->fetch();

            if (!$row) ResponseHandler::error('Categoría no encontrada', 404);
            ResponseHandler::success(['success' => true, 'categoria' => $row]);

        } catch (PDOException $e) {
            Logger::error('CategoriaController::obtenerPorNombre – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al buscar categoría por nombre', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::obtenerPorNombre – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::obtenerPorNombre', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/categorias/id-por-nombre/:nombre ────────────────────────────
    public static function getIdPorNombre(string $nombre): void
    {
        try {
            $nombre = ResponseHandler::sanitize(urldecode($nombre));
            if (!$nombre) {
                throw new InvalidArgumentException('Nombre requerido');
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT id, nombre FROM categorias WHERE nombre = ? LIMIT 1');
            $stmt->execute([$nombre]);
            $row = $stmt->fetch();

            if (!$row) ResponseHandler::error("Categoría '{$nombre}' no encontrada", 404);
            ResponseHandler::success([
                'success'   => true,
                'categoria' => [
                    'id'     => (int)$row['id'],
                    'nombre' => $row['nombre']
                ]
            ]);

        } catch (PDOException $e) {
            Logger::error('CategoriaController::getIdPorNombre – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener ID de categoría por nombre', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::getIdPorNombre – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::getIdPorNombre', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── POST /api/categorias (protegido, multipart) ─────────────────────────
    public static function crearCategoria(): void
    {
        try {
            $nombre = ResponseHandler::sanitize($_POST['nombre'] ?? '');
            if (!$nombre) {
                throw new InvalidArgumentException('El nombre es obligatorio');
            }

            $db    = Database::getConnection();
            $check = $db->prepare('SELECT id FROM categorias WHERE nombre = ?');
            $check->execute([$nombre]);
            if ($check->fetch()) {
                ResponseHandler::error('La categoría ya existe', 409);
            }

            $iconoUrl      = '';
            $iconoPublicId = '';

            if (!empty($_FILES['icono']['tmp_name'])) {
                try {
                    $result        = CloudinaryHelper::upload($_FILES['icono']['tmp_name'], 'categorias');
                    $iconoUrl      = $result['url'];
                    $iconoPublicId = $result['public_id'];
                } catch (Throwable $e) {
                    ResponseHandler::error('Error al subir ícono: ' . $e->getMessage(), 500);
                }
            }

            $stmt = $db->prepare('INSERT INTO categorias (nombre, icono_url, icono_public_id) VALUES (?, ?, ?)');
            $stmt->execute([$nombre, $iconoUrl, $iconoPublicId]);

            ResponseHandler::success([
                'mensaje'   => 'Categoría creada con éxito',
                'id'        => (int)$db->lastInsertId(),
                'nombre'    => $nombre,
                'icono_url' => $iconoUrl,
            ], 201);

        } catch (PDOException $e) {
            Logger::error('CategoriaController::crearCategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear categoría en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::crearCategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::crearCategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── PUT /api/categorias/:id (protegido) ──────────────────────────────────
    public static function actualizarCategoria(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de categoría debe ser un entero positivo');
            }
            $nombre = ResponseHandler::sanitize($_POST['nombre'] ?? '');
            if (!$nombre) {
                if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                    throw new InvalidArgumentException('El nombre es obligatorio. Nota: asegúrate de usar POST para actualizar categorías con íconos.');
                }
                throw new InvalidArgumentException('El nombre es obligatorio');
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT id, nombre, icono_url, icono_public_id FROM categorias WHERE id = ?');
            $stmt->execute([$id]);
            $actual = $stmt->fetch();
            if (!$actual) ResponseHandler::error('Categoría no encontrada', 404);

            if ($nombre !== $actual['nombre']) {
                $dup = $db->prepare('SELECT id FROM categorias WHERE nombre = ? AND id != ?');
                $dup->execute([$nombre, $id]);
                if ($dup->fetch()) ResponseHandler::error('Ya existe otra categoría con ese nombre', 409);
            }

            $nuevaIconoUrl = null;
            $nuevoPublicId = null;

            if (!empty($_FILES['icono']['tmp_name'])) {
                try {
                    $result        = CloudinaryHelper::upload($_FILES['icono']['tmp_name'], 'categorias');
                    $nuevaIconoUrl = $result['url'];
                    $nuevoPublicId = $result['public_id'];

                    if ($actual['icono_public_id']) {
                        CloudinaryHelper::delete($actual['icono_public_id']);
                    }
                } catch (Throwable $e) {
                    ResponseHandler::error('Error al subir ícono: ' . $e->getMessage(), 500);
                }
            }

            $iconoFinal    = $nuevaIconoUrl ?? $actual['icono_url'];
            $publicIdFinal = $nuevoPublicId ?? $actual['icono_public_id'];

            $db->prepare('UPDATE categorias SET nombre=?, icono_url=?, icono_public_id=? WHERE id=?')
               ->execute([$nombre, $iconoFinal, $publicIdFinal, $id]);

            ResponseHandler::success([
                'mensaje'   => 'Categoría actualizada correctamente',
                'categoria' => ['id' => $id, 'nombre' => $nombre, 'icono_url' => $iconoFinal],
            ]);

        } catch (PDOException $e) {
            Logger::error('CategoriaController::actualizarCategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar categoría en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::actualizarCategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::actualizarCategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── DELETE /api/categorias/:id (protegido) ───────────────────────────────
    public static function eliminarCategoria(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID de categoría debe ser un entero positivo');
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare('SELECT nombre, icono_public_id FROM categorias WHERE id = ?');
            $stmt->execute([$id]);
            $cat = $stmt->fetch();

            if (!$cat) ResponseHandler::error('Categoría no encontrada', 404);

            $sub = $db->prepare('SELECT COUNT(*) as total FROM subcategorias WHERE categoria_id = ?');
            $sub->execute([$id]);
            $total = (int)$sub->fetch()['total'];

            if ($total > 0) {
                ResponseHandler::error(
                    "No se puede eliminar. La categoría \"{$cat['nombre']}\" tiene {$total} subcategoría(s) asociada(s).",
                    400
                );
            }

            if ($cat['icono_public_id']) {
                CloudinaryHelper::delete($cat['icono_public_id']);
            }

            $db->prepare('DELETE FROM categorias WHERE id = ?')->execute([$id]);
            ResponseHandler::success(['mensaje' => 'Categoría eliminada correctamente', 'eliminado' => true]);

        } catch (PDOException $e) {
            Logger::error('CategoriaController::eliminarCategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar categoría de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('CategoriaController::eliminarCategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en CategoriaController::eliminarCategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }
}
