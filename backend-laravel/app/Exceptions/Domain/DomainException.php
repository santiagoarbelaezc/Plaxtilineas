<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

use RuntimeException;

/**
 * DomainException — Base abstracta para todas las excepciones de negocio.
 *
 * Cada excepción de dominio define:
 *   - httpStatus(): código HTTP a devolver
 *   - errorCode(): clave de error para el cliente (ej: PEDIDO_NO_ENCONTRADO)
 *   - context(): datos adicionales de contexto para logging
 */
abstract class DomainException extends RuntimeException
{
    /** @var array<string, mixed> */
    protected array $context = [];

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message = '', array $context = [], ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->context = $context;
    }

    /**
     * Código HTTP a devolver al cliente.
     */
    abstract public function httpStatus(): int;

    /**
     * Código de error legible (para frontend / logging).
     */
    abstract public function errorCode(): string;

    /**
     * Contexto adicional para logging (nunca datos sensibles).
     *
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return $this->context;
    }
}
