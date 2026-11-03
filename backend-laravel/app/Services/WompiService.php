<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\WompiClientInterface;
use App\Services\Wompi\WompiClient;
use Illuminate\Support\Facades\Log;

/**
 * WompiService (Bridge / Backward Compatibility)
 *
 * Implementa WompiClientInterface delegando al nuevo WompiClient
 * y a SignatureService. Mantiene compatibilidad total con cualquier
 * código existente (ej. PedidoController::verificarEstado).
 */
final class WompiService implements WompiClientInterface
{
    public function __construct(
        private readonly WompiClient $client,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function crearPaymentLink(array $data): array
    {
        return $this->client->createPaymentLink($data);
    }

    /**
     * @return array<string, mixed>
     */
    public function consultarTransaccion(string $transId): array
    {
        return $this->client->getTransaction($transId);
    }

    /**
     * Verifica la firma del webhook X-Event-Checksum según la fórmula Wompi.
     */
    public function verificarChecksum(
        string $eventoId,
        string $createdAt,
        string $status,
        string $montoCentavos,
        ?string $checksumHeader
    ): bool {
        $eventsKey = (string) config('wompi.events_secret', (string) config('services.wompi.events_key', ''));

        if ($eventsKey === '') {
            Log::warning('WompiService::verificarChecksum — events_secret no configurado, webhook permisivo');

            return true;
        }

        if (! $checksumHeader) {
            return false;
        }

        $cadena = $eventoId.$createdAt.$status.$montoCentavos.$eventsKey;
        $esperada = hash('sha256', $cadena);

        return hash_equals($esperada, $checksumHeader);
    }
}
