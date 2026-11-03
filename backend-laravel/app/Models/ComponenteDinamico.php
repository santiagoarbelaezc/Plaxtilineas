<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $tipo
 * @property int $orden
 * @property bool $activo
 * @property array<string, mixed> $contenido
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ComponenteDinamico extends Model
{
    protected $table = 'componentes_dinamicos';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tipo',
        'orden',
        'activo',
        'contenido',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'orden' => 'integer',
            'activo' => 'boolean',
            'contenido' => 'array',
        ];
    }

    /**
     * @param  Builder<ComponenteDinamico>  $query
     * @return Builder<ComponenteDinamico>
     */
    public function scopeActivo(Builder $query): Builder
    {
        return $query->where('activo', true)->orderBy('orden', 'asc');
    }
}
