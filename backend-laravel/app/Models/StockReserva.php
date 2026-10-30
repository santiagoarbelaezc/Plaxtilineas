<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $pedido_id
 * @property int $producto_id
 * @property int|null $variante_id
 * @property int $cantidad
 * @property Carbon $creado_at
 * @property Carbon $expira_at
 */
class StockReserva extends Model
{
    protected $table = 'stock_reservas';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pedido_id',
        'producto_id',
        'variante_id',
        'cantidad',
        'creado_at',
        'expira_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'creado_at' => 'datetime',
            'expira_at' => 'datetime',
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
     * @param  Builder<StockReserva>  $query
     * @return Builder<StockReserva>
     */
    public function scopeExpiradas(Builder $query): Builder
    {
        return $query->where('expira_at', '<=', now());
    }

    /**
     * @param  Builder<StockReserva>  $query
     * @return Builder<StockReserva>
     */
    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('expira_at', '>', now());
    }
}
