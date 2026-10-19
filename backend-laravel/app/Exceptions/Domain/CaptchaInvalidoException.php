<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class CaptchaInvalidoException extends DomainException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message = 'El código captcha ha expirado o es incorrecto. Intenta nuevamente.', array $context = [])
    {
        parent::__construct($message, $context);
    }

    public function httpStatus(): int
    {
        return 400;
    }

    public function errorCode(): string
    {
        return 'CAPTCHA_INVALIDO';
    }
}
