<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class CredencialesInvalidasException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message = 'Contraseña incorrecta', array $context = [])
    {
        parent::__construct($message, $context);
    }

    public function httpStatus(): int
    {
        return 401;
    }

    public function errorCode(): string
    {
        return 'CREDENCIALES_INVALIDAS';
    }
}
