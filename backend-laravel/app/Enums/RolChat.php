<?php

declare(strict_types=1);

namespace App\Enums;

enum RolChat: string
{
    case USER = 'user';
    case ASSISTANT = 'assistant';
}
