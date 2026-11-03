<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\CrearLeadRequest;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class LeadsController extends Controller
{
    /**
     * POST /api/leads
     * Registra un nuevo lead (pública, sin autenticación)
     */
    public function create(CrearLeadRequest $request): JsonResponse
    {
        try {
            $nombre = trim((string) $request->input('nombre'));
            $telefono = trim((string) $request->input('telefono'));
            $fuente = trim((string) $request->input('fuente', 'modal_bienvenida'));
            if ($fuente === '') {
                $fuente = 'modal_bienvenida';
            }
            $email = $request->input('email') ? trim((string) $request->input('email')) : null;

            // Verificar si ya existe este número para no duplicar
            $existente = Lead::where('telefono', $telefono)->first();
            if ($existente) {
                return response()->json([
                    'error' => 'Este número de teléfono ya se encuentra registrado.',
                ], 409);
            }

            $lead = Lead::create([
                'nombre' => $nombre,
                'telefono' => $telefono,
                'fuente' => $fuente,
                'email' => $email,
                'ip_address' => $request->ip() ?: 'unknown',
                'user_agent' => $request->userAgent() ?: 'unknown',
            ]);

            Log::info('LeadsController::create', ['nombre' => $nombre, 'fuente' => $fuente]);

            return response()->json([
                'registrado' => true,
                'id' => $lead->id,
                'mensaje' => '¡Registro exitoso! Pronto recibirás nuestras novedades.',
            ], 201);
        } catch (Throwable $e) {
            Log::error('LeadsController::create', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al registrar. Intenta de nuevo.'], 500);
        }
    }

    /**
     * GET /api/leads
     * Lista todos los leads (requiere autenticación admin)
     */
    public function getAll(Request $request): JsonResponse
    {
        try {
            $pagina = max(1, (int) $request->query('pagina', 1));
            $limite = min(100, max(10, (int) $request->query('limite', 20)));
            $offset = ($pagina - 1) * $limite;
            $busqueda = trim((string) $request->query('buscar', ''));

            $query = Lead::query();

            if ($busqueda !== '') {
                $like = "%{$busqueda}%";
                $query->where(function ($q) use ($like) {
                    $q->where('nombre', 'LIKE', $like)
                        ->orWhere('telefono', 'LIKE', $like);
                });
            }

            $total = (int) $query->count();

            $leads = $query->orderBy('created_at', 'desc')
                ->offset($offset)
                ->limit($limite)
                ->select(['id', 'nombre', 'telefono', 'fuente', 'ip_address', 'created_at'])
                ->get()
                ->map(fn (Lead $l) => [
                    'id' => $l->id,
                    'nombre' => $l->nombre,
                    'telefono' => $l->telefono,
                    'fuente' => $l->fuente,
                    'ip_address' => $l->ip_address,
                    'created_at' => $l->created_at?->toIso8601String(),
                ]);

            return response()->json([
                'leads' => $leads,
                'total' => $total,
                'pagina' => $pagina,
                'limite' => $limite,
                'total_paginas' => (int) ceil($total / $limite),
            ]);
        } catch (Throwable $e) {
            Log::error('LeadsController::getAll', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al obtener leads.'], 500);
        }
    }

    /**
     * GET /api/leads/stats
     * Estadísticas de leads: total, por día, por fuente
     */
    public function getStats(): JsonResponse
    {
        try {
            $total = (int) Lead::count();
            $hoy = (int) Lead::whereDate('created_at', Carbon::today())->count();
            $estaSem = (int) Lead::where('created_at', '>=', Carbon::now()->subDays(7))->count();

            // Últimos 30 días (agrupados por día)
            $porDia = DB::table('leads')
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->selectRaw('DATE(created_at) as fecha, COUNT(*) as total')
                ->groupByRaw('DATE(created_at)')
                ->orderBy('fecha', 'asc')
                ->get()
                ->map(fn ($item) => [
                    'fecha' => (string) $item->fecha,
                    'total' => (int) $item->total,
                ])
                ->all();

            // Por fuente
            $porFuente = DB::table('leads')
                ->selectRaw('fuente, COUNT(*) as total')
                ->groupBy('fuente')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($item) => [
                    'fuente' => (string) $item->fuente,
                    'total' => (int) $item->total,
                ])
                ->all();

            return response()->json([
                'total' => $total,
                'hoy' => $hoy,
                'esta_semana' => $estaSem,
                'por_dia' => $porDia,
                'por_fuente' => $porFuente,
            ]);
        } catch (Throwable $e) {
            Log::error('LeadsController::getStats', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al obtener estadísticas de leads.'], 500);
        }
    }
}
