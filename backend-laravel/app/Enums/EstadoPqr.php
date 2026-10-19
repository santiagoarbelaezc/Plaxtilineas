<?php

declare(strict_types=1);

namespace App\Enums;

enum EstadoPqr: string
{
    case PENDIENTE = 'PENDIENTE';
    case EN_PROCESO = 'EN_PROCESO';
    case RESUELTO = 'RESUELTO';
    case CERRADO = 'CERRADO';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
