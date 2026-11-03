<?php

declare(strict_types=1);

namespace App\Enums;

enum EstadoPedido: string
{
    case DRAFT = 'draft';
    case PENDIENTE_PAGO = 'pendiente_pago';
    case PAGADO = 'pagado';
    case PENDIENTE = 'pendiente';
    case CONFIRMADO = 'confirmado';
    case EN_PREPARACION = 'en_preparacion';
    case EN_CAMINO = 'en_camino';
    case ENTREGADO = 'entregado';
    case CANCELADO = 'cancelado';

    /**
     * Valida si la transición al nuevo estado es permitida según las reglas de negocio.
     */
    public function puedePasarA(self $nuevo): bool
    {
        if ($this === $nuevo) {
            return true;
        }

        return match ($this) {
            self::DRAFT => in_array($nuevo, [self::PENDIENTE_PAGO, self::CANCELADO], true),
            self::PENDIENTE_PAGO => in_array($nuevo, [self::PAGADO, self::CANCELADO], true),
            self::PAGADO => in_array($nuevo, [self::CONFIRMADO, self::EN_PREPARACION, self::CANCELADO], true),
            self::PENDIENTE => in_array($nuevo, [self::CONFIRMADO, self::CANCELADO], true),
            self::CONFIRMADO => in_array($nuevo, [self::EN_PREPARACION, self::CANCELADO], true),
            self::EN_PREPARACION => in_array($nuevo, [self::EN_CAMINO, self::CANCELADO], true),
            self::EN_CAMINO => in_array($nuevo, [self::ENTREGADO, self::CANCELADO], true),
            self::ENTREGADO, self::CANCELADO => false, // Estados terminales
        };
    }
}
