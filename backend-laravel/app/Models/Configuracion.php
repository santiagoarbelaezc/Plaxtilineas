<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $clave
 * @property string $valor
 * @property string|null $descripcion
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Configuracion extends Model
{
    protected $table = 'configuraciones';

    /** La PK de producción es la columna `clave` (varchar). */
    protected $primaryKey = 'clave';

    protected $keyType = 'string';

    public $incrementing = false;

    /** Esquema de producción: solo `updated_at`. */
    public const CREATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'clave',
        'valor',
    ];

    public static function getVal(string $clave, ?string $default = null): ?string
    {
        $config = static::query()->where('clave', $clave)->first();

        return $config ? $config->valor : $default;
    }
}
