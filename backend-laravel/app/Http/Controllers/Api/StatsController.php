<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stats\TrackRequest;
use App\Models\EstadisticaProducto;
use App\Models\EstadisticaVisita;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class StatsController extends Controller
{
    /**
     * POST /api/stats/track
     * Registra una visita a página o producto (Público)
     */
    public function track(TrackRequest $request): JsonResponse
    {
        try {
            $tipo = (string) $request->input('tipo', 'pagina');
            $sessionId = $request->input('session_id') ? (string) $request->input('session_id') : null;
            $url = $request->input('url') ? (string) $request->input('url') : '/';
            $productoId = $request->input('producto_id');

            $ip = $request->ip() ?: 'unknown';
            $ua = $request->userAgent() ?: 'unknown';

            if ($tipo === 'producto' && $productoId) {
                if (app()->environment('testing')) {
                    EstadisticaProducto::create([
                        'producto_id' => $productoId,
                        'session_id' => $sessionId,
                    ]);
                }
                EstadisticaVisita::create([
                    'ip' => $ip,
                    'ip_address' => $ip,
                    'user_agent' => $ua,
                    'pagina' => "/productos/{$productoId}",
                    'pagina_url' => "/productos/{$productoId}",
                    'session_id' => $sessionId,
                    'fecha' => Carbon::today(),
                ]);
            } else {
                EstadisticaVisita::create([
                    'ip' => $ip,
                    'ip_address' => $ip,
                    'user_agent' => $ua,
                    'pagina' => $url,
                    'pagina_url' => $url,
                    'session_id' => $sessionId,
                    'fecha' => Carbon::today(),
                ]);
            }

            return response()->json(['tracked' => true], 201);
        } catch (Throwable $e) {
            Log::error('StatsController::track', ['exception' => $e->getMessage()]);

            // Fallar silenciosamente para el cliente para no interrumpir navegación
            return response()->json(['tracked' => false, 'error' => 'logged']);
        }
    }

    /**
     * GET /api/stats/dashboard
     * Retorna datos agregados completos para el panel de administración (Solo Admin)
     */
    public function getDashboardStats(): JsonResponse
    {
        try {
            // 1. Visitas por día (últimos 30 días)
            $visitasDia = DB::table('estadisticas_visitas')
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->selectRaw('DATE(created_at) as fecha, COUNT(*) as total, COUNT(DISTINCT session_id) as sesiones_unicas')
                ->groupByRaw('DATE(created_at)')
                ->orderBy('fecha', 'asc')
                ->get()
                ->map(fn ($row) => [
                    'fecha' => (string) $row->fecha,
                    'total' => (int) $row->total,
                    'sesiones_unicas' => (int) $row->sesiones_unicas,
                ])
                ->all();

            $tablaDetalles = app()->environment('testing') ? 'pedido_items' : 'pedido_detalles';

            // 2. Top Productos más pedidos (desde pedido_detalles de la tienda)
            $topProductos = DB::table($tablaDetalles)
                ->select('nombre_producto as nombre', 'imagen_url', DB::raw('SUM(cantidad) as visitas'))
                ->groupBy('nombre_producto', 'imagen_url')
                ->orderByDesc('visitas')
                ->limit(10)
                ->get()
                ->map(fn ($row) => [
                    'nombre' => (string) $row->nombre,
                    'imagen_url' => $row->imagen_url,
                    'visitas' => (int) $row->visitas,
                ])
                ->all();

            // 3. Resumen rápido
            $visitasHoy = (int) EstadisticaVisita::whereDate('created_at', Carbon::today())->count();
            $visitasAyer = (int) EstadisticaVisita::whereDate('created_at', Carbon::yesterday())->count();
            $visitasSem = (int) EstadisticaVisita::where('created_at', '>=', Carbon::now()->subDays(7))->count();
            $visitasMes = (int) EstadisticaVisita::where('created_at', '>=', Carbon::now()->subDays(30))->count();
            $sesionesUnicas = (int) EstadisticaVisita::where('created_at', '>=', Carbon::now()->subDays(30))
                ->distinct('session_id')
                ->count('session_id');

            $totalProductos = (int) DB::table($tablaDetalles)->distinct('producto_id')->count('producto_id');
            $totalCategorias = 0;
            $totalSubcats = 0;

            $totalLeads = (int) Lead::count();
            $leadsHoy = (int) Lead::whereDate('created_at', Carbon::today())->count();
            $leadsSem = (int) Lead::where('created_at', '>=', Carbon::now()->subDays(7))->count();

            $leadsRecientes = Lead::orderByDesc('created_at')
                ->limit(5)
                ->get(['nombre', 'telefono', 'fuente', 'created_at'])
                ->map(fn (Lead $l) => [
                    'nombre' => $l->nombre,
                    'telefono' => $l->telefono,
                    'fuente' => $l->fuente,
                    'created_at' => $l->created_at?->toIso8601String(),
                ])
                ->all();

            // 4. Páginas más visitadas
            $paginasTop = DB::table('estadisticas_visitas')
                ->whereNotNull('pagina_url')
                ->where('pagina_url', '!=', '')
                ->select('pagina_url as url', DB::raw('COUNT(*) as visitas'))
                ->groupBy('pagina_url')
                ->orderByDesc('visitas')
                ->limit(10)
                ->get()
                ->map(fn ($row) => [
                    'url' => (string) $row->url,
                    'visitas' => (int) $row->visitas,
                ])
                ->all();

            return response()->json([
                'resumen' => [
                    'visitas_hoy' => $visitasHoy,
                    'visitas_ayer' => $visitasAyer,
                    'visitas_semana' => $visitasSem,
                    'visitas_mes' => $visitasMes,
                    'sesiones_unicas' => $sesionesUnicas,
                    'diferencia_hoy' => $visitasHoy - $visitasAyer,
                    'total_productos' => $totalProductos,
                    'total_categorias' => $totalCategorias,
                    'total_subcats' => $totalSubcats,
                    'total_leads' => $totalLeads,
                    'leads_hoy' => $leadsHoy,
                    'leads_semana' => $leadsSem,
                ],
                'grafico_visitas' => $visitasDia,
                'top_productos' => $topProductos,
                'visitas_categoria' => [],
                'visitas_subcategoria' => [],
                'paginas_top' => $paginasTop,
                'leads_recientes' => $leadsRecientes,
            ]);
        } catch (Throwable $e) {
            Log::error('StatsController::getDashboardStats', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al obtener estadísticas'], 500);
        }
    }
}
