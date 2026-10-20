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

    /**
     * @var list<string>
     */
    protected $fillable = [
        'ip',
        'ip_address',
        'user_agent',
        'pagina',
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
