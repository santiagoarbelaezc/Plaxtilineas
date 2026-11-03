<?php

declare(strict_types=1);

namespace App\Contracts;

interface WompiClientInterface
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function crearPaymentLink(array $data): array;

    /**
     * @return array<string, mixed>
     */
    public function consultarTransaccion(string $transId): array;

    /**
     * Verifica la firma del webhook X-Event-Checksum según la fórmula Wompi.
     */
    public function verificarChecksum(string $eventoId, string $createdAt, string $status, string $montoCentavos, ?string $checksumHeader): bool;
}
