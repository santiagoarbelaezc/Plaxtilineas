<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/CloudinaryHelper.php';
require_once __DIR__ . '/../utils/Logger.php';

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
            p.stock, p.stock_minimo, p.controlar_stock, p.sku, p.vistas,
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
        try {
            $db       = Database::getConnection();
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

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerProductos – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener productos de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerProductos – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerProductos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/:id ──────────────────────────────────────────────
    public static function obtenerProductoPorId(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID del producto debe ser un entero positivo');
            }

            $db   = Database::getConnection();
            $stmt = $db->prepare(self::$baseSelect . '
                WHERE p.id = ?
            ');
            $stmt->execute([$id]);
            $producto = $stmt->fetch();

            if (!$producto) {
                ResponseHandler::error('Producto no encontrado', 404);
            }

            $vStmt = $db->prepare('SELECT id, nombre, precio FROM variantes WHERE producto_id = ? ORDER BY precio ASC');
            $vStmt->execute([$id]);
            $variantes = $vStmt->fetchAll();

            $producto['variantes']       = $variantes;
            $producto['tiene_variantes'] = count($variantes) > 0;

            ResponseHandler::success($producto);

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerProductoPorId – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener producto de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerProductoPorId – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerProductoPorId', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/subcategoria/:subcategoria_id ────────────────────
    public static function obtenerProductosPorSubcategoria(int $subcatId): void
    {
        try {
            if ($subcatId <= 0) {
                throw new InvalidArgumentException('El ID de subcategoría debe ser un entero positivo');
            }
            $db   = Database::getConnection();
            $stmt = $db->prepare(self::$baseSelect . ' WHERE p.subcategoria_id = ? ORDER BY p.creado_en DESC');
            $stmt->execute([$subcatId]);
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerProductosPorSubcategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener productos por subcategoría', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerProductosPorSubcategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerProductosPorSubcategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/categoria/:categoria_id ──────────────────────────
    public static function obtenerProductosPorCategoria(int $catId): void
    {
        try {
            if ($catId <= 0) {
                throw new InvalidArgumentException('El ID de categoría debe ser un entero positivo');
            }
            $db    = Database::getConnection();
            $cStmt = $db->prepare('SELECT id FROM categorias WHERE id = ?');
            $cStmt->execute([$catId]);
            if (!$cStmt->fetch()) {
                ResponseHandler::error('Categoría no encontrada', 404);
            }

            $stmt = $db->prepare(self::$baseSelect . ' WHERE c.id = ? ORDER BY p.creado_en DESC, p.nombre ASC');
            $stmt->execute([$catId]);
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerProductosPorCategoria – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener productos por categoría', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerProductosPorCategoria – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerProductosPorCategoria', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/interes/aleatorios ────────────────────────────────
    public static function obtenerProductosAleatorios(): void
    {
        try {
            $limite = max(1, (int)(ResponseHandler::query('limite') ?? 8));
            $db     = Database::getConnection();
            $stmt   = $db->prepare(self::$baseSelect . ' ORDER BY RAND() LIMIT ?');
            $stmt->execute([$limite]);
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerProductosAleatorios – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener productos aleatorios', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerProductosAleatorios – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerProductosAleatorios', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/novedades/ultimos ─────────────────────────────────
    public static function obtenerUltimosProductos(): void
    {
        try {
            $db   = Database::getConnection();
            $stmt = $db->prepare(self::$baseSelect . ' WHERE p.creado_en IS NOT NULL ORDER BY p.creado_en DESC LIMIT 15');
            $stmt->execute();
            ResponseHandler::success($stmt->fetchAll());

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerUltimosProductos – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener últimos productos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerUltimosProductos – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerUltimosProductos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/:id/variantes ─────────────────────────────────────
    public static function verificarVariantesProducto(int $prodId): void
    {
        try {
            if ($prodId <= 0) {
                throw new InvalidArgumentException('El ID del producto debe ser un entero positivo');
            }
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

        } catch (PDOException $e) {
            Logger::error('ProductoController::verificarVariantesProducto – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al verificar variantes del producto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::verificarVariantesProducto – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::verificarVariantesProducto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/buscar?nombre= ───────────────────────────────────
    public static function buscarProductosPorNombre(): void
    {
        try {
            $nombre = ResponseHandler::query('nombre', '');
            if (trim((string)$nombre) === '') {
                throw new InvalidArgumentException('Debe proporcionar un término de búsqueda');
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
                    'resultados'      => [],
                    'total'           => 0,
                    'termino_buscado' => $nombre,
                    'mensaje'         => "No se encontraron productos para \"{$nombre}\""
                ]);
            }

            ResponseHandler::success([
                'resultados'      => $rows,
                'total'           => count($rows),
                'termino_buscado' => $nombre
            ]);

        } catch (PDOException $e) {
            Logger::error('ProductoController::buscarProductosPorNombre – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al buscar productos en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::buscarProductosPorNombre – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::buscarProductosPorNombre', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/relacionados/por-producto ────────────────────────
    public static function obtenerProductosRelacionados(): void
    {
        try {
            $prodId = (int)(ResponseHandler::query('producto_id') ?? 0);
            $limite = max(1, (int)(ResponseHandler::query('limite') ?? 4));

            if (!$prodId) {
                throw new InvalidArgumentException('Se requiere el ID del producto');
            }

            $db    = Database::getConnection();
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

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerProductosRelacionados – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener productos relacionados', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerProductosRelacionados – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerProductosRelacionados', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/busqueda-avanzada ────────────────────────────────
    public static function busquedaAvanzada(): void
    {
        try {
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

        } catch (PDOException $e) {
            Logger::error('ProductoController::busquedaAvanzada – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al ejecutar búsqueda avanzada', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ProductoController::busquedaAvanzada – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::busquedaAvanzada', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/productos/estadisticas ─────────────────────────────────────
    public static function obtenerEstadisticasProductos(): void
    {
        try {
            $db           = Database::getConnection();
            $total        = $db->query('SELECT COUNT(*) as total FROM productos')->fetch();
            $porCat       = $db->query("
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
                'total_productos'         => (int)$total['total'],
                'productos_por_categoria' => $porCat,
                'productos_con_variantes' => (int)$conVariantes['total'],
            ]);

        } catch (PDOException $e) {
            Logger::error('ProductoController::obtenerEstadisticasProductos – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener estadísticas de productos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ProductoController::obtenerEstadisticasProductos – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::obtenerEstadisticasProductos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── POST /api/productos (protegido) ─────────────────────────────────────
    public static function crearProducto(): void
    {
        try {
            $nombre      = ResponseHandler::sanitize($_POST['nombre'] ?? '');
            $descripcion = ResponseHandler::sanitize($_POST['descripcion'] ?? '');
            $cantidad    = (int)($_POST['cantidad'] ?? 0);
            $precio      = (float)($_POST['precio'] ?? 0);
            $subcatId    = (int)($_POST['subcategoria_id'] ?? 0);
            $unidad      = ResponseHandler::sanitize($_POST['unidad'] ?? 'unidad');
            $sku         = ResponseHandler::sanitize($_POST['sku'] ?? null);
            $stock       = (int)($_POST['stock'] ?? 0);
            $stockMinimo = (int)($_POST['stock_minimo'] ?? 0);
            $controlStock= isset($_POST['controlar_stock']) ? (int)filter_var($_POST['controlar_stock'], FILTER_VALIDATE_BOOLEAN) : 1;

            if (!$nombre) {
                throw new InvalidArgumentException("El campo 'nombre' es requerido");
            }
            if (!$precio) {
                throw new InvalidArgumentException("El campo 'precio' es requerido y debe ser mayor que 0");
            }
            if (!$subcatId) {
                throw new InvalidArgumentException("El campo 'subcategoria_id' es requerido");
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
                INSERT INTO productos (nombre, descripcion, cantidad, precio, imagen_url, public_id, subcategoria_id, unidad, sku, stock, stock_minimo, controlar_stock)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nombre, $descripcion, $cantidad, $precio, $imagenUrl, $publicId, $subcatId, $unidad, $sku, $stock, $stockMinimo, $controlStock]);

            ResponseHandler::success([
                'mensaje'    => 'Producto creado con éxito',
                'id'         => (int)$db->lastInsertId(),
                'nombre'     => $nombre,
                'imagen_url' => $imagenUrl ?: null,
            ], 201);

        } catch (PDOException $e) {
            Logger::error('ProductoController::crearProducto – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al crear producto en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::crearProducto – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::crearProducto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── PUT /api/productos/:id (protegido) ──────────────────────────────────
    public static function actualizarProducto(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID del producto debe ser un entero positivo');
            }

            $nombre      = ResponseHandler::sanitize($_POST['nombre'] ?? '');
            $descripcion = ResponseHandler::sanitize($_POST['descripcion'] ?? '');
            $cantidad    = (int)($_POST['cantidad'] ?? 0);
            $precio      = (float)($_POST['precio'] ?? 0);
            $subcatId    = (int)($_POST['subcategoria_id'] ?? 0);
            $unidad      = ResponseHandler::sanitize($_POST['unidad'] ?? 'unidad');
            $sku         = ResponseHandler::sanitize($_POST['sku'] ?? null);
            $stock       = (int)($_POST['stock'] ?? 0);
            $stockMinimo = (int)($_POST['stock_minimo'] ?? 0);
            $controlStock= isset($_POST['controlar_stock']) ? (int)filter_var($_POST['controlar_stock'], FILTER_VALIDATE_BOOLEAN) : 1;

            if (!$nombre) {
                if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                    throw new InvalidArgumentException("El nombre es requerido. Nota: asegúrate de usar POST para actualizar productos con imágenes.");
                }
                throw new InvalidArgumentException("El nombre del producto es requerido.");
            }
            if (!$subcatId) {
                throw new InvalidArgumentException("La subcategoría es requerida.");
            }

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

                    if ($actual['public_id']) {
                        CloudinaryHelper::delete($actual['public_id']);
                    }
                } catch (Throwable $e) {
                    ResponseHandler::error('Error al subir imagen: ' . $e->getMessage(), 500);
                }
            }

            $imagenFinal   = $nuevaImagenUrl  ?? $actual['imagen_url'];
            $publicIdFinal = $nuevoPublicId   ?? $actual['public_id'];

            $db->prepare("
                UPDATE productos 
                SET nombre=?, descripcion=?, cantidad=?, precio=?, imagen_url=?, public_id=?, subcategoria_id=?, unidad=?, sku=?, stock=?, stock_minimo=?, controlar_stock=?
                WHERE id=?
            ")->execute([$nombre, $descripcion, $cantidad, $precio, $imagenFinal, $publicIdFinal, $subcatId, $unidad, $sku, $stock, $stockMinimo, $controlStock, $id]);

            ResponseHandler::success([
                'mensaje'            => 'Producto actualizado con éxito',
                'imagen_actualizada' => $nuevaImagenUrl !== null,
            ]);

        } catch (PDOException $e) {
            Logger::error('ProductoController::actualizarProducto – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al actualizar producto en base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::actualizarProducto – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::actualizarProducto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── DELETE /api/productos/:id (protegido) ───────────────────────────────
    public static function eliminarProducto(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new InvalidArgumentException('El ID del producto debe ser un entero positivo');
            }

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

        } catch (PDOException $e) {
            Logger::error('ProductoController::eliminarProducto – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar producto de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::eliminarProducto – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ProductoController::eliminarProducto', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── POST /api/productos/bulk-delete (protegido) ─────────────────────────
    public static function eliminarProductosMasivo(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $ids = $input['ids'] ?? [];

            if (empty($ids) || !is_array($ids)) {
                throw new InvalidArgumentException('Debe proporcionar un array de IDs');
            }

            $db = Database::getConnection();
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            
            // Buscar public_ids para eliminar de Cloudinary
            $stmt = $db->prepare("SELECT public_id FROM productos WHERE id IN ($placeholders) AND public_id IS NOT NULL");
            $stmt->execute($ids);
            $productosParaBorrar = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($productosParaBorrar as $publicId) {
                try {
                    CloudinaryHelper::delete($publicId);
                } catch (Throwable $e) {
                    Logger::error('Cloudinary bulk delete error', ['public_id' => $publicId, 'error' => $e->getMessage()]);
                }
            }

            // Eliminar de base de datos
            $delStmt = $db->prepare("DELETE FROM productos WHERE id IN ($placeholders)");
            $delStmt->execute($ids);

            ResponseHandler::success([
                'mensaje' => 'Productos eliminados masivamente con éxito',
                'eliminados' => $delStmt->rowCount()
            ]);

        } catch (PDOException $e) {
            Logger::error('ProductoController::eliminarProductosMasivo – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al eliminar productos de base de datos', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (InvalidArgumentException $e) {
            ResponseHandler::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Logger::error('ProductoController::eliminarProductosMasivo – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }
}
