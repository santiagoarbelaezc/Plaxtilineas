<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $producto_id
 * @property string $session_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class EstadisticaProducto extends Model
{
    protected $table = 'estadisticas_productos';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'producto_id',
        'session_id',
    ];

    /**
     * @return BelongsTo<Producto, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
