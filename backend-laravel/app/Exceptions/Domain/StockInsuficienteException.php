<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class StockInsuficienteException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(int $productoId, int $disponible, int $solicitado, array $context = [])
    {
        parent::__construct(
            "Stock insuficiente para el producto #{$productoId}. Disponible: {$disponible}, Solicitado: {$solicitado}.",
            array_merge(['producto_id' => $productoId, 'disponible' => $disponible, 'solicitado' => $solicitado], $context)
        );
    }

    public function httpStatus(): int
    {
        return 409;
    }

    public function errorCode(): string
    {
        return 'STOCK_INSUFICIENTE';
    }
}
