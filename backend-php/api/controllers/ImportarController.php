<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * ImportarController – Sincronización de productos desde la BD catálogo de Hostinger
 */
class ImportarController
{
    // ─── POST /api/importar/ejecutar (protegido) ─────────────────────────────
    public static function importarProductosHostinger(): void
    {
        set_time_limit(0); 

        try {
            $dbLocal     = Database::getConnection();
            $dbHostinger = Database::getHostingerConnection();

            // Auto-migración: Agregar la columna id_hostinger si no existe
            try {
                $dbLocal->query("SELECT id_hostinger FROM productos LIMIT 1");
            } catch (PDOException $e) {
                $dbLocal->exec("ALTER TABLE productos ADD COLUMN id_hostinger INT NULL UNIQUE");
            }

            // 1. Obtener todos los productos de Hostinger
            $stmt     = $dbHostinger->query(
                "SELECT * FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas' ORDER BY id DESC"
            );
            $products = $stmt->fetchAll();

            // 2. Verificar cuántos necesitan sincronización real
            $idsHostinger = array_map(fn($p) => (int)$p['id'], $products);
            
            if (!empty($idsHostinger)) {
                $placeholders = implode(',', array_fill(0, count($idsHostinger), '?'));
                $existStmt = $dbLocal->prepare("SELECT id_hostinger FROM productos WHERE id_hostinger IN ($placeholders)");
                $existStmt->execute($idsHostinger);
                $existentes = $existStmt->fetchAll(PDO::FETCH_COLUMN);
            } else {
                $existentes = [];
            }
            
            $nuevosCount = count($idsHostinger) - count($existentes);
            
            // Si TODOS ya existen y no hay nada nuevo, responder inmediato
            if ($nuevosCount === 0 && count($existentes) === count($idsHostinger)) {
                ResponseHandler::success([
                    'mensaje'                 => '✅ Todo está actualizado. No hay productos nuevos para importar.',
                    'todo_actualizado'        => true,
                    'total_procesados'        => count($products),
                    'importados_exitosamente' => 0,
                    'actualizados'            => count($existentes),
                    'errores'                 => 0,
                    'detalles_errores'        => null,
                    'logs_detallados'         => ['Todos los productos de Hostinger ya están sincronizados en la base de datos local.'],
                ]);
                return;
            }

            // 3. Obtener todas las imágenes en una sola consulta
            $imgStmt = $dbHostinger->query("SELECT product_id, url FROM product_images");
            $allImages = $imgStmt->fetchAll();
            $imageMap = [];
            foreach ($allImages as $img) {
                if (!isset($imageMap[$img['product_id']])) {
                    $imageMap[$img['product_id']] = $img['url'];
                }
            }

            // 4. Obtener todas las variantes activas
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
            $errores     = [];
            $logs        = [];

            $dbLocal->beginTransaction();
            try {
                foreach ($products as $product) {
                    $hostingerId = (int)$product['id'];
                    $nombreProd  = $product['name'] ?? 'Sin nombre';
                    $logs[] = "Procesando Hostinger ID: {$hostingerId} | Nombre: '{$nombreProd}'";

                    $imagenUrl = $imageMap[$hostingerId] ?? null;
                    $variantes = $variantMap[$hostingerId] ?? [];
                    
                    $subcatId = self::obtenerOCrearSubcategoria($dbLocal, $product['category'] ?? null);

                    $precio = $variantes ? (float)($variantes[0]['price'] ?? 0) : 0;
                    $descripcion = $product['description'] ?? '';

                    try {
                        $matchStmt = $dbLocal->prepare('SELECT id, id_hostinger FROM productos WHERE id_hostinger = ? LIMIT 1');
                        $matchStmt->execute([$hostingerId]);
                        $row = $matchStmt->fetch();

                        if ($row) {
                            $localId = (int)$row['id'];
                            $logs[] = "  -> VINCULANDO: Ya existe (Local ID: {$localId}). Actualizando...";

                            $updStmt = $dbLocal->prepare("
                                UPDATE productos 
                                SET nombre=?, descripcion=?, precio=?, imagen_url=?, subcategoria_id=?, id_hostinger=? 
                                WHERE id=?
                            ");
                            $updStmt->execute([$nombreProd, $descripcion, $precio, $imagenUrl, $subcatId, $hostingerId, $localId]);

                            $dbLocal->prepare("DELETE FROM variantes WHERE producto_id=?")->execute([$localId]);
                            foreach ($variantes as $v) {
                                $dbLocal->prepare('INSERT INTO variantes (producto_id, nombre, precio) VALUES (?, ?, ?)')
                                        ->execute([$localId, $v['name'] ?? 'Variante', (float)($v['price'] ?? 0)]);
                            }

                            $actualizados++;
                            $logs[] = "  -> EXITO: Producto ID {$localId} actualizado.";
                            continue;
                        }

                        $logs[] = "  -> NUEVO: Insertando...";
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
                        $logs[] = "  -> ERROR: " . $e->getMessage();
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
                'todo_actualizado'        => ($importados === 0),
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
            ResponseHandler::error('Error inesperado en ImportarController', 500, [
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
            ResponseHandler::error('Error inesperado', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        }
    }

    // ─── GET /api/importar/preview (protegido) ────────────────────────────────
    public static function previewProductosHostinger(): void
    {
        try {
            $limite = min((int)(ResponseHandler::query('limite') ?? 5), 20);
            $dbHostinger = Database::getHostingerConnection();
            $dbLocal     = Database::getConnection();

            // 1. Contar total en Hostinger
            $totalHostStmt = $dbHostinger->query(
                "SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas'"
            );
            $totalHostinger = (int)$totalHostStmt->fetch()['total'];

            // 2. Obtener todos los IDs de Hostinger
            $allIdsStmt = $dbHostinger->query(
                "SELECT id FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas'"
            );
            $allHostingerIds = $allIdsStmt->fetchAll(PDO::FETCH_COLUMN);

            // 3. Verificar cuáles ya existen localmente
            $yaImportados = 0;
            $nuevos = 0;
            $nuevosNombres = [];

            if (!empty($allHostingerIds)) {
                $placeholders = implode(',', array_fill(0, count($allHostingerIds), '?'));
                $existStmt = $dbLocal->prepare("SELECT id_hostinger FROM productos WHERE id_hostinger IN ($placeholders)");
                $existStmt->execute($allHostingerIds);
                $existentes = $existStmt->fetchAll(PDO::FETCH_COLUMN);
                $yaImportados = count($existentes);
                $nuevos = $totalHostinger - $yaImportados;
                
                // Obtener nombres de los nuevos
                $nuevosIds = array_diff($allHostingerIds, $existentes);
                if (!empty($nuevosIds)) {
                    $plNuevos = implode(',', array_fill(0, count($nuevosIds), '?'));
                    $nombresStmt = $dbHostinger->prepare("SELECT name FROM products WHERE id IN ($plNuevos) LIMIT 10");
                    $nombresStmt->execute(array_values($nuevosIds));
                    $nuevosNombres = $nombresStmt->fetchAll(PDO::FETCH_COLUMN);
                }
            }

            // 4. Contar productos locales totales
            $totalLocalStmt = $dbLocal->query("SELECT COUNT(*) as total FROM productos");
            $totalLocal = (int)$totalLocalStmt->fetch()['total'];

            // 5. Obtener preview (muestra limitada)
            $stmt = $dbHostinger->prepare(
                "SELECT * FROM products WHERE deleted_at IS NULL AND category='Plaxtilineas' ORDER BY id DESC LIMIT ?"
            );
            $stmt->execute([$limite]);
            $products = $stmt->fetchAll();

            $preview = [];
            foreach ($products as $p) {
                $imgStmt = $dbHostinger->prepare('SELECT url FROM product_images WHERE product_id=? LIMIT 1');
                $imgStmt->execute([$p['id']]);
                $img = $imgStmt->fetch();

                $varStmt = $dbHostinger->prepare('SELECT COUNT(*) as total, MIN(price) as precio_min FROM product_variants WHERE product_id=?');
                $varStmt->execute([$p['id']]);
                $var = $varStmt->fetch();

                $preview[] = array_merge($p, [
                    'primera_imagen'  => $img['url'] ?? null,
                    'variantes_count' => (int)$var['total'],
                    'primer_precio'   => $var['precio_min'],
                ]);
            }

            // 6. Determinar estado
            $todoActualizado = ($nuevos === 0);

            ResponseHandler::success([
                'total_en_preview' => count($preview),
                'productos'        => $preview,
                'analisis'         => [
                    'total_hostinger'     => $totalHostinger,
                    'total_local'         => $totalLocal,
                    'ya_importados'       => $yaImportados,
                    'nuevos_por_importar' => $nuevos,
                    'todo_actualizado'    => $todoActualizado,
                    'nuevos_nombres'      => $nuevosNombres,
                ],
            ]);

        } catch (PDOException $e) {
            Logger::error('ImportarController::previewProductosHostinger – DB', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener preview de Hostinger', 500, [
                'detalle' => APP_ENV === 'development' ? $e->getMessage() : null,
            ]);
        } catch (Throwable $e) {
            Logger::error('ImportarController::previewProductosHostinger – inesperado', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error inesperado', 500, [
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
