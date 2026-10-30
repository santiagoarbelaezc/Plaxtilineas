<?php

declare(strict_types=1);

namespace App\Contracts;

interface GoogleAuthClientInterface
{
    /**
     * @return array{email: string, name: string, sub: string}
     */
    public function verifyCredential(string $credential): array;
}
