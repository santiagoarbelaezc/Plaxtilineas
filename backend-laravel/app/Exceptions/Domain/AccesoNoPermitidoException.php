<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AccesoNoPermitidoException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message = 'Acceso no permitido. Se requieren permisos de administrador.', array $context = [])
    {
        parent::__construct($message, $context);
    }

    public function httpStatus(): int
    {
        return 403;
    }

    public function errorCode(): string
    {
        return 'ACCESO_NO_PERMITIDO';
    }
}
