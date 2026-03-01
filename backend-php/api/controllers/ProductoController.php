<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/CloudinaryHelper.php';

/**
 * ProductoController – CRUD completo + búsqueda + filtros
 */
class ProductoController
{
    // ─── Selectores reutilizables ────────────────────────────────────────────

    private static string $baseSelect = "
        SELECT
            p.id, p.nombre, p.descripcion, p.cantidad, p.precio,
            p.imagen_url, p.unidad, p.subcategoria_id, p.creado_en,
            s.nombre AS subcategoria,
            c.id    AS categoria_id,
            c.nombre AS categoria,
            c.icono_url AS categoria_icono,
            EXISTS (SELECT 1 FROM variantes v WHERE v.producto_id = p.id) AS tiene_variantes,
            COALESCE((SELECT MIN(v.precio) FROM variantes v WHERE v.producto_id = p.id), p.precio) AS precio_minimo,
            COALESCE((SELECT MAX(v.precio) FROM variantes v WHERE v.producto_id = p.id), p.precio) AS precio_maximo
        FROM productos p
        JOIN subcategorias s ON p.subcategoria_id = s.id
        JOIN categorias c    ON s.categoria_id = c.id
    ";

    // ─── GET /api/productos ──────────────────────────────────────────────────
    public static function obtenerProductos(): void
    {
        $db = Database::getConnection();
        $subcatId = ResponseHandler::query('subcategoria_id');

        $sql    = self::$baseSelect;
        $params = [];

        if ($subcatId !== null) {
            $sql .= ' WHERE p.subcategoria_id = ?';
            $params[] = (int)$subcatId;
        }
        $sql .= ' ORDER BY p.creado_en DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/:id ──────────────────────────────────────────────
    public static function obtenerProductoPorId(int $id): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare(self::$baseSelect . '
            WHERE p.id = ?
        ');
        $stmt->execute([$id]);
        $producto = $stmt->fetch();

        if (!$producto) {
            ResponseHandler::error('Producto no encontrado', 404);
        }

        // Variantes
        $vStmt = $db->prepare('SELECT id, nombre, precio FROM variantes WHERE producto_id = ? ORDER BY precio ASC');
        $vStmt->execute([$id]);
        $variantes = $vStmt->fetchAll();

        $producto['variantes']       = $variantes;
        $producto['tiene_variantes'] = count($variantes) > 0;

        ResponseHandler::success($producto);
    }

    // ─── GET /api/productos/subcategoria/:subcategoria_id ────────────────────
    public static function obtenerProductosPorSubcategoria(int $subcatId): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare(self::$baseSelect . ' WHERE p.subcategoria_id = ? ORDER BY p.creado_en DESC');
        $stmt->execute([$subcatId]);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/categoria/:categoria_id ──────────────────────────
    public static function obtenerProductosPorCategoria(int $catId): void
    {
        $db = Database::getConnection();

        // Verificar que la categoría existe
        $cStmt = $db->prepare('SELECT id FROM categorias WHERE id = ?');
        $cStmt->execute([$catId]);
        if (!$cStmt->fetch()) {
            ResponseHandler::error('Categoría no encontrada', 404);
        }

        $stmt = $db->prepare(self::$baseSelect . ' WHERE c.id = ? ORDER BY p.creado_en DESC, p.nombre ASC');
        $stmt->execute([$catId]);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/interes/aleatorios ────────────────────────────────
    public static function obtenerProductosAleatorios(): void
    {
        $limite = max(1, (int)(ResponseHandler::query('limite') ?? 8));
        $db     = Database::getConnection();
        $stmt   = $db->prepare(self::$baseSelect . ' ORDER BY RAND() LIMIT ?');
        $stmt->execute([$limite]);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/novedades/ultimos ─────────────────────────────────
    public static function obtenerUltimosProductos(): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare(self::$baseSelect . ' WHERE p.creado_en IS NOT NULL ORDER BY p.creado_en DESC LIMIT 2');
        $stmt->execute();
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/:id/variantes ─────────────────────────────────────
    public static function verificarVariantesProducto(int $prodId): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare("
            SELECT p.id, p.nombre,
                   COUNT(v.id) AS cantidad_variantes,
                   CASE WHEN COUNT(v.id) > 0 THEN 1 ELSE 0 END AS tiene_variantes
            FROM productos p
            LEFT JOIN variantes v ON p.id = v.producto_id
            WHERE p.id = ?
            GROUP BY p.id, p.nombre
        ");
        $stmt->execute([$prodId]);
        $row = $stmt->fetch();

        if (!$row) ResponseHandler::error('Producto no encontrado', 404);
        ResponseHandler::success($row);
    }

    // ─── GET /api/productos/buscar?nombre= ───────────────────────────────────
    public static function buscarProductosPorNombre(): void
    {
        $nombre = ResponseHandler::query('nombre', '');
        if (trim((string)$nombre) === '') {
            ResponseHandler::error('Debe proporcionar un término de búsqueda', 400);
        }

        $term = '%' . trim((string)$nombre) . '%';
        $db   = Database::getConnection();
        $stmt = $db->prepare(self::$baseSelect . "
            WHERE p.nombre LIKE ? OR p.descripcion LIKE ?
            ORDER BY CASE WHEN p.nombre LIKE ? THEN 1 ELSE 2 END, p.nombre ASC
        ");
        $stmt->execute([$term, $term, $term]);
        $rows = $stmt->fetchAll();

        if (empty($rows)) {
            ResponseHandler::success([
                'resultados'    => [],
                'total'         => 0,
                'termino_buscado' => $nombre,
                'mensaje'       => "No se encontraron productos para \"{$nombre}\""
            ]);
        }

        ResponseHandler::success([
            'resultados'    => $rows,
            'total'         => count($rows),
            'termino_buscado' => $nombre
        ]);
    }

    // ─── GET /api/productos/relacionados/por-producto ────────────────────────
    public static function obtenerProductosRelacionados(): void
    {
        $prodId = (int)(ResponseHandler::query('producto_id') ?? 0);
        $limite = max(1, (int)(ResponseHandler::query('limite') ?? 4));

        if (!$prodId) ResponseHandler::error('Se requiere el ID del producto', 400);

        $db = Database::getConnection();

        $pStmt = $db->prepare('SELECT subcategoria_id FROM productos WHERE id = ?');
        $pStmt->execute([$prodId]);
        $prod = $pStmt->fetch();

        if (!$prod) ResponseHandler::error('Producto no encontrado', 404);

        $stmt = $db->prepare(self::$baseSelect . '
            WHERE p.subcategoria_id = ? AND p.id != ?
            ORDER BY RAND() LIMIT ?
        ');
        $stmt->execute([$prod['subcategoria_id'], $prodId, $limite]);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/busqueda-avanzada ────────────────────────────────
    public static function busquedaAvanzada(): void
    {
        $nombre    = ResponseHandler::query('nombre');
        $catId     = ResponseHandler::query('categoria_id');
        $precioMin = ResponseHandler::query('precio_min');
        $precioMax = ResponseHandler::query('precio_max');
        $orden     = ResponseHandler::query('orden', 'relevancia');
        $limite    = max(1, (int)(ResponseHandler::query('limite') ?? 20));

        $sql    = self::$baseSelect . ' WHERE 1=1';
        $params = [];

        if ($nombre && trim((string)$nombre) !== '') {
            $sql    .= ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
            $term    = '%' . trim((string)$nombre) . '%';
            $params[] = $term;
            $params[] = $term;
        }

        if ($catId && is_numeric($catId)) {
            $sql    .= ' AND c.id = ?';
            $params[] = (int)$catId;
        }

        if ($precioMin && is_numeric($precioMin)) {
            $sql    .= ' AND p.precio >= ?';
            $params[] = (float)$precioMin;
        }

        if ($precioMax && is_numeric($precioMax)) {
            $sql    .= ' AND p.precio <= ?';
            $params[] = (float)$precioMax;
        }

        switch ($orden) {
            case 'precio_asc':  $sql .= ' ORDER BY p.precio ASC'; break;
            case 'precio_desc': $sql .= ' ORDER BY p.precio DESC'; break;
            case 'nombre':      $sql .= ' ORDER BY p.nombre ASC'; break;
            default:
                if ($nombre && trim((string)$nombre) !== '') {
                    $sql    .= ' ORDER BY CASE WHEN p.nombre LIKE ? THEN 1 ELSE 2 END, p.nombre ASC';
                    $params[] = '%' . trim((string)$nombre) . '%';
                } else {
                    $sql .= ' ORDER BY p.creado_en DESC';
                }
        }

        $sql    .= ' LIMIT ?';
        $params[] = $limite;

        $db   = Database::getConnection();
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        ResponseHandler::success($stmt->fetchAll());
    }

    // ─── GET /api/productos/estadisticas ─────────────────────────────────────
    public static function obtenerEstadisticasProductos(): void
    {
        $db = Database::getConnection();

        $total      = $db->query('SELECT COUNT(*) as total FROM productos')->fetch();
        $porCat     = $db->query("
            SELECT c.nombre as categoria, COUNT(p.id) as total_productos
            FROM categorias c
            LEFT JOIN subcategorias s ON c.id = s.categoria_id
            LEFT JOIN productos p ON s.id = p.subcategoria_id
            GROUP BY c.id, c.nombre ORDER BY total_productos DESC
        ")->fetchAll();
        $conVariantes = $db->query("
            SELECT COUNT(*) as total FROM productos p
            WHERE EXISTS (SELECT 1 FROM variantes v WHERE v.producto_id = p.id)
        ")->fetch();

        ResponseHandler::success([
            'total_productos'          => (int)$total['total'],
            'productos_por_categoria'  => $porCat,
            'productos_con_variantes'  => (int)$conVariantes['total'],
        ]);
    }

    // ─── POST /api/productos (protegido) ─────────────────────────────────────
    public static function crearProducto(): void
    {
        $nombre      = ResponseHandler::sanitize($_POST['nombre'] ?? '');
        $descripcion = ResponseHandler::sanitize($_POST['descripcion'] ?? '');
        $cantidad    = (int)($_POST['cantidad'] ?? 0);
        $precio      = (float)($_POST['precio'] ?? 0);
        $subcatId    = (int)($_POST['subcategoria_id'] ?? 0);
        $unidad      = ResponseHandler::sanitize($_POST['unidad'] ?? 'unidad');

        if (!$nombre || !$precio || !$subcatId) {
            ResponseHandler::error('Datos inválidos. Verifica nombre, precio y subcategoria_id.', 400);
        }

        $imagenUrl = '';
        $publicId  = '';

        if (!empty($_FILES['imagen']['tmp_name'])) {
            try {
                $result    = CloudinaryHelper::upload($_FILES['imagen']['tmp_name'], 'productos');
                $imagenUrl = $result['url'];
                $publicId  = $result['public_id'];
            } catch (Throwable $e) {
                ResponseHandler::error('Error al subir imagen: ' . $e->getMessage(), 500);
            }
        }

        $db   = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO productos (nombre, descripcion, cantidad, precio, imagen_url, public_id, subcategoria_id, unidad)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$nombre, $descripcion, $cantidad, $precio, $imagenUrl, $publicId, $subcatId, $unidad]);

        ResponseHandler::success([
            'mensaje'    => 'Producto creado con éxito',
            'id'         => (int)$db->lastInsertId(),
            'nombre'     => $nombre,
            'imagen_url' => $imagenUrl ?: null,
        ], 201);
    }

    // ─── PUT /api/productos/:id (protegido) ──────────────────────────────────
    public static function actualizarProducto(int $id): void
    {
        $nombre      = ResponseHandler::sanitize($_POST['nombre'] ?? '');
        $descripcion = ResponseHandler::sanitize($_POST['descripcion'] ?? '');
        $cantidad    = (int)($_POST['cantidad'] ?? 0);
        $precio      = (float)($_POST['precio'] ?? 0);
        $subcatId    = (int)($_POST['subcategoria_id'] ?? 0);
        $unidad      = ResponseHandler::sanitize($_POST['unidad'] ?? 'unidad');

        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT imagen_url, public_id FROM productos WHERE id = ?');
        $stmt->execute([$id]);
        $actual = $stmt->fetch();

        if (!$actual) ResponseHandler::error('Producto no encontrado', 404);

        $nuevaImagenUrl = null;
        $nuevoPublicId  = null;

        if (!empty($_FILES['imagen']['tmp_name'])) {
            try {
                $result         = CloudinaryHelper::upload($_FILES['imagen']['tmp_name'], 'productos');
                $nuevaImagenUrl = $result['url'];
                $nuevoPublicId  = $result['public_id'];

                // Eliminar imagen anterior de Cloudinary
                if ($actual['public_id']) {
                    CloudinaryHelper::delete($actual['public_id']);
                }
            } catch (Throwable $e) {
                ResponseHandler::error('Error al subir imagen: ' . $e->getMessage(), 500);
            }
        }

        $imagenFinal  = $nuevaImagenUrl  ?? $actual['imagen_url'];
        $publicIdFinal = $nuevoPublicId  ?? $actual['public_id'];

        $db->prepare("
            UPDATE productos SET nombre=?, descripcion=?, cantidad=?, precio=?, imagen_url=?, public_id=?, subcategoria_id=?, unidad=? WHERE id=?
        ")->execute([$nombre, $descripcion, $cantidad, $precio, $imagenFinal, $publicIdFinal, $subcatId, $unidad, $id]);

        ResponseHandler::success([
            'mensaje'           => 'Producto actualizado con éxito',
            'imagen_actualizada' => $nuevaImagenUrl !== null,
        ]);
    }

    // ─── DELETE /api/productos/:id (protegido) ───────────────────────────────
    public static function eliminarProducto(int $id): void
    {
        $db   = Database::getConnection();
        $stmt = $db->prepare('SELECT public_id FROM productos WHERE id = ?');
        $stmt->execute([$id]);
        $prod = $stmt->fetch();

        if (!$prod) ResponseHandler::error('Producto no encontrado', 404);

        if ($prod['public_id']) {
            CloudinaryHelper::delete($prod['public_id']);
        }

        $db->prepare('DELETE FROM productos WHERE id = ?')->execute([$id]);

        ResponseHandler::success(['mensaje' => 'Producto eliminado exitosamente', 'eliminado' => true]);
    }
}
