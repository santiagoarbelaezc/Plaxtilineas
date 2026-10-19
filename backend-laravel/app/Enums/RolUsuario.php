<?php

declare(strict_types=1);

namespace App\Enums;

enum RolUsuario: string
{
    case CLIENTE = 'cliente';
    case ADMIN = 'admin';

    public function isAdmin(): bool
    {
        return $this === self::ADMIN;
    }
}
