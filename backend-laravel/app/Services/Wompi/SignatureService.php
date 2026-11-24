<?php

declare(strict_types=1);

namespace App\Services\Wompi;

use App\Exceptions\Domain\ServicioExternoException;
use Illuminate\Support\Facades\Log;

/**
 * SignatureService
 *
 * Responsabilidades:
 *   1. Generar la firma de integridad SHA-256 para el Web Checkout / Widget de Wompi.
 *   2. Validar en tiempo constante el checksum SHA-256 (X-Event-Checksum) de los webhooks.
 *
 * Fórmula oficial de integridad (docs.wompi.co):
 *   Sin expiración: SHA256( reference + amount_in_cents + currency + integrity_secret )
 *   Con expiración: SHA256( reference + amount_in_cents + currency + expiration_time + integrity_secret )
 *
 * Fórmula oficial de checksum de evento (docs.wompi.co):
 *   SHA256( valor(data, prop_1) + valor(data, prop_2) + ... + timestamp + events_secret )
 */
final class SignatureService
{
    /**
     * Genera la firma de integridad en el servidor para el Web Checkout / Widget.
     *
     * @param  string  $reference  Referencia única del pedido (ej. PLX-17000000-ABCD)
     * @param  int  $amountCents  Monto en centavos (entero exacto desde BD)
     * @param  string  $currency  Moneda ISO-4217 ("COP")
     * @param  string|null  $expirationTime  Fecha ISO-8601 UTC opcional
     *
     * @throws ServicioExternoException
     */
    public function buildIntegritySignature(
        string $reference,
        int $amountCents,
        string $currency = 'COP',
        ?string $expirationTime = null
    ): string {
        $secret = trim((string) config('wompi.integrity_secret', ''));

        if ($secret === '') {
            Log::critical('SignatureService::buildIntegritySignature — WOMPI_INTEGRITY_SECRET no configurado');
            throw new ServicioExternoException('Wompi', 'El secreto de integridad de Wompi no está configurado.');
        }

        $cadena = $reference
            .(string) $amountCents
            .$currency
            .($expirationTime !== null && $expirationTime !== '' ? $expirationTime : '')
            .$secret;

        return hash('sha256', $cadena);
    }

    /**
     * Valida el checksum SHA-256 del webhook de Wompi (X-Event-Checksum o signature.checksum).
     *
     * @param  array<string, mixed>  $evento  Payload JSON decodificado del webhook
     * @param  string|null  $receivedChecksum  Valor del header X-Event-Checksum
     */
    public function validateWebhookChecksum(array $evento, ?string $receivedChecksum): bool
    {
        $eventsSecret = trim((string) config('wompi.events_secret', ''));

        // Fail-closed: jamás aceptar webhooks si el secreto de eventos no está configurado
        if ($eventsSecret === '') {
            Log::critical('SignatureService::validateWebhookChecksum — WOMPI_EVENTS_SECRET vacío; rechazando webhook');

            return false;
        }

        /** @var array<string, mixed> $signature */
        $signature = is_array($evento['signature'] ?? null) ? $evento['signature'] : [];

        $checksum = trim((string) ($receivedChecksum ?: ($signature['checksum'] ?? '')));
        if ($checksum === '') {
            return false;
        }

        $properties = $signature['properties'] ?? null;
        if (! is_array($properties) || $properties === []) {
            return false;
        }

        $timestamp = $evento['timestamp'] ?? null;
        if (! is_scalar($timestamp) || (string) $timestamp === '') {
            return false;
        }

        /** @var array<string, mixed> $dataNode */
        $dataNode = is_array($evento['data'] ?? null) ? $evento['data'] : [];

        $cadena = '';
        foreach ($properties as $prop) {
            if (! is_string($prop) || $prop === '') {
                return false;
            }

            // En Wompi oficial las rutas son relativas a `data` (ej. "transaction.id").
            // Soportamos también prefijo "data." por compatibilidad defensiva.
            $normalizedPath = str_starts_with($prop, 'data.')
                ? substr($prop, 5)
                : $prop;

            $val = $this->extractNestedValue($dataNode, $normalizedPath);
            if ($val === null) {
                return false;
            }

            $cadena .= $val;
        }

        $cadena .= (string) $timestamp.$eventsSecret;
        $expected = hash('sha256', $cadena);

        return hash_equals(strtolower($expected), strtolower($checksum));
    }

    /**
     * Extrae un valor escalar anidado usando notación de puntos.
     * Retorna null si la propiedad no existe o no es escalar.
     *
     * @param  array<string, mixed>  $data
     */
    private function extractNestedValue(array $data, string $dotPath): ?string
    {
        $segments = explode('.', $dotPath);
        $current = $data;

        foreach ($segments as $segment) {
            if (! is_array($current) || ! array_key_exists($segment, $current)) {
                return null;
            }
            $current = $current[$segment];
        }

        if ($current === null || is_array($current) || is_object($current)) {
            return null;
        }

        if (is_bool($current)) {
            return $current ? 'true' : 'false';
        }

        return (string) $current;
    }
}
