<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';

/**
 * ImportarController – Sincronización de productos desde la BD catálogo de Hostinger
 */
class ImportarController
{
    // ─── POST /api/importar/hostinger (protegido) ─────────────────────────────
    public static function importarProductosHostinger(): void
    {
        $dbLocal     = Database::getConnection();
        $dbHostinger = Database::getHostingerConnection();

        // Traer productos de la BD catálogo
        $stmt = $dbHostinger->query(
            "SELECT * FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas' ORDER BY id DESC"
        );
        $products = $stmt->fetchAll();

        $importados   = 0;
        $duplicados   = [];
        $errores      = [];

        $dbLocal->beginTransaction();
        try {
            foreach ($products as $product) {
                // Verificar duplicado
                $dupCheck = $dbLocal->prepare('SELECT id FROM productos WHERE nombre = ? LIMIT 1');
                $dupCheck->execute([$product['name'] ?? 'Sin nombre']);
                if ($dupCheck->fetch()) {
                    $duplicados[] = ['nombre' => $product['name']];
                    continue;
                }

                try {
                    // Primera imagen
                    $imgStmt = $dbHostinger->prepare('SELECT url FROM product_images WHERE product_id = ? LIMIT 1');
                    $imgStmt->execute([$product['id']]);
                    $imgRow   = $imgStmt->fetch();
                    $imagenUrl = $imgRow['url'] ?? null;

                    // Obtener o crear categoría y subcategoría
                    $subcatId = self::obtenerOCrearSubcategoria($dbLocal, $product['category'] ?? null);

                    // Variantes
                    $varStmt = $dbHostinger->prepare(
                        'SELECT name, price FROM product_variants WHERE product_id=? AND available=1 ORDER BY price ASC'
                    );
                    $varStmt->execute([$product['id']]);
                    $variantes = $varStmt->fetchAll();

                    $precio = $variantes ? (float)($variantes[0]['price'] ?? 0) : 0;

                    // Insertar producto
                    $pStmt = $dbLocal->prepare("
                        INSERT INTO productos (nombre, descripcion, cantidad, precio, imagen_url, subcategoria_id, unidad, creado_en)
                        VALUES (?, ?, 1, ?, ?, ?, 'unidad', NOW())
                    ");
                    $pStmt->execute([
                        $product['name'] ?? 'Sin nombre',
                        $product['description'] ?? '',
                        $precio,
                        $imagenUrl,
                        $subcatId,
                    ]);
                    $productoId = (int)$dbLocal->lastInsertId();

                    // Insertar variantes
                    foreach ($variantes as $v) {
                        $dbLocal->prepare('INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)')
                                ->execute([$productoId, $v['name'] ?? 'Variante', (float)($v['price'] ?? 0)]);
                    }

                    $importados++;
                } catch (Throwable $e) {
                    $errores[] = ['nombre' => $product['name'] ?? '?', 'error' => $e->getMessage()];
                }
            }

            $dbLocal->commit();
        } catch (Throwable $e) {
            $dbLocal->rollBack();
            ResponseHandler::error('Error durante la importación: ' . $e->getMessage(), 500);
        }

        ResponseHandler::success([
            'mensaje'               => 'Importación completada',
            'total_procesados'      => count($products),
            'importados_exitosamente' => $importados,
            'duplicados_ignorados'  => count($duplicados),
            'errores'               => count($errores),
            'detalles_duplicados'   => $duplicados ?: null,
            'detalles_errores'      => $errores ?: null,
        ]);
    }

    // ─── GET /api/importar/estadisticas (protegido) ───────────────────────────
    public static function obtenerEstadisticasHostinger(): void
    {
        $db     = Database::getHostingerConnection();
        $total  = $db->query("SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas'")->fetch();
        $conImg = $db->query("
            SELECT COUNT(DISTINCT p.id) as total FROM products p
            LEFT JOIN product_images pi ON p.id=pi.product_id
            WHERE p.deleted_at IS NULL AND p.category='Plaxtilineas' AND pi.id IS NOT NULL
        ")->fetch();
        $conVar = $db->query("
            SELECT COUNT(DISTINCT p.id) as total FROM products p
            LEFT JOIN product_variants pv ON p.id=pv.product_id
            WHERE p.deleted_at IS NULL AND p.category='Plaxtilineas' AND pv.id IS NOT NULL
        ")->fetch();

        ResponseHandler::success([
            'total_productos'       => (int)$total['total'],
            'productos_con_imagen'  => (int)$conImg['total'],
            'productos_con_variantes' => (int)$conVar['total'],
            'fecha_consulta'        => date('c'),
        ]);
    }

    // ─── GET /api/importar/preview (protegido) ────────────────────────────────
    public static function previewProductosHostinger(): void
    {
        $limite = min((int)(ResponseHandler::query('limite') ?? 5), 20);
        $db     = Database::getHostingerConnection();
        $stmt   = $db->prepare(
            "SELECT * FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas' ORDER BY id DESC LIMIT ?"
        );
        $stmt->execute([$limite]);
        $products = $stmt->fetchAll();

        $preview = [];
        foreach ($products as $p) {
            $imgStmt = $db->prepare('SELECT url FROM product_images WHERE product_id=? LIMIT 1');
            $imgStmt->execute([$p['id']]);
            $img = $imgStmt->fetch();

            $varStmt = $db->prepare('SELECT COUNT(*) as total, MIN(price) as precio_min FROM product_variants WHERE product_id=?');
            $varStmt->execute([$p['id']]);
            $var = $varStmt->fetch();

            $preview[] = array_merge($p, [
                'primera_imagen'  => $img['url'] ?? null,
                'variantes_count' => (int)$var['total'],
                'primer_precio'   => $var['precio_min'],
            ]);
        }

        ResponseHandler::success(['total_en_preview' => count($preview), 'productos' => $preview]);
    }

    // ─── Helper: obtener o crear subcategoría ─────────────────────────────────
    private static function obtenerOCrearSubcategoria(PDO $db, ?string $nombreCategoria): int
    {
        $nombre = $nombreCategoria ?? 'Plaxtilineas';

        $cStmt = $db->prepare('SELECT id FROM categorias WHERE nombre=? LIMIT 1');
        $cStmt->execute([$nombre]);
        $cat = $cStmt->fetch();

        if (!$cat) {
            $db->prepare('INSERT INTO categorias (nombre) VALUES (?)')->execute([$nombre]);
            $catId = (int)$db->lastInsertId();
        } else {
            $catId = (int)$cat['id'];
        }

        $sStmt = $db->prepare('SELECT id FROM subcategorias WHERE categoria_id=? LIMIT 1');
        $sStmt->execute([$catId]);
        $sub = $sStmt->fetch();

        if (!$sub) {
            $db->prepare('INSERT INTO subcategorias (nombre, categoria_id) VALUES (?, ?)')->execute(['General', $catId]);
            return (int)$db->lastInsertId();
        }

        return (int)$sub['id'];
    }
}
