<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\WompiClientInterface;
use App\Exceptions\Domain\ServicioExternoException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class WompiService implements WompiClientInterface
{
    private function getBaseUrl(): string
    {
        $privateKey = (string) config('services.wompi.private_key', '');

        if (str_starts_with($privateKey, 'prv_test_')) {
            return 'https://sandbox.wompi.co/v1';
        }

        return (string) config('services.wompi.base_url', 'https://production.wompi.co/v1');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function crearPaymentLink(array $data): array
    {
        $privateKey = (string) config('services.wompi.private_key', '');
        if ($privateKey === '') {
            throw new ServicioExternoException('Wompi', 'Claves de Wompi no configuradas.');
        }

        $url = $this->getBaseUrl().'/payment_links';

        try {
            $response = Http::withToken($privateKey)
                ->timeout(15)
                ->post($url, $data);

            if ($response->failed()) {
                Log::error('WompiService::crearPaymentLink fallo', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new ServicioExternoException('Wompi', 'Error al crear enlace de pago en Wompi: '.$response->body());
            }

            /** @var array<string, mixed> $result */
            $result = $response->json();

            return $result;
        } catch (Throwable $e) {
            if ($e instanceof ServicioExternoException) {
                throw $e;
            }
            Log::error('WompiService::crearPaymentLink exception', ['error' => $e->getMessage()]);
            throw new ServicioExternoException('Wompi', 'No se pudo conectar con la pasarela de pagos: '.$e->getMessage(), [], $e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function consultarTransaccion(string $transId): array
    {
        $privateKey = (string) config('services.wompi.private_key', '');
        if ($privateKey === '') {
            throw new ServicioExternoException('Wompi', 'Claves de Wompi no configuradas.');
        }

        $url = $this->getBaseUrl()."/transactions/{$transId}";

        try {
            $response = Http::withToken($privateKey)
                ->timeout(10)
                ->get($url);

            if ($response->failed()) {
                Log::error('WompiService::consultarTransaccion fallo', [
                    'trans_id' => $transId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new ServicioExternoException('Wompi', 'Error al consultar transacción Wompi.');
            }

            /** @var array<string, mixed> $result */
            $result = $response->json();

            return $result;
        } catch (Throwable $e) {
            if ($e instanceof ServicioExternoException) {
                throw $e;
            }
            Log::error('WompiService::consultarTransaccion exception', ['error' => $e->getMessage()]);
            throw new ServicioExternoException('Wompi', 'No se pudo conectar con Wompi para consultar transacción.', [], $e);
        }
    }

    public function verificarChecksum(
        string $eventoId,
        string $createdAt,
        string $status,
        string $montoCentavos,
        ?string $checksumHeader
    ): bool {
        $eventsKey = (string) config('services.wompi.events_key', '');

        if ($eventsKey === '') {
            Log::warning('WompiService::verificarChecksum — events_key no configurada, webhook permisivo');

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
