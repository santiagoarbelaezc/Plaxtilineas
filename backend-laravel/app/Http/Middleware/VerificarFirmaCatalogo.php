<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentica llamadas servidor a servidor desde catalogoplaxtilineas.com.
 *
 * Firma esperada: hex(hmac_sha256("{timestamp}.{cuerpo_crudo}", secreto))
 * Headers: X-Catalogo-Timestamp (epoch s) y X-Catalogo-Signature.
 * Falla cerrado si el secreto no está configurado.
 */
class VerificarFirmaCatalogo
{
    /** Tolerancia máxima del timestamp (anti-replay), en segundos. */
    private const VENTANA_SEGUNDOS = 300;

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $secreto = (string) config('services.catalogo.webhook_secret', '');

        if ($secreto === '') {
            return ApiResponse::error('Integración no configurada.', 503);
        }

        $timestamp = (string) $request->header('X-Catalogo-Timestamp', '');
        $firma = strtolower((string) $request->header('X-Catalogo-Signature', ''));

        if ($timestamp === '' || $firma === '' || ! ctype_digit($timestamp)) {
            return ApiResponse::error('Firma inválida.', 401);
        }

        if (abs(time() - (int) $timestamp) > self::VENTANA_SEGUNDOS) {
            return ApiResponse::error('Firma inválida.', 401);
        }

        $esperada = hash_hmac('sha256', $timestamp.'.'.$request->getContent(), $secreto);

        if (! hash_equals($esperada, $firma)) {
            return ApiResponse::error('Firma inválida.', 401);
        }

        return $next($request);
    }
}
