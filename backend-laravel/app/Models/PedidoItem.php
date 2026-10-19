<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $pedido_id
 * @property int $producto_id
 * @property int|null $variante_id
 * @property string $nombre_producto
 * @property int $cantidad
 * @property string $precio_unitario
 * @property string $subtotal
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PedidoItem extends Model
{
    protected $table = 'pedido_items';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pedido_id',
        'producto_id',
        'variante_id',
        'nombre_producto',
        'cantidad',
        'precio_unitario',
        'subtotal',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'precio_unitario' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Pedido, $this>
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }

    /**
     * @return BelongsTo<Producto, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
