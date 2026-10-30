<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class UsuarioNoEncontradoException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message = 'Usuario no encontrado', array $context = [])
    {
        parent::__construct($message, $context);
    }

    public function httpStatus(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'USUARIO_NO_ENCONTRADO';
    }
}
