<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class CheckoutInvalidoException extends DomainException
{
    public function __construct(string $message, int $httpStatus = 409)
    {
        parent::__construct($message, ['http_status' => $httpStatus]);
    }

    public function httpStatus(): int
    {
        return (int) ($this->context['http_status'] ?? 409);
    }

    public function errorCode(): string
    {
        return 'CHECKOUT_INVALIDO';
    }
}
