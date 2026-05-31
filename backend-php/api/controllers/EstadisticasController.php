<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * EstadisticasController – Salud del catálogo y negocio
 */
class EstadisticasController
{
    /**
     * GET /api/estadisticas/catalogo
     * Retorna métricas de salud del catálogo, inventario y PQRs
     */
    public static function getCatalogStats(): void
    {
        try {
            $db = Database::getConnection();

            // 1. KPIs de Negocio
            $totalProductos = (int)$db->query("SELECT COUNT(*) FROM productos")->fetchColumn();
            
            $productosSinVariantes = (int)$db->query("
                SELECT COUNT(p.id) 
                FROM productos p 
                LEFT JOIN variantes v ON p.id = v.producto_id 
                WHERE v.id IS NULL
            ")->fetchColumn();

            $pqrsPendientes = 0;
            try {
                $pqrsPendientes = (int)$db->query("SELECT COUNT(*) FROM pqrs WHERE estado = 'pendiente'")->fetchColumn();
            } catch (Throwable $e) {
                Logger::error('EstadisticasController PQRs', ['exception' => $e->getMessage()]);
            }

            $totalCategorias = (int)$db->query("SELECT COUNT(*) FROM categorias")->fetchColumn();

            $kpis = [
                'total_productos' => $totalProductos,
                'productos_sin_variantes' => $productosSinVariantes,
                'pqrs_pendientes' => $pqrsPendientes,
                'total_categorias' => $totalCategorias
            ];

            // 2. Gráfico: Distribución de productos por categoría
            $distribucionCategorias = $db->query("
                SELECT c.nombre as categoria, COUNT(p.id) as cantidad
                FROM categorias c
                LEFT JOIN subcategorias s ON c.id = s.categoria_id
                LEFT JOIN productos p ON s.id = p.subcategoria_id
                GROUP BY c.id, c.nombre
                ORDER BY cantidad DESC
            ")->fetchAll();

            // 3. Tabla: Estado del inventario (Top 50 para no sobrecargar)
            $inventario = $db->query("
                SELECT 
                    p.id,
                    p.nombre,
                    p.imagen_url,
                    s.nombre as subcategoria,
                    c.nombre as categoria,
                    COUNT(v.id) as num_variantes,
                    MIN(v.precio) as precio_min,
                    MAX(v.precio) as precio_max
                FROM productos p
                JOIN subcategorias s ON p.subcategoria_id = s.id
                JOIN categorias c ON s.categoria_id = c.id
                LEFT JOIN variantes v ON p.id = v.producto_id
                GROUP BY p.id, p.nombre, p.imagen_url, s.nombre, c.nombre
                ORDER BY p.id DESC
                LIMIT 50
            ")->fetchAll();

            // 4. Panel: PQRs recientes
            $pqrsRecientes = [];
            try {
                $pqrsRecientes = $db->query("
                    SELECT id, nombre, asunto, estado, created_at 
                    FROM pqrs 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ")->fetchAll();
            } catch (Throwable $e) {}

            // 5. Panel: Alertas de calidad de datos
            $alertas = [];
            
            // Productos sin imagen
            $sinImagen = $db->query("
                SELECT id, nombre FROM productos WHERE imagen_url IS NULL OR imagen_url = '' LIMIT 5
            ")->fetchAll();
            foreach ($sinImagen as $p) {
                $alertas[] = [
                    'tipo' => 'imagen',
                    'mensaje' => "El producto '{$p['nombre']}' no tiene imagen",
                    'producto_id' => $p['id']
                ];
            }

            // Productos sin descripción
            $sinDesc = $db->query("
                SELECT id, nombre FROM productos WHERE descripcion IS NULL OR descripcion = '' LIMIT 5
            ")->fetchAll();
            foreach ($sinDesc as $p) {
                $alertas[] = [
                    'tipo' => 'descripcion',
                    'mensaje' => "El producto '{$p['nombre']}' no tiene descripción",
                    'producto_id' => $p['id']
                ];
            }

            // Productos sin variantes (ya tenemos el count global, traemos algunos ejemplos)
            $sinVar = $db->query("
                SELECT p.id, p.nombre 
                FROM productos p 
                LEFT JOIN variantes v ON p.id = v.producto_id 
                WHERE v.id IS NULL LIMIT 5
            ")->fetchAll();
            foreach ($sinVar as $p) {
                $alertas[] = [
                    'tipo' => 'variantes',
                    'mensaje' => "El producto '{$p['nombre']}' no tiene variantes/precios",
                    'producto_id' => $p['id']
                ];
            }

            ResponseHandler::success([
                'kpis' => $kpis,
                'distribucion_categorias' => $distribucionCategorias,
                'inventario' => $inventario,
                'pqrs_recientes' => $pqrsRecientes,
                'alertas' => $alertas
            ]);

        } catch (Throwable $e) {
            Logger::error('EstadisticasController::getCatalogStats', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener estadísticas del catálogo', 500);
        }
    }
}
