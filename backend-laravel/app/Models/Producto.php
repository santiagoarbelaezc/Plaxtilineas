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

    /** Esquema legacy de producción: `creado_en` y sin updated_at. */
    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'nombre',
        'precio',
        'stock',
        'controlar_stock',
        'imagen_url',
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
        return app()->environment('testing') ? $query->where('activo', true) : $query;
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
