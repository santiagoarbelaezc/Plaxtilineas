<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class IpBaneadaException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $ip, string $razon = 'Acceso bloqueado por actividad sospechosa.', array $context = [])
    {
        parent::__construct(
            $razon,
            array_merge(['ip' => $ip, 'razon' => $razon], $context)
        );
    }

    public function httpStatus(): int
    {
        return 403;
    }

    public function errorCode(): string
    {
        return 'IP_BANEADA';
    }
}
