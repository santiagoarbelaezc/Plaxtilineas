<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EstadoPqr;
use App\Enums\TipoPqr;
use Database\Factories\PqrFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property TipoPqr $tipo
 * @property string $nombre_completo
 * @property string $email
 * @property string $telefono
 * @property string|null $producto_relacionado
 * @property string $descripcion
 * @property EstadoPqr $estado
 * @property string $numero_ticket
 * @property Carbon|null $fecha_creacion
 * @property Carbon|null $fecha_actualizacion
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Pqr extends Model
{
    /** @use HasFactory<PqrFactory> */
    use HasFactory, HasUuids;

    protected $table = 'pqrs';

    /** Esquema legacy de producción. */
    public const CREATED_AT = 'fecha_creacion';

    public const UPDATED_AT = 'fecha_actualizacion';

    protected function getCreatedAtAttribute(): ?Carbon
    {
        return $this->fecha_creacion;
    }

    protected function getUpdatedAtAttribute(): ?Carbon
    {
        return $this->fecha_actualizacion;
    }

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'tipo',
        'nombre_completo',
        'email',
        'telefono',
        'producto_relacionado',
        'descripcion',
        'estado',
        'numero_ticket',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tipo' => TipoPqr::class,
            'estado' => EstadoPqr::class,
        ];
    }

    /**
     * @return HasMany<PqrArchivo, $this>
     */
    public function archivos(): HasMany
    {
        return $this->hasMany(PqrArchivo::class, 'pqr_id');
    }

    /**
     * @return HasMany<PqrRespuesta, $this>
     */
    public function respuestas(): HasMany
    {
        return $this->hasMany(PqrRespuesta::class, 'pqr_id');
    }
}
