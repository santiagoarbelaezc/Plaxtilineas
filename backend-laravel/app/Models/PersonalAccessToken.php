<?php

declare(strict_types=1);

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Token de acceso de Sanctum para autenticación en la BD de producción.
 */
class PersonalAccessToken extends SanctumPersonalAccessToken {}
