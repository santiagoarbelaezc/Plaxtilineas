<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * ApiResponse — Respuestas JSON estandarizadas.
 *
 * IMPORTANTE: El formato replica exactamente el PHP legacy para
 * compatibilidad con el frontend Angular:
 *   - Éxito: payload directo (NO envuelto en { success, data })
 *   - Error:  { "error": "mensaje" } con extras opcionales
 */
final class ApiResponse
{
    /**
     * Respuesta de éxito — devuelve el payload directamente.
     * Replica ResponseHandler::success() del PHP.
     *
     * @param  array<string|int, mixed>  $data
     */
    public static function success(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Respuesta de error — { "error": "...", ...extras }.
     * Replica ResponseHandler::error() del PHP.
     *
     * @param  array<string, mixed>  $extra
     */
    public static function error(string $message, int $status = 400, array $extra = []): JsonResponse
    {
        $body = array_merge(['error' => $message], $extra);

        return response()->json($body, $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Error de validación (422) — formato compatible con el frontend.
     *
     * @param  array<string, mixed>  $errors
     */
    public static function validationError(array $errors, string $message = 'Los datos enviados no son válidos.'): JsonResponse
    {
        return response()->json([
            'error' => $message,
            'errors' => $errors,
        ], 422, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
