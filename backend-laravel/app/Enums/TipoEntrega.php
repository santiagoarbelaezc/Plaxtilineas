<?php

declare(strict_types=1);

namespace App\Enums;

enum TipoEntrega: string
{
    case DOMICILIO = 'domicilio';
    case RECOGIDA_TIENDA = 'recogida_tienda';

    public function label(): string
    {
        return match ($this) {
            self::DOMICILIO => 'Envío a domicilio',
            self::RECOGIDA_TIENDA => 'Recoger en tienda',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
