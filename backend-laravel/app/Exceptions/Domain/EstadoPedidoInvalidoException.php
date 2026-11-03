<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class EstadoPedidoInvalidoException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $estadoActual, string $estadoNuevo, array $context = [])
    {
        parent::__construct(
            "No se puede cambiar el pedido del estado '{$estadoActual}' a '{$estadoNuevo}'.",
            array_merge(['estado_actual' => $estadoActual, 'estado_nuevo' => $estadoNuevo], $context)
        );
    }

    public function httpStatus(): int
    {
        return 422;
    }

    public function errorCode(): string
    {
        return 'ESTADO_PEDIDO_INVALIDO';
    }
}
