<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class StockInsuficienteException extends DomainException
{
    protected int $status = 409;

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(int $productoId, int $disponible, int $solicitado, array $context = [], int $status = 409)
    {
        $this->status = $status;
        parent::__construct(
            "Stock insuficiente para el producto #{$productoId}. Disponible: {$disponible}, Solicitado: {$solicitado}.",
            array_merge(['producto_id' => $productoId, 'disponible' => $disponible, 'solicitado' => $solicitado], $context)
        );
    }

    public static function paraReserva(string $nombre, int $disponible): self
    {
        $instance = new self(0, $disponible, 0, ['nombre' => $nombre], 400);
        $instance->message = "Stock insuficiente para \"{$nombre}\". Disponible para reservar: {$disponible}.";

        return $instance;
    }

    public function httpStatus(): int
    {
        return $this->status;
    }

    public function errorCode(): string
    {
        return 'STOCK_INSUFICIENTE';
    }
}
