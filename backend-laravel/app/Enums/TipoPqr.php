<?php

declare(strict_types=1);

namespace App\Enums;

enum TipoPqr: string
{
    case PETICION = 'PETICION';
    case QUEJA = 'QUEJA';
    case RECLAMO = 'RECLAMO';
    case SUGERENCIA = 'SUGERENCIA';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
