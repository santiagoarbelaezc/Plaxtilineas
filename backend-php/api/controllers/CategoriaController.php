<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/CloudinaryHelper.php';

/**
 * CategoriaController – CRUD de categorías con ícono en Cloudinary
 */
class CategoriaController
{
    // ─── GET /api/categorias ─────────────────────────────────────────────────
    public static function obtenerCategorias(): void
    {
        $db   = Database::getConnection();
        $stmt = $db->query('SELECT * FROM categorias ORDER BY nombre ASC');
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/categorias/con-subcategorias ────────────────────────────────
    public static function obtenerCategoriasConSubcategorias(): void
    {
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
    }

    // ─── GET /api/categorias/nombre/:nombre ───────────────────────────────────
    public static function obtenerPorNombre(string $nombre): void
    {
        $nombre = ResponseHandler::sanitize(urldecode($nombre));
        if (!$nombre) ResponseHandler::error('El nombre es obligatorio', 400);

        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT id, nombre, icono_url FROM categorias WHERE nombre = ?');
        $stmt->execute([$nombre]);
        $row = $stmt->fetch();

        if (!$row) ResponseHandler::error('Categoría no encontrada', 404);
        ResponseHandler::success(['success' => true, 'categoria' => $row]);
    }

    // ─── GET /api/categorias/id-por-nombre/:nombre ────────────────────────────
    // Devuelve {id, nombre} — usado por el frontend Angular (carousel, etc.)
    public static function getIdPorNombre(string $nombre): void
    {
        $nombre = ResponseHandler::sanitize(urldecode($nombre));
        if (!$nombre) ResponseHandler::error('Nombre requerido', 400);

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
    }


    // ─── POST /api/categorias (protegido, multipart) ─────────────────────────
    public static function crearCategoria(): void
    {
        $nombre = ResponseHandler::sanitize($_POST['nombre'] ?? '');
        if (!$nombre) ResponseHandler::error('El nombre es obligatorio', 400);

        $db = Database::getConnection();

        // Verificar duplicado
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
    }

    // ─── PUT /api/categorias/:id (protegido) ──────────────────────────────────
    public static function actualizarCategoria(int $id): void
    {
        $nombre = ResponseHandler::sanitize($_POST['nombre'] ?? '');
        if (!$nombre) ResponseHandler::error('El nombre es obligatorio', 400);

        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT id, nombre, icono_url, icono_public_id FROM categorias WHERE id = ?');
        $stmt->execute([$id]);
        $actual = $stmt->fetch();
        if (!$actual) ResponseHandler::error('Categoría no encontrada', 404);

        // Verificar nombre duplicado en otra categoría
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

        $iconoFinal   = $nuevaIconoUrl ?? $actual['icono_url'];
        $publicIdFinal = $nuevoPublicId ?? $actual['icono_public_id'];

        $db->prepare('UPDATE categorias SET nombre=?, icono_url=?, icono_public_id=? WHERE id=?')
           ->execute([$nombre, $iconoFinal, $publicIdFinal, $id]);

        ResponseHandler::success([
            'mensaje'   => 'Categoría actualizada correctamente',
            'categoria' => ['id' => $id, 'nombre' => $nombre, 'icono_url' => $iconoFinal],
        ]);
    }

    // ─── DELETE /api/categorias/:id (protegido) ───────────────────────────────
    public static function eliminarCategoria(int $id): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT nombre, icono_public_id FROM categorias WHERE id = ?');
        $stmt->execute([$id]);
        $cat = $stmt->fetch();

        if (!$cat) ResponseHandler::error('Categoría no encontrada', 404);

        // Verificar subcategorías asociadas
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
    }
}
