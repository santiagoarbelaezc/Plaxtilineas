<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ProductoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $nombre
 * @property string $precio
 * @property int $stock
 * @property bool $controlar_stock
 * @property string|null $imagen_url
 * @property bool $activo
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Producto extends Model
{
    /** @use HasFactory<ProductoFactory> */
    use HasFactory;

    protected $table = 'productos';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'nombre',
        'precio',
        'stock',
        'controlar_stock',
        'imagen_url',
        'activo',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'precio' => 'decimal:2',
            'stock' => 'integer',
            'controlar_stock' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function tieneStockSuficiente(int $cantidad): bool
    {
        if (! $this->controlar_stock) {
            return true;
        }

        return $this->stock >= $cantidad;
    }

    /**
     * @param  Builder<Producto>  $query
     * @return Builder<Producto>
     */
    public function scopeActivo(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    /**
     * @param  Builder<Producto>  $query
     * @return Builder<Producto>
     */
    public function scopeConStock(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where('controlar_stock', false)
                ->orWhere('stock', '>', 0);
        });
    }
}
