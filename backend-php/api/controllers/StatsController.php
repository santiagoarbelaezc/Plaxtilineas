<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/ResponseHandler.php';
require_once __DIR__ . '/../utils/Logger.php';

/**
 * StatsController – Captura y consulta de métricas y analítica
 */
class StatsController
{
    /**
     * POST /api/stats/track
     * Registra una visita a página o producto
     */
    public static function track(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $tipo = $input['tipo'] ?? 'pagina'; // 'pagina' o 'producto'
            $sessionId = $input['session_id'] ?? null;
            $url = $input['url'] ?? null;
            $productoId = $input['producto_id'] ?? null;
            
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

            $db = Database::getConnection();

            if ($tipo === 'producto' && $productoId) {
                // Registrar vista de producto
                $stmt = $db->prepare("
                    INSERT INTO estadisticas_productos (producto_id, session_id) 
                    VALUES (?, ?)
                ");
                $stmt->execute([$productoId, $sessionId]);
            } else {
                // Registrar visita general
                $stmt = $db->prepare("
                    INSERT INTO estadisticas_visitas (ip_address, user_agent, pagina_url, session_id) 
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$ip, $ua, $url, $sessionId]);
            }

            ResponseHandler::success(['tracked' => true], 201);

        } catch (Throwable $e) {
            Logger::error('StatsController::track', ['exception' => $e->getMessage()]);
            // Fallar silenciosamente para el cliente para no interrumpir navegación
            ResponseHandler::success(['tracked' => false, 'error' => 'logged']);
        }
    }

    /**
     * GET /api/stats/dashboard
     * Retorna datos agregados completos para el panel de administración
     */
    public static function getDashboardStats(): void
    {
        try {
            $db = Database::getConnection();

            // ─── 1. Visitas por día (últimos 30 días) ────────────────────────────────
            $visitasDia = $db->query("
                SELECT 
                    DATE(created_at) as fecha,
                    COUNT(*) as total,
                    COUNT(DISTINCT session_id) as sesiones_unicas
                FROM estadisticas_visitas 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY fecha ASC
            ")->fetchAll();

            // ─── 2. Top 10 Productos más visitados ───────────────────────────────────
            $topProductos = $db->query("
                SELECT p.nombre, p.imagen_url, COUNT(ep.id) as visitas
                FROM estadisticas_productos ep
                JOIN productos p ON ep.producto_id = p.id
                GROUP BY p.id, p.nombre, p.imagen_url
                ORDER BY visitas DESC
                LIMIT 10
            ")->fetchAll();

            // ─── 3. Visitas por Categoría ─────────────────────────────────────────────
            $visitasCategoria = $db->query("
                SELECT c.nombre as categoria, COUNT(ep.id) as visitas
                FROM estadisticas_productos ep
                JOIN productos p ON ep.producto_id = p.id
                JOIN subcategorias s ON p.subcategoria_id = s.id
                JOIN categorias c ON s.categoria_id = c.id
                GROUP BY c.id, c.nombre
                ORDER BY visitas DESC
            ")->fetchAll();

            // ─── 4. Visitas por Subcategoría ──────────────────────────────────────────
            $visitasSubcategoria = $db->query("
                SELECT s.nombre as subcategoria, c.nombre as categoria, COUNT(ep.id) as visitas
                FROM estadisticas_productos ep
                JOIN productos p ON ep.producto_id = p.id
                JOIN subcategorias s ON p.subcategoria_id = s.id
                JOIN categorias c ON s.categoria_id = c.id
                GROUP BY s.id, s.nombre, c.nombre
                ORDER BY visitas DESC
                LIMIT 10
            ")->fetchAll();

            // ─── 5. Resumen rápido ────────────────────────────────────────────────────
            $visitasHoy  = (int)$db->query("SELECT COUNT(*) FROM estadisticas_visitas WHERE DATE(created_at) = CURRENT_DATE")->fetchColumn();
            $visitasAyer = (int)$db->query("SELECT COUNT(*) FROM estadisticas_visitas WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)")->fetchColumn();
            $visitasSem  = (int)$db->query("SELECT COUNT(*) FROM estadisticas_visitas WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
            $visitasMes  = (int)$db->query("SELECT COUNT(*) FROM estadisticas_visitas WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
            $sesionesUnicas = (int)$db->query("SELECT COUNT(DISTINCT session_id) FROM estadisticas_visitas WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();

            // ─── 6. Total productos, categorías y subcategorías ───────────────────────
            $totalProductos    = (int)$db->query("SELECT COUNT(*) FROM productos")->fetchColumn();
            $totalCategorias   = (int)$db->query("SELECT COUNT(*) FROM categorias")->fetchColumn();
            $totalSubcats      = (int)$db->query("SELECT COUNT(*) FROM subcategorias")->fetchColumn();

            // ─── 7. Total leads registrados ───────────────────────────────────────────
            $totalLeads = 0;
            $leadsHoy   = 0;
            $leadsSem   = 0;
            $leadsRecientes = [];
            try {
                $totalLeads = (int)$db->query("SELECT COUNT(*) FROM leads")->fetchColumn();
                $leadsHoy   = (int)$db->query("SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURRENT_DATE")->fetchColumn();
                $leadsSem   = (int)$db->query("SELECT COUNT(*) FROM leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
                $leadsRecientes = $db->query("SELECT nombre, telefono, fuente, created_at FROM leads ORDER BY created_at DESC LIMIT 5")->fetchAll();
            } catch (Throwable $leadsErr) {
                // La tabla leads puede no existir aún, no romper todo
                Logger::error('StatsController::getDashboardStats leads', ['exception' => $leadsErr->getMessage()]);
            }

            // ─── 8. Páginas más visitadas ─────────────────────────────────────────────
            $paginasTop = $db->query("
                SELECT pagina_url as url, COUNT(*) as visitas
                FROM estadisticas_visitas
                WHERE pagina_url IS NOT NULL AND pagina_url != ''
                GROUP BY pagina_url
                ORDER BY visitas DESC
                LIMIT 10
            ")->fetchAll();

            ResponseHandler::success([
                'resumen' => [
                    'visitas_hoy'       => $visitasHoy,
                    'visitas_ayer'      => $visitasAyer,
                    'visitas_semana'    => $visitasSem,
                    'visitas_mes'       => $visitasMes,
                    'sesiones_unicas'   => $sesionesUnicas,
                    'diferencia_hoy'    => $visitasHoy - $visitasAyer,
                    'total_productos'   => $totalProductos,
                    'total_categorias'  => $totalCategorias,
                    'total_subcats'     => $totalSubcats,
                    'total_leads'       => $totalLeads,
                    'leads_hoy'         => $leadsHoy,
                    'leads_semana'      => $leadsSem,
                ],
                'grafico_visitas'       => $visitasDia,
                'top_productos'         => $topProductos,
                'visitas_categoria'     => $visitasCategoria,
                'visitas_subcategoria'  => $visitasSubcategoria,
                'paginas_top'           => $paginasTop,
                'leads_recientes'       => $leadsRecientes,
            ]);

        } catch (Throwable $e) {
            Logger::error('StatsController::getDashboardStats', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener estadísticas', 500);
        }
    }
}
