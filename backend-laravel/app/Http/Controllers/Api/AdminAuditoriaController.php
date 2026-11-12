<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditoriaLog;
use App\Models\AdminSesion;
use App\Models\Usuario;
use App\Services\AdminAuditService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAuditoriaController extends Controller
{
    public function __construct(
        private readonly AdminAuditService $auditService
    ) {}

    /**
     * GET /api/admin/auditoria
     * Obtiene el registro paginado de operaciones de auditoría y métricas generales.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Usuario $admin */
        $admin = $request->user();
        $sesionActual = $this->auditService->actualizarActividad($admin, $request);

        $modulo = trim((string) $request->query('modulo', ''));
        $accion = trim((string) $request->query('accion', ''));
        $sesionId = $request->query('sesion_id');
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $q = trim((string) $request->query('q', ''));
        $limit = min(100, max(1, (int) $request->query('limit', 30)));
        $page = max(1, (int) $request->query('page', 1));

        $query = AdminAuditoriaLog::with(['admin', 'sesion']);

        if ($modulo !== '' && strtoupper($modulo) !== 'TODOS') {
            $query->where('modulo', strtoupper($modulo));
        }

        if ($accion !== '' && strtoupper($accion) !== 'TODAS') {
            $query->where('accion', strtoupper($accion));
        }

        if ($sesionId !== null && $sesionId !== '') {
            $query->where('sesion_id', (int) $sesionId);
        }

        if ($fechaInicio) {
            $query->whereDate('created_at', '>=', (string) $fechaInicio);
        }

        if ($fechaFin) {
            $query->whereDate('created_at', '<=', (string) $fechaFin);
        }

        if ($q !== '') {
            $term = "%{$q}%";
            $query->where(function ($sub) use ($term) {
                $sub->where('descripcion', 'like', $term)
                    ->orWhere('accion', 'like', $term)
                    ->orWhere('modulo', 'like', $term)
                    ->orWhere('entidad_id', 'like', $term)
                    ->orWhere('ip_address', 'like', $term);
            });
        }

        $totalFiltrados = (clone $query)->count();
        $offset = ($page - 1) * $limit;

        $logs = $query->orderByDesc('created_at')
            ->orderByDesc('id')
            ->skip($offset)
            ->take($limit)
            ->get();

        $logsData = $logs->map(function (AdminAuditoriaLog $log) {
            $sesionSegundos = $log->sesion ? $log->sesion->calcularSegundosEfectivos() : 0;

            return [
                'id' => $log->id,
                'sesion_id' => $log->sesion_id,
                'admin_id' => $log->admin_id,
                'admin_nombre' => $log->admin->nombre ?? 'Administrador',
                'admin_correo' => $log->admin->correo ?? '',
                'modulo' => $log->modulo,
                'accion' => $log->accion,
                'descripcion' => $log->descripcion,
                'entidad_tipo' => $log->entidad_tipo,
                'entidad_id' => $log->entidad_id,
                'datos_anteriores' => $log->datos_anteriores,
                'datos_nuevos' => $log->datos_nuevos,
                'ip_address' => $log->ip_address,
                'fecha' => $log->created_at?->toIso8601String(),
                'fecha_formateada' => $log->created_at?->format('d/m/Y H:i:s'),
                'hora_formateada' => $log->created_at?->format('H:i:s'),
                'sesion_activa' => (bool) ($log->sesion->activa ?? false),
                'sesion_duracion_segundos' => $sesionSegundos,
                'sesion_duracion_formateada' => AdminSesion::formatearSegundos($sesionSegundos),
            ];
        })->all();

        // Estadísticas globales
        $totalOperaciones = AdminAuditoriaLog::count();
        $operacionesHoy = AdminAuditoriaLog::whereDate('created_at', now()->toDateString())->count();
        $totalSesiones = AdminSesion::count();
        $sesionesActivas = AdminSesion::where('activa', true)->count();

        $todasSesiones = AdminSesion::all();
        $tiempoTotalSegundos = $todasSesiones->sum(fn (AdminSesion $s) => $s->calcularSegundosEfectivos());
        $tiempoPromedioSegundos = $totalSesiones > 0 ? intdiv((int) $tiempoTotalSegundos, $totalSesiones) : 0;

        $eliminacionesTotales = AdminAuditoriaLog::where('accion', 'like', 'ELIMINAR_%')->count();
        $respuestasPqr = AdminAuditoriaLog::where('accion', 'RESPONDER_PQR')->count();
        $gestionesPedidos = AdminAuditoriaLog::where('modulo', 'PEDIDOS')->count();

        $porModulo = AdminAuditoriaLog::select('modulo', DB::raw('count(*) as total'))
            ->groupBy('modulo')
            ->pluck('total', 'modulo')
            ->all();

        $sesionActualSegundos = $sesionActual ? $sesionActual->calcularSegundosEfectivos() : 0;

        return ApiResponse::success([
            'estadisticas' => [
                'total_operaciones' => $totalOperaciones,
                'operaciones_hoy' => $operacionesHoy,
                'total_sesiones' => $totalSesiones,
                'sesiones_activas' => $sesionesActivas,
                'eliminaciones_totales' => $eliminacionesTotales,
                'respuestas_pqr' => $respuestasPqr,
                'gestiones_pedidos' => $gestionesPedidos,
                'tiempo_total_segundos' => (int) $tiempoTotalSegundos,
                'tiempo_total_formateado' => AdminSesion::formatearSegundos((int) $tiempoTotalSegundos),
                'tiempo_promedio_segundos' => $tiempoPromedioSegundos,
                'tiempo_promedio_formateado' => AdminSesion::formatearSegundos($tiempoPromedioSegundos),
                'por_modulo' => $porModulo,
                'sesion_actual' => $sesionActual ? [
                    'id' => $sesionActual->id,
                    'inicio_sesion_at' => $sesionActual->inicio_sesion_at->toIso8601String(),
                    'inicio_formateado' => $sesionActual->inicio_sesion_at->format('d/m/Y H:i:s'),
                    'ultima_actividad_at' => $sesionActual->ultima_actividad_at?->toIso8601String(),
                    'duracion_segundos' => $sesionActualSegundos,
                    'duracion_formateada' => AdminSesion::formatearSegundos($sesionActualSegundos),
                    'ip_address' => $sesionActual->ip_address,
                    'activa' => $sesionActual->activa,
                ] : null,
            ],
            'logs' => $logsData,
            'paginacion' => [
                'total' => $totalFiltrados,
                'pagina_actual' => $page,
                'total_paginas' => max(1, (int) ceil($totalFiltrados / $limit)),
                'por_pagina' => $limit,
            ],
        ]);
    }

    /**
     * GET /api/admin/auditoria/sesiones
     * Obtiene el historial de sesiones de administradores con tiempo logueado y operaciones por sesión.
     */
    public function sesiones(Request $request): JsonResponse
    {
        /** @var Usuario $admin */
        $admin = $request->user();
        $this->auditService->actualizarActividad($admin, $request);

        $limit = min(100, max(1, (int) $request->query('limit', 25)));

        $sesiones = AdminSesion::with([
            'admin',
            'logs' => fn ($q) => $q->orderByDesc('created_at'),
        ])
            ->withCount('logs')
            ->orderByDesc('inicio_sesion_at')
            ->orderByDesc('id')
            ->take($limit)
            ->get();

        $data = $sesiones->map(function (AdminSesion $s) {
            $segundos = $s->calcularSegundosEfectivos();

            $operaciones = $s->logs->take(15)->map(fn (AdminAuditoriaLog $l) => [
                'id' => $l->id,
                'modulo' => $l->modulo,
                'accion' => $l->accion,
                'descripcion' => $l->descripcion,
                'hora' => $l->created_at?->format('H:i:s'),
                'fecha_formateada' => $l->created_at?->format('d/m/Y H:i:s'),
            ])->values()->all();

            return [
                'id' => $s->id,
                'admin_id' => $s->admin_id,
                'admin_nombre' => $s->admin->nombre ?? 'Administrador',
                'admin_correo' => $s->admin->correo ?? '',
                'ip_address' => $s->ip_address,
                'user_agent' => $s->user_agent,
                'inicio_sesion_at' => $s->inicio_sesion_at->toIso8601String(),
                'inicio_formateado' => $s->inicio_sesion_at->format('d/m/Y H:i:s'),
                'ultima_actividad_at' => $s->ultima_actividad_at?->toIso8601String(),
                'ultima_actividad_formateada' => $s->ultima_actividad_at?->format('d/m/Y H:i:s'),
                'fin_sesion_at' => $s->fin_sesion_at?->toIso8601String(),
                'fin_formateado' => $s->fin_sesion_at?->format('d/m/Y H:i:s'),
                'duracion_segundos' => $segundos,
                'duracion_formateada' => AdminSesion::formatearSegundos($segundos),
                'activa' => (bool) $s->activa,
                'total_operaciones' => (int) $s->logs_count,
                'operaciones' => $operaciones,
            ];
        })->all();

        return ApiResponse::success([
            'sesiones' => $data,
        ]);
    }
}
