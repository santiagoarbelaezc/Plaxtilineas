<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class PqrNoEncontradaException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $identificador, array $context = [])
    {
        parent::__construct(
            'PQR no encontrada',
            array_merge(['identificador' => $identificador], $context)
        );
    }

    public function httpStatus(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'PQR_NO_ENCONTRADA';
    }
}
