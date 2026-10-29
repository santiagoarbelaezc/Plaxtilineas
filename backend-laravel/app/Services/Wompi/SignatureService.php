<?php

declare(strict_types=1);

namespace App\Services\Wompi;

use Illuminate\Support\Facades\Log;

/**
 * SignatureService
 *
 * Responsabilidades:
 *   1. Generar la firma de integridad para el Widget/Checkout Web de Wompi.
 *   2. Validar el checksum X-Event-Checksum de los webhooks entrantes.
 *
 * Fórmula de integridad (documentación Wompi):
 *   SHA256( reference + amount_in_cents + currency + integrity_secret )
 *
 * Fórmula de checksum de evento (documentación Wompi):
 *   SHA256( prop1_value + prop2_value + ... + timestamp + events_secret )
 *   donde las propiedades se toman de signature.properties en el orden del payload.
 */
final class SignatureService
{
    /**
     * Genera la firma de integridad para el Widget/Checkout Web.
     *
     * @param  string  $reference  Referencia única del pedido (ej. PLX-17000000-ABCD)
     * @param  int  $amountCents  Monto en centavos (entero, nunca float)
     * @param  string  $currency  Moneda ISO-4217 (ej. "COP")
     */
    public function buildIntegritySignature(
        string $reference,
        int $amountCents,
        string $currency = 'COP'
    ): string {
        $secret = (string) config('wompi.integrity_secret', '');

        if ($secret === '') {
            Log::warning('SignatureService::buildIntegritySignature — integrity_secret no configurado');
        }

        return hash('sha256', $reference.$amountCents.$currency.$secret);
    }

    /**
     * Valida el checksum HMAC-SHA256 del webhook X-Event-Checksum.
     *
     * Wompi construye el hash concatenando los valores de las propiedades
     * indicadas en signature.properties (en el orden que aparecen), seguido
     * del timestamp del evento y el events_secret.
     *
     * @param  array<string, mixed>  $evento  Payload decodificado del webhook
     * @param  string|null  $receivedChecksum  Valor del header X-Event-Checksum
     */
    public function validateWebhookChecksum(array $evento, ?string $receivedChecksum): bool
    {
        $eventsSecret = (string) config('wompi.events_secret', '');

        if ($eventsSecret === '') {
            Log::warning('SignatureService::validateWebhookChecksum — events_secret no configurado; permitiendo webhook (modo permisivo)');

            return true;
        }

        if (! $receivedChecksum) {
            return false;
        }

        /** @var array<string, mixed> $signature */
        $signature = $evento['signature'] ?? [];
        /** @var list<string> $properties */
        $properties = $signature['properties'] ?? [];
        $timestamp = (string) ($signature['checksum'] ?? $evento['timestamp'] ?? '');

        // Extraer los valores de las propiedades indicadas en signature.properties
        $cadena = '';
        foreach ($properties as $prop) {
            $cadena .= $this->extractNestedValue($evento, $prop);
        }
        $cadena .= $timestamp.$eventsSecret;

        $expected = hash('sha256', $cadena);

        return hash_equals($expected, $receivedChecksum);
    }

    /**
     * Extrae un valor anidado del payload usando notación de puntos.
     * Ejemplo: "data.transaction.status" → $evento['data']['transaction']['status']
     *
     * @param  array<string, mixed>  $data
     */
    private function extractNestedValue(array $data, string $dotPath): string
    {
        $segments = explode('.', $dotPath);
        $current = $data;

        foreach ($segments as $segment) {
            if (! is_array($current) || ! array_key_exists($segment, $current)) {
                return '';
            }
            $current = $current[$segment];
        }

        return (string) ($current ?? '');
    }
}
