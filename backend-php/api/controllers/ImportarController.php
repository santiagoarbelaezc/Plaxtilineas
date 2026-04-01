<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * ImportarController – Sincronización de productos desde la BD catálogo de Hostinger
 */
class ImportarController
{
    // ─── POST /api/importar/hostinger (protegido) ─────────────────────────────
    public static function importarProductosHostinger(): void
    {
        // El proceso de sincronización puede tardar más de 60s por latencia a Hostinger
        set_time_limit(0); 

        try {
            $dbLocal     = Database::getConnection();
            $dbHostinger = Database::getHostingerConnection();

            // Auto-migración mágica: Agregar la columna id_hostinger si no existe
            try {
                $dbLocal->query("SELECT id_hostinger FROM productos LIMIT 1");
            } catch (PDOException $e) {
                // La columna no existe, la creamos
                $dbLocal->exec("ALTER TABLE productos ADD COLUMN id_hostinger INT NULL UNIQUE");
            }

            // 1. Obtener todos los productos
            $stmt     = $dbHostinger->query(
                "SELECT * FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas' ORDER BY id DESC"
            );
            $products = $stmt->fetchAll();

            // 2. Obtener todas las imágenes en una sola consulta
            $imgStmt = $dbHostinger->query("SELECT product_id, url FROM product_images");
            $allImages = $imgStmt->fetchAll();
            $imageMap = [];
            foreach ($allImages as $img) {
                if (!isset($imageMap[$img['product_id']])) {
                    $imageMap[$img['product_id']] = $img['url'];
                }
            }

            // 3. Obtener todas las variantes activas en una sola consulta
            $varStmt = $dbHostinger->query("SELECT product_id, name, price FROM product_variants WHERE available=1 ORDER BY price ASC");
            $allVariants = $varStmt->fetchAll();
            $variantMap = [];
            foreach ($allVariants as $var) {
                $variantMap[$var['product_id']][] = [
                    'name' => $var['name'],
                    'price' => $var['price']
                ];
            }

            $importados  = 0;
            $actualizados= 0;
            $duplicados  = [];
            $errores     = [];
            $logs        = [];

            $dbLocal->beginTransaction();
            try {
                foreach ($products as $product) {
                    $hostingerId = (int)$product['id'];
                    $nombreProd  = $product['name'] ?? 'Sin nombre';
                    $logs[] = "Procesando Hostinger ID: {$hostingerId} | Nombre: '{$nombreProd}'";

                    // Conseguir datos de los mapas en memoria (instantáneo)
                    $imagenUrl = $imageMap[$hostingerId] ?? null;
                    $variantes = $variantMap[$hostingerId] ?? [];
                    
                    $subcatId = self::obtenerOCrearSubcategoria($dbLocal, $product['category'] ?? null);

                    $precio = $variantes ? (float)($variantes[0]['price'] ?? 0) : 0;
                    $descripcion = $product['description'] ?? '';

                    try {
                        // 2. Verificar si ya existe SOLAMENTE por ID (ignorando el nombre para permitir a voluntad del usuario importar e identificar duplicados)
                        $matchStmt = $dbLocal->prepare('SELECT id, id_hostinger FROM productos WHERE id_hostinger = ? LIMIT 1');
                        $matchStmt->execute([$hostingerId]);
                        $row = $matchStmt->fetch();

                        if ($row) {
                            $localId = (int)$row['id'];
                            $logs[] = "  -> VINCULANDO: Ya existe en la BD local (Local ID: {$localId}). Actualizando datos...";

                            // 2a. Actualizar el producto existente (esto también actualiza el id_hostinger si solo coincidió el nombre)
                            $updStmt = $dbLocal->prepare("
                                UPDATE productos 
                                SET nombre=?, descripcion=?, precio=?, imagen_url=?, subcategoria_id=?, id_hostinger=? 
                                WHERE id=?
                            ");
                            $updStmt->execute([$nombreProd, $descripcion, $precio, $imagenUrl, $subcatId, $hostingerId, $localId]);

                            // 2b. Recrear las variantes (borramos las viejas e insertamos las nuevas para sincronizar perfecto)
                            $dbLocal->prepare("DELETE FROM variantes WHERE producto_id=?")->execute([$localId]);
                            foreach ($variantes as $v) {
                                $dbLocal->prepare('INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)')
                                        ->execute([$localId, $v['name'] ?? 'Variante', (float)($v['price'] ?? 0)]);
                            }

                            $actualizados++;
                            $logs[] = "  -> EXITO: Producto ID {$localId} actualizado.";
                            continue;
                        }

                        // 3. Si NO existe, Insertar como nuevo
                        $logs[] = "  -> NUEVO: No existe localmente. Intentando insertar...";
                        $pStmt = $dbLocal->prepare("
                            INSERT INTO productos (nombre, descripcion, cantidad, precio, imagen_url, subcategoria_id, unidad, creado_en, id_hostinger)
                            VALUES (?, ?, 1, ?, ?, ?, 'unidad', NOW(), ?)
                        ");
                        $pStmt->execute([$nombreProd, $descripcion, $precio, $imagenUrl, $subcatId, $hostingerId]);
                        $productoId = (int)$dbLocal->lastInsertId();
                        $logs[] = "  -> EXITO: Insertado como ID local: {$productoId}";

                        foreach ($variantes as $v) {
                            $dbLocal->prepare('INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)')
                                    ->execute([$productoId, $v['name'] ?? 'Variante', (float)($v['price'] ?? 0)]);
                        }

                        $importados++;
                    } catch (Throwable $e) {
                        $logs[] = "  -> ERROR FATAL: " . $e->getMessage();
                        $errores[] = ['nombre' => $nombreProd, 'error' => $e->getMessage()];
                    }
                }

                $dbLocal->commit();
            } catch (Throwable $e) {
                $dbLocal->rollBack();
                throw $e;
            }

            ResponseHandler::success([
                'mensaje'                 => 'Importación y sincronización completadas',
                'total_procesados'        => count($products),
                'importados_exitosamente' => $importados,
                'actualizados'            => $actualizados,
                'errores'                 => count($errores),
                'detalles_errores'        => $errores ?: null,
                'logs_detallados'         => $logs,
            ]);

        } catch (PDOException $e) {
            Logger::error('ImportarController::importarProductosHostinger – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error de base de datos durante la importación', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ImportarController::importarProductosHostinger – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ImportarController::importarProductosHostinger', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/importar/estadisticas (protegido) ───────────────────────────
    public static function obtenerEstadisticasHostinger(): void
    {
        try {
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
                'total_productos'         => (int)$total['total'],
                'productos_con_imagen'    => (int)$conImg['total'],
                'productos_con_variantes' => (int)$conVar['total'],
                'fecha_consulta'          => date('c'),
            ]);

        } catch (PDOException $e) {
            Logger::error('ImportarController::obtenerEstadisticasHostinger – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener estadísticas de Hostinger', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ImportarController::obtenerEstadisticasHostinger – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ImportarController::obtenerEstadisticasHostinger', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/importar/preview (protegido) ────────────────────────────────
    public static function previewProductosHostinger(): void
    {
        try {
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

        } catch (PDOException $e) {
            Logger::error('ImportarController::previewProductosHostinger – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener preview de Hostinger', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ImportarController::previewProductosHostinger – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado en ImportarController::previewProductosHostinger', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
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
