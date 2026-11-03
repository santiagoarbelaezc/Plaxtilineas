<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class PedidoNoEncontradoException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(int|string $id, array $context = [])
    {
        parent::__construct(
            "Pedido #{$id} no encontrado.",
            array_merge(['pedido_id' => $id], $context)
        );
    }

    public function httpStatus(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'PEDIDO_NO_ENCONTRADO';
    }
}
