<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Configuracion\ActualizarConfiguracionRequest;
use App\Models\Configuracion;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class ConfiguracionController extends Controller
{
    /**
     * GET /api/configuraciones
     * Obtener todas las configuraciones como mapa clave => valor (Público)
     */
    public function getAll(): JsonResponse
    {
        try {
            $configs = Configuracion::all()->pluck('valor', 'clave')->all();

            return response()->json($configs);
        } catch (Throwable $e) {
            Log::error('ConfiguracionController::getAll', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al obtener configuraciones: '.$e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/configuraciones/{clave}
     * Actualizar una configuración específica (Solo Admin)
     */
    public function update(string $clave, ActualizarConfiguracionRequest $request): JsonResponse
    {
        try {
            $valor = (string) $request->input('valor');

            Configuracion::updateOrCreate(
                ['clave' => $clave],
                ['valor' => $valor]
            );

            return response()->json([
                'mensaje' => 'Configuración actualizada',
                'clave' => $clave,
                'valor' => $valor,
            ]);
        } catch (Throwable $e) {
            Log::error('ConfiguracionController::update', ['exception' => $e->getMessage()]);

            return response()->json(['error' => 'Error al actualizar configuración: '.$e->getMessage()], 500);
        }
    }
}
