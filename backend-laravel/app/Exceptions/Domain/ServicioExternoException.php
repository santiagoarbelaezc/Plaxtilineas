<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class ServicioExternoException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $servicio, string $detalle = '', array $context = [], ?\Throwable $previous = null)
    {
        $mensaje = $detalle !== ''
            ? "Error al comunicarse con el servicio externo '{$servicio}': {$detalle}"
            : "Error al comunicarse con el servicio externo '{$servicio}'.";

        parent::__construct(
            $mensaje,
            array_merge(['servicio' => $servicio, 'detalle' => $detalle], $context),
            $previous
        );
    }

    public function httpStatus(): int
    {
        return 502;
    }

    public function errorCode(): string
    {
        return 'SERVICIO_EXTERNO_ERROR';
    }
}
