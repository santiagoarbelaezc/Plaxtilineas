<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\MediaStorageInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Componentes\ActualizarComponenteRequest;
use App\Http\Requests\Componentes\CrearComponenteRequest;
use App\Http\Requests\Componentes\ReordenarComponentesRequest;
use App\Models\ComponenteDinamico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ComponentesController extends Controller
{
    public function __construct(
        private readonly MediaStorageInterface $mediaStorage
    ) {}

    /**
     * GET /api/componentes
     * Obtener lista de componentes ordenados (Público)
     */
    public function index(): JsonResponse
    {
        try {
            $componentes = ComponenteDinamico::orderBy('orden', 'asc')
                ->get()
                ->map(fn (ComponenteDinamico $c) => [
                    'id' => $c->id,
                    'tipo' => $c->tipo,
                    'orden' => $c->orden,
                    'activo' => $c->activo ? 1 : 0,
                    'contenido' => $c->contenido,
                ])
                ->all();

            return response()->json($componentes);
        } catch (Throwable $e) {
            Log::error('ComponentesController::index', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al obtener los componentes'], 500);
        }
    }

    /**
     * POST /api/componentes
     * Crear un nuevo componente dinámico (Solo Admin)
     */
    public function create(CrearComponenteRequest $request): JsonResponse
    {
        try {
            $tipo = (string) $request->input('tipo');
            /** @var array<string, mixed> $contenido */
            $contenido = $request->input('contenido');
            $activo = (bool) $request->input('activo', true);

            $maxOrden = (int) ComponenteDinamico::max('orden');
            $nuevoOrden = $maxOrden + 1;

            $componente = ComponenteDinamico::create([
                'tipo' => $tipo,
                'orden' => $nuevoOrden,
                'activo' => $activo,
                'contenido' => $contenido,
            ]);

            return response()->json([
                'id' => $componente->id,
                'tipo' => $componente->tipo,
                'orden' => $componente->orden,
                'activo' => $componente->activo ? 1 : 0,
                'contenido' => $componente->contenido,
            ], 201);
        } catch (Throwable $e) {
            Log::error('ComponentesController::create', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al crear el componente'], 500);
        }
    }

    /**
     * PUT /api/componentes/{id}
     * Actualizar contenido o estado activo de un componente (Solo Admin)
     */
    public function update(int $id, ActualizarComponenteRequest $request): JsonResponse
    {
        try {
            /** @var ComponenteDinamico|null $componente */
            $componente = ComponenteDinamico::find($id);
            if (! $componente) {
                return response()->json(['error' => 'Componente no encontrado'], 404);
            }

            $datos = [];
            if ($request->has('tipo')) {
                $datos['tipo'] = (string) $request->input('tipo');
            }
            if ($request->has('activo')) {
                $datos['activo'] = (bool) $request->input('activo');
            }
            if ($request->has('contenido')) {
                $datos['contenido'] = $request->input('contenido');
            }

            if (empty($datos)) {
                return response()->json(['error' => 'No se enviaron datos para actualizar'], 400);
            }

            $componente->update($datos);

            return response()->json(['actualizado' => true]);
        } catch (Throwable $e) {
            Log::error('ComponentesController::update', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al actualizar el componente'], 500);
        }
    }

    /**
     * PUT /api/componentes/reordenar
     * Actualizar el orden de múltiples componentes dinámicos en lote (Solo Admin)
     */
    public function reordenar(ReordenarComponentesRequest $request): JsonResponse
    {
        try {
            /** @var list<int> $ordenIds */
            $ordenIds = $request->input('orden_ids', []);

            DB::transaction(function () use ($ordenIds) {
                foreach ($ordenIds as $index => $id) {
                    ComponenteDinamico::where('id', $id)->update(['orden' => $index + 1]);
                }
            });

            return response()->json(['reordenado' => true]);
        } catch (Throwable $e) {
            Log::error('ComponentesController::reordenar', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al guardar el nuevo orden de los componentes'], 500);
        }
    }

    /**
     * DELETE /api/componentes/{id}
     * Eliminar un componente dinámico (Solo Admin)
     */
    public function delete(int $id): JsonResponse
    {
        try {
            /** @var ComponenteDinamico|null $componente */
            $componente = ComponenteDinamico::find($id);
            if (! $componente) {
                return response()->json(['error' => 'Componente no encontrado'], 404);
            }

            $componente->delete();

            return response()->json(['eliminado' => true]);
        } catch (Throwable $e) {
            Log::error('ComponentesController::delete', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al eliminar el componente'], 500);
        }
    }

    /**
     * POST /api/componentes/upload
     * Sube una imagen a Cloudinary (Solo Admin)
     */
    public function uploadImage(Request $request): JsonResponse
    {
        try {
            $file = $request->file('imagen');
            if (! $file instanceof UploadedFile) {
                return response()->json(['error' => 'No se recibió ninguna imagen'], 400);
            }

            $upload = $this->mediaStorage->upload($file, 'componentes');

            return response()->json([
                'url' => $upload['url'],
                'public_id' => $upload['public_id'],
            ]);
        } catch (Throwable $e) {
            Log::error('ComponentesController::uploadImage', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al procesar la imagen: '.$e->getMessage()], 500);
        }
    }
}
