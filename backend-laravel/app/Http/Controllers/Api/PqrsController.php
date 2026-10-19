<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\MediaStorageInterface;
use App\Enums\EstadoPqr;
use App\Enums\TipoPqr;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pqrs\ActualizarEstadoPQRRequest;
use App\Http\Requests\Pqrs\AgregarRespuestaPQRRequest;
use App\Http\Requests\Pqrs\CrearPQRRequest;
use App\Mail\ConfirmacionCreacionPQRMailable;
use App\Mail\NotificacionRespuestaPQRMailable;
use App\Models\Pqr;
use App\Models\PqrArchivo;
use App\Models\PqrRespuesta;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class PqrsController extends Controller
{
    public function __construct(
        protected MediaStorageInterface $mediaStorage
    ) {}

    /**
     * POST /api/pqrs (pública)
     */
    public function crearPQR(CrearPQRRequest $request): JsonResponse
    {
        $ticket = 'PQR-'.date('ymd').'-'.str_pad((string) mt_rand(0, 999), 3, '0', STR_PAD_LEFT);

        return DB::transaction(function () use ($request, $ticket) {
            /** @var Pqr $pqr */
            $pqr = Pqr::create([
                'tipo' => TipoPqr::from((string) $request->input('tipo')),
                'nombre_completo' => (string) $request->input('nombre_completo'),
                'email' => (string) $request->input('email'),
                'telefono' => (string) $request->input('telefono'),
                'producto_relacionado' => $request->input('producto_relacionado'),
                'descripcion' => (string) $request->input('descripcion'),
                'estado' => EstadoPqr::PENDIENTE,
                'numero_ticket' => $ticket,
            ]);

            $archivosSubidos = [];
            $archivosInput = $request->file('archivos');
            $archivos = is_array($archivosInput)
                ? $archivosInput
                : ($archivosInput instanceof UploadedFile ? [$archivosInput] : []);

            foreach ($archivos as $file) {
                try {
                    $upload = $this->mediaStorage->upload($file, 'pqrs');
                    $tipoArchivo = str_starts_with((string) $file->getMimeType(), 'image/') ? 'image' : 'raw';

                    /** @var PqrArchivo $pqrArchivo */
                    $pqrArchivo = PqrArchivo::create([
                        'pqr_id' => $pqr->id,
                        'nombre_archivo' => $file->getClientOriginalName(),
                        'url_archivo' => $upload['url'],
                        'tipo_archivo' => $tipoArchivo,
                    ]);

                    $archivosSubidos[] = [
                        'id' => $pqrArchivo->id,
                        'nombre' => $pqrArchivo->nombre_archivo,
                        'url' => $pqrArchivo->url_archivo,
                    ];
                } catch (Throwable $e) {
                    Log::warning('PqrsController::crearPQR — Falló subida de archivo individual', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            try {
                Mail::to($pqr->email)->send(
                    new ConfirmacionCreacionPQRMailable(
                        $pqr->nombre_completo,
                        $ticket,
                        $pqr->tipo->value,
                        $pqr->descripcion
                    )
                );
            } catch (Throwable $e) {
                Log::error('PqrsController::crearPQR — Error enviando correo', ['error' => $e->getMessage()]);
            }

            return ApiResponse::success([
                'success' => true,
                'mensaje' => 'PQR creada exitosamente',
                'pqr' => [
                    'id' => $pqr->id,
                    'numero_ticket' => $ticket,
                    'tipo' => $pqr->tipo->value,
                    'estado' => $pqr->estado->value,
                    'fecha_creacion' => $pqr->created_at?->toIso8601String(),
                    'notificacion' => 'Se ha enviado un correo de confirmación a su email',
                ],
                'archivos' => [
                    'total' => count($archivosSubidos),
                    'detalles' => $archivosSubidos,
                ],
            ], 201);
        });
    }

    /**
     * GET /api/pqrs/consulta/{id} (pública)
     */
    public function obtenerPQRPorId(string $id): JsonResponse
    {
        if (trim($id) === '') {
            return ApiResponse::error('El ID o ticket es requerido', 400);
        }

        $isUuid = Str::isUuid($id);
        $query = Pqr::with(['archivos', 'respuestas']);

        /** @var Pqr|null $pqr */
        $pqr = $isUuid ? $query->where('id', $id)->first() : $query->where('numero_ticket', $id)->first();

        if (! $pqr) {
            return ApiResponse::error('PQR no encontrada', 404);
        }

        $archivosData = $pqr->archivos->map(fn ($a) => [
            'id' => $a->id,
            'nombre_archivo' => $a->nombre_archivo,
            'url_archivo' => $a->url_archivo,
            'tipo_archivo' => $a->tipo_archivo,
            'fecha_subida' => $a->created_at?->format('d/m/Y H:i'),
        ])->all();

        $respuestasData = $pqr->respuestas->map(fn ($r) => [
            'id' => $r->id,
            'mensaje' => $r->mensaje,
            'tipo' => $r->tipo,
            'fecha_respuesta' => $r->created_at?->format('d/m/Y H:i'),
        ])->all();

        return ApiResponse::success([
            'success' => true,
            'pqr' => [
                'id' => $pqr->id,
                'tipo' => $pqr->tipo->value,
                'nombre_completo' => $pqr->nombre_completo,
                'email' => $pqr->email,
                'telefono' => $pqr->telefono,
                'producto_relacionado' => $pqr->producto_relacionado,
                'descripcion' => $pqr->descripcion,
                'estado' => $pqr->estado->value,
                'numero_ticket' => $pqr->numero_ticket,
                'fecha_creacion' => $pqr->created_at?->toIso8601String(),
                'fecha_creacion_formateada' => $pqr->created_at?->format('d/m/Y H:i'),
                'fecha_actualizacion_formateada' => $pqr->updated_at?->format('d/m/Y H:i'),
                'archivos' => $archivosData,
                'respuestas' => $respuestasData,
                'tiene_archivos' => count($archivosData) > 0,
                'tiene_respuestas' => count($respuestasData) > 0,
                'total_archivos' => count($archivosData),
                'total_respuestas' => count($respuestasData),
            ],
        ]);
    }

    /**
     * GET /api/pqrs (admin)
     */
    public function obtenerPQRS(Request $request): JsonResponse
    {
        $estado = $request->query('estado');
        $tipo = $request->query('tipo');
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');
        $limit = max(1, (int) $request->query('limit', 50));
        $page = max(1, (int) $request->query('page', 1));

        $query = Pqr::withCount(['respuestas', 'archivos']);

        if ($estado && in_array($estado, ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO'], true)) {
            $query->where('estado', $estado);
        }
        if ($tipo && in_array($tipo, ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA'], true)) {
            $query->where('tipo', $tipo);
        }
        if ($fechaInicio) {
            $query->whereDate('created_at', '>=', $fechaInicio);
        }
        if ($fechaFin) {
            $query->whereDate('created_at', '<=', $fechaFin);
        }

        $total = $query->count();
        $offset = ($page - 1) * $limit;
        $pqrs = $query->orderByDesc('created_at')->skip($offset)->take($limit)->get();

        $data = $pqrs->map(fn ($p) => [
            'id' => $p->id,
            'tipo' => $p->tipo->value,
            'nombre_completo' => $p->nombre_completo,
            'email' => $p->email,
            'telefono' => $p->telefono,
            'producto_relacionado' => $p->producto_relacionado,
            'descripcion' => $p->descripcion,
            'estado' => $p->estado->value,
            'numero_ticket' => $p->numero_ticket,
            'fecha_creacion' => $p->created_at?->toIso8601String(),
            'fecha_creacion_format' => $p->created_at?->format('d/m/Y H:i'),
            'fecha_actualizacion_format' => $p->updated_at?->format('d/m/Y H:i'),
            'total_respuestas' => $p->respuestas_count,
            'total_archivos' => $p->archivos_count,
        ])->all();

        return ApiResponse::success([
            'success' => true,
            'data' => $data,
            'paginacion' => [
                'total' => $total,
                'pagina_actual' => $page,
                'total_paginas' => (int) ceil($total / $limit),
                'por_pagina' => $limit,
            ],
        ]);
    }

    /**
     * GET /api/pqrs/estadisticas (admin)
     */
    public function obtenerEstadisticas(): JsonResponse
    {
        $total = Pqr::count();
        $pendientes = Pqr::where('estado', EstadoPqr::PENDIENTE)->count();
        $enProceso = Pqr::where('estado', EstadoPqr::EN_PROCESO)->count();
        $resueltos = Pqr::where('estado', EstadoPqr::RESUELTO)->count();
        $cerrados = Pqr::where('estado', EstadoPqr::CERRADO)->count();

        $porTipo = DB::table('pqrs')
            ->select('tipo', DB::raw('count(*) as total'))
            ->groupBy('tipo')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'tipo' => (string) $row->tipo,
                'total' => (int) $row->total,
            ])->all();

        return ApiResponse::success([
            'success' => true,
            'estadisticas' => [
                'total' => $total,
                'pendientes' => $pendientes,
                'en_proceso' => $enProceso,
                'resueltos' => $resueltos,
                'cerrados' => $cerrados,
            ],
            'por_tipo' => $porTipo,
        ]);
    }

    /**
     * GET /api/pqrs/ultimas (admin)
     */
    public function obtenerUltimaPQR(): JsonResponse
    {
        $ultimas = Pqr::orderByDesc('created_at')->take(5)->get();

        $data = $ultimas->map(fn ($p) => [
            'id' => $p->id,
            'tipo' => $p->tipo->value,
            'nombre_completo' => $p->nombre_completo,
            'email' => $p->email,
            'estado' => $p->estado->value,
            'numero_ticket' => $p->numero_ticket,
            'fecha_creacion' => $p->created_at?->format('d/m/Y H:i'),
        ])->all();

        return ApiResponse::success([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * GET /api/pqrs/buscar (admin)
     */
    public function buscarPQRS(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $limit = max(1, (int) $request->query('limit', 20));

        $term = "%{$q}%";
        $results = Pqr::where('nombre_completo', 'like', $term)
            ->orWhere('email', 'like', $term)
            ->orWhere('numero_ticket', 'like', $term)
            ->orWhere('descripcion', 'like', $term)
            ->orderByDesc('created_at')
            ->take($limit)
            ->get();

        $data = $results->map(fn ($p) => [
            'id' => $p->id,
            'tipo' => $p->tipo->value,
            'nombre_completo' => $p->nombre_completo,
            'email' => $p->email,
            'estado' => $p->estado->value,
            'numero_ticket' => $p->numero_ticket,
            'fecha_creacion' => $p->created_at?->format('d/m/Y H:i'),
        ])->all();

        return ApiResponse::success([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * PUT /api/pqrs/{id}/estado (admin)
     */
    public function actualizarEstadoPQR(string $id, ActualizarEstadoPQRRequest $request): JsonResponse
    {
        /** @var Pqr|null $pqr */
        $pqr = Pqr::find($id);
        if (! $pqr) {
            return ApiResponse::error('PQR no encontrada', 404);
        }

        $estadoAnterior = $pqr->estado->value;
        $nuevoEstado = (string) $request->input('estado');
        $mensaje = (string) $request->input('mensaje_respuesta', '');

        DB::transaction(function () use ($pqr, $nuevoEstado, $mensaje) {
            $pqr->update(['estado' => EstadoPqr::from($nuevoEstado)]);

            if ($mensaje !== '') {
                PqrRespuesta::create([
                    'pqr_id' => $pqr->id,
                    'mensaje' => $mensaje,
                    'tipo' => 'ADMINISTRACION',
                ]);
            }
        });

        return ApiResponse::success([
            'success' => true,
            'mensaje' => 'Estado de PQR actualizado correctamente',
            'numero_ticket' => $pqr->numero_ticket,
            'cambios' => [
                'estado_anterior' => $estadoAnterior,
                'estado_nuevo' => $nuevoEstado,
            ],
        ]);
    }

    /**
     * POST /api/pqrs/{id}/respuestas (admin)
     */
    public function agregarRespuesta(string $id, AgregarRespuestaPQRRequest $request): JsonResponse
    {
        /** @var Pqr|null $pqr */
        $pqr = Pqr::find($id);
        if (! $pqr) {
            return ApiResponse::error('PQR no encontrada', 404);
        }

        $mensaje = (string) $request->input('mensaje');
        $tipo = (string) $request->input('tipo', 'ADMINISTRACION');

        return DB::transaction(function () use ($pqr, $mensaje, $tipo, $request) {
            /** @var PqrRespuesta $respuesta */
            $respuesta = PqrRespuesta::create([
                'pqr_id' => $pqr->id,
                'mensaje' => $mensaje,
                'tipo' => $tipo,
            ]);

            $nuevoEstado = $pqr->estado->value;
            if ($tipo === 'ADMINISTRACION' && $pqr->estado === EstadoPqr::PENDIENTE) {
                $nuevoEstado = EstadoPqr::EN_PROCESO->value;
                $pqr->update(['estado' => EstadoPqr::EN_PROCESO]);
            } else {
                $pqr->touch();
            }

            $archivoAdjunto = null;
            $file = $request->file('adjunto');
            if ($file instanceof UploadedFile) {
                try {
                    $upload = $this->mediaStorage->upload($file, 'pqrs');
                    /** @var PqrArchivo $pqrArchivo */
                    $pqrArchivo = PqrArchivo::create([
                        'pqr_id' => $pqr->id,
                        'nombre_archivo' => $file->getClientOriginalName(),
                        'url_archivo' => $upload['url'],
                        'tipo_archivo' => 'image',
                    ]);
                    $archivoAdjunto = ['id' => $pqrArchivo->id, 'url' => $upload['url']];
                } catch (Throwable $e) {
                    Log::warning('PqrsController::agregarRespuesta — Falló subida adjunto', ['error' => $e->getMessage()]);
                }
            }

            if ($tipo === 'ADMINISTRACION') {
                try {
                    Mail::to($pqr->email)->send(
                        new NotificacionRespuestaPQRMailable(
                            $pqr->nombre_completo,
                            $pqr->numero_ticket,
                            $mensaje,
                            $nuevoEstado
                        )
                    );
                } catch (Throwable $e) {
                    Log::error('PqrsController::agregarRespuesta — Error enviando correo', ['error' => $e->getMessage()]);
                }
            }

            return ApiResponse::success([
                'success' => true,
                'mensaje' => 'Respuesta agregada correctamente',
                'respuesta' => [
                    'id' => $respuesta->id,
                    'pqr_id' => $pqr->id,
                    'tipo' => $tipo,
                    'mensaje' => $mensaje,
                ],
                'archivo_adjunto' => $archivoAdjunto,
            ], 201);
        });
    }

    /**
     * DELETE /api/pqrs/{id} (admin)
     */
    public function eliminarPQR(string $id): JsonResponse
    {
        /** @var Pqr|null $pqr */
        $pqr = Pqr::with('archivos')->find($id);
        if (! $pqr) {
            return ApiResponse::error('PQR no encontrada', 404);
        }

        foreach ($pqr->archivos as $archivo) {
            $this->mediaStorage->delete($archivo->url_archivo);
        }

        DB::transaction(function () use ($pqr) {
            $pqr->archivos()->delete();
            $pqr->respuestas()->delete();
            $pqr->delete();
        });

        return ApiResponse::success([
            'success' => true,
            'mensaje' => 'PQR eliminada correctamente',
            'eliminado' => [
                'pqr_id' => $id,
                'numero_ticket' => $pqr->numero_ticket,
            ],
        ]);
    }
}
