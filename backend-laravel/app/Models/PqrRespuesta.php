<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $pqr_id
 * @property string $mensaje
 * @property string $tipo
 * @property Carbon|null $fecha_creacion
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PqrRespuesta extends Model
{
    use HasUuids;

    protected $table = 'pqr_respuestas';

    /** Esquema legacy de producción: solo `fecha_creacion`. */
    public const CREATED_AT = 'fecha_creacion';

    public const UPDATED_AT = null;

    protected function getCreatedAtAttribute(): ?Carbon
    {
        return $this->fecha_creacion;
    }

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'pqr_id',
        'mensaje',
        'tipo',
    ];

    /**
     * @return BelongsTo<Pqr, $this>
     */
    public function pqr(): BelongsTo
    {
        return $this->belongsTo(Pqr::class, 'pqr_id');
    }
}
