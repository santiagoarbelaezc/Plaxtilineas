<?php

declare(strict_types=1);

namespace App\Services\Wompi;

use App\Exceptions\Domain\ServicioExternoException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * WompiClient
 *
 * Capa HTTP exclusiva para comunicarse con el API de Wompi.
 * Aplica timeouts, reintentos automáticos y logging uniforme.
 * No contiene lógica de negocio; eso vive en los Actions.
 */
final class WompiClient
{
    private string $baseUrl;
    private string $privateKey;
    private int $timeout;
    private int $retryTimes;
    private int $retrySleep;

    public function __construct()
    {
        $this->baseUrl    = (string) config('wompi.base_url', 'https://sandbox.wompi.co/v1');
        $this->privateKey = (string) config('wompi.private_key', '');
        $this->timeout    = (int) config('wompi.timeout', 15);
        $this->retryTimes = (int) config('wompi.retry_times', 2);
        $this->retrySleep = (int) config('wompi.retry_sleep', 500);
    }

    /**
     * Crea un Payment Link en Wompi.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws ServicioExternoException
     */
    public function createPaymentLink(array $payload): array
    {
        return $this->post('/payment_links', $payload);
    }

    /**
     * Consulta el estado real de una transacción por su ID de Wompi.
     *
     * @return array<string, mixed>
     *
     * @throws ServicioExternoException
     */
    public function getTransaction(string $transactionId): array
    {
        return $this->get("/transactions/{$transactionId}");
    }

    /**
     * Consulta las transacciones asociadas a un Payment Link.
     *
     * @return array<string, mixed>
     *
     * @throws ServicioExternoException
     */
    public function getPaymentLinkTransactions(string $linkId): array
    {
        return $this->get("/payment_links/{$linkId}/transactions");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HTTP primitives
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     *
     * @throws ServicioExternoException
     */
    private function post(string $path, array $body): array
    {
        $this->guardKeys();

        try {
            $response = Http::withToken($this->privateKey)
                ->timeout($this->timeout)
                ->retry($this->retryTimes, $this->retrySleep)
                ->post($this->baseUrl . $path, $body);

            return $this->handleResponse($response, 'POST', $path);
        } catch (ServicioExternoException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('WompiClient::post — Network error', [
                'path'  => $path,
                'error' => $e->getMessage(),
            ]);
            throw new ServicioExternoException('Wompi', "No se pudo conectar con Wompi [{$path}]: " . $e->getMessage(), [], $e);
        }
    }

    /**
     * @return array<string, mixed>
     *
     * @throws ServicioExternoException
     */
    private function get(string $path): array
    {
        $this->guardKeys();

        try {
            $response = Http::withToken($this->privateKey)
                ->timeout($this->timeout)
                ->retry($this->retryTimes, $this->retrySleep)
                ->get($this->baseUrl . $path);

            return $this->handleResponse($response, 'GET', $path);
        } catch (ServicioExternoException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('WompiClient::get — Network error', [
                'path'  => $path,
                'error' => $e->getMessage(),
            ]);
            throw new ServicioExternoException('Wompi', "No se pudo conectar con Wompi [{$path}]: " . $e->getMessage(), [], $e);
        }
    }

    /**
     * @return array<string, mixed>
     *
     * @throws ServicioExternoException
     */
    private function handleResponse(Response $response, string $method, string $path): array
    {
        if ($response->failed()) {
            Log::error('WompiClient — HTTP error', [
                'method' => $method,
                'path'   => $path,
                'status' => $response->status(),
                // NO loguear el body completo si pudiera contener datos de tarjeta
                'error_type' => $response->json('error.type') ?? 'unknown',
            ]);
            throw new ServicioExternoException(
                'Wompi',
                "Wompi respondió con error HTTP {$response->status()} en {$method} {$path}"
            );
        }

        /** @var array<string, mixed> $json */
        $json = $response->json() ?? [];

        return $json;
    }

    /**
     * @throws ServicioExternoException
     */
    private function guardKeys(): void
    {
        if ($this->privateKey === '') {
            throw new ServicioExternoException('Wompi', 'Las llaves de Wompi no están configuradas (WOMPI_PRIVATE_KEY).');
        }
    }
}
