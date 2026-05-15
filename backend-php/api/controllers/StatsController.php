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
     * Retorna datos agregados para el panel de administración
     */
    public static function getDashboardStats(): void
    {
        try {
            $db = Database::getConnection();

            // 1. Visitas por día (últimos 15 días)
            $visitasDia = $db->query("
                SELECT fecha, COUNT(*) as total 
                FROM estadisticas_visitas 
                WHERE fecha >= DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY)
                GROUP BY fecha 
                ORDER BY fecha ASC
            ")->fetchAll();

            // 2. Top 10 Productos más visitados
            $topProductos = $db->query("
                SELECT p.nombre, COUNT(ep.id) as visitas
                FROM estadisticas_productos ep
                JOIN productos p ON ep.producto_id = p.id
                GROUP BY p.id, p.nombre
                ORDER BY visitas DESC
                LIMIT 10
            ")->fetchAll();

            // 3. Visitas por Categoría
            $visitasCategoria = $db->query("
                SELECT c.nombre as categoria, COUNT(ep.id) as visitas
                FROM estadisticas_productos ep
                JOIN productos p ON ep.producto_id = p.id
                JOIN subcategorias s ON p.subcategoria_id = s.id
                JOIN categorias c ON s.categoria_id = c.id
                GROUP BY c.id, c.nombre
                ORDER BY visitas DESC
            ")->fetchAll();

            // 4. Resumen rápido (Hoy vs Ayer)
            $hoy = $db->query("SELECT COUNT(*) as total FROM estadisticas_visitas WHERE fecha = CURRENT_DATE")->fetchColumn();
            $ayer = $db->query("SELECT COUNT(*) as total FROM estadisticas_visitas WHERE fecha = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)")->fetchColumn();

            ResponseHandler::success([
                'grafico_visitas' => $visitasDia,
                'top_productos' => $topProductos,
                'visitas_categoria' => $visitasCategoria,
                'resumen' => [
                    'hoy' => (int)$hoy,
                    'ayer' => (int)$ayer,
                    'diferencia' => $hoy - $ayer
                ]
            ]);

        } catch (Throwable $e) {
            Logger::error('StatsController::getDashboardStats', ['exception' => $e->getMessage()]);
            ResponseHandler::error('Error al obtener estadísticas', 500);
        }
    }
}
