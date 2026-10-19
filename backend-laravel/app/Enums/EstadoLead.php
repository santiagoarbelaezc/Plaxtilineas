<?php

declare(strict_types=1);

namespace App\Enums;

enum EstadoLead: string
{
    case NUEVO = 'nuevo';
    case CONTACTADO = 'contactado';
    case CONVERTIDO = 'convertido';
    case DESCARTADO = 'descartado';
}
