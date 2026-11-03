<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class FirmaWompiInvalidaException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message = 'Firma de evento Wompi inválida o no coincide con el checksum calculado.', array $context = [])
    {
        parent::__construct($message, $context);
    }

    public function httpStatus(): int
    {
        return 400;
    }

    public function errorCode(): string
    {
        return 'FIRMA_WOMPI_INVALIDA';
    }
}
