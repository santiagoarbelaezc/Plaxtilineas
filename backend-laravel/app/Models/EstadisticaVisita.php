<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $ip
 * @property string|null $user_agent
 * @property string $pagina
 * @property Carbon $fecha
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class EstadisticaVisita extends Model
{
    protected $table = 'estadisticas_visitas';

    /** Esquema de producción: solo `created_at`. */
    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'ip_address',
        'user_agent',
        'pagina_url',
        'session_id',
        'fecha',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }
}
