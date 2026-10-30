<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CarritoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $usuario_id
 * @property int $producto_id
 * @property int|null $variante_id
 * @property int $cantidad
 * @property string $precio_unitario
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Carrito extends Model
{
    /** @use HasFactory<CarritoFactory> */
    use HasFactory;

    protected $table = 'carritos';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'usuario_id',
        'producto_id',
        'variante_id',
        'cantidad',
        'precio_unitario',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'precio_unitario' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Usuario, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
