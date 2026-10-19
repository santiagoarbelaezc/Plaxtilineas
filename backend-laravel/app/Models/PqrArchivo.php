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
 * @property string $nombre_archivo
 * @property string $url_archivo
 * @property string $tipo_archivo
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PqrArchivo extends Model
{
    use HasUuids;

    protected $table = 'pqr_archivos';

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'pqr_id',
        'nombre_archivo',
        'url_archivo',
        'tipo_archivo',
    ];

    /**
     * @return BelongsTo<Pqr, $this>
     */
    public function pqr(): BelongsTo
    {
        return $this->belongsTo(Pqr::class, 'pqr_id');
    }
}
