<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EstadoPedido;
use Database\Factories\PedidoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $usuario_id
 * @property string $codigo_pedido
 * @property string|null $nombre_cliente
 * @property string|null $email_cliente
 * @property string|null $telefono_cliente
 * @property string $direccion_envio
 * @property string|null $ciudad_envio
 * @property string|null $departamento
 * @property string|null $notas
 * @property string $subtotal
 * @property string $iva
 * @property string $costo_envio
 * @property string $total
 * @property string $metodo_pago
 * @property string|null $wompi_referencia
 * @property string|null $wompi_link_id
 * @property string|null $wompi_transaction_id
 * @property string|null $wompi_evento_id
 * @property int|null $wompi_monto_centavos
 * @property Carbon|null $wompi_pagado_at
 * @property string|null $guia_numero
 * @property string|null $transportadora
 * @property Carbon|null $fecha_envio
 * @property EstadoPedido $estado
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Pedido extends Model
{
    /** @use HasFactory<PedidoFactory> */
    use HasFactory;

    protected $table = 'pedidos';

    /** Esquema legacy de producción. */
    public const CREATED_AT = 'fecha';

    public const UPDATED_AT = 'fecha_actualizacion';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'usuario_id',
        'codigo_pedido',
        'direccion_envio',
        'ciudad',
        'telefono_contacto',
        'departamento',
        'notas',
        'subtotal',
        'iva',
        'costo_envio',
        'total',
        'metodo_pago',
        'wompi_referencia',
        'wompi_link_id',
        'wompi_transaction_id',
        'wompi_evento_id',
        'wompi_monto_centavos',
        'wompi_pagado_at',
        'guia_numero',
        'transportadora',
        'fecha_envio',
        'estado',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha' => 'datetime',
            'fecha_actualizacion' => 'datetime',
            'subtotal' => 'decimal:2',
            'iva' => 'decimal:2',
            'costo_envio' => 'decimal:2',
            'total' => 'decimal:2',
            'wompi_monto_centavos' => 'integer',
            'wompi_pagado_at' => 'datetime',
            'fecha_envio' => 'datetime',
            'estado' => EstadoPedido::class,
        ];
    }

    public function getCreatedAtAttribute(): ?Carbon
    {
        $val = $this->attributes['fecha'] ?? null;
        return $val ? Carbon::parse($val) : null;
    }

    public function getUpdatedAtAttribute(): ?Carbon
    {
        $val = $this->attributes['fecha_actualizacion'] ?? null;
        return $val ? Carbon::parse($val) : null;
    }

    /**
     * Columnas inexistentes en producción: los datos del cliente se toman
     * de la relación `usuario` (los consumidores ya usan `?: usuario->...`).
     */
    protected function getNombreClienteAttribute(): ?string
    {
        return null;
    }

    protected function getEmailClienteAttribute(): ?string
    {
        return null;
    }

    protected function getTelefonoClienteAttribute(): ?string
    {
        return $this->attributes['telefono_contacto'] ?? null;
    }

    protected function getCiudadEnvioAttribute(): ?string
    {
        return $this->attributes['ciudad'] ?? null;
    }

    /**
     * @return BelongsTo<Usuario, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    /**
     * @return HasMany<PedidoItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PedidoItem::class, 'pedido_id');
    }

    /**
     * @return HasMany<StockReserva, $this>
     */
    public function reservas(): HasMany
    {
        return $this->hasMany(StockReserva::class, 'pedido_id');
    }

    /**
     * @param  Builder<Pedido>  $query
     * @return Builder<Pedido>
     */
    public function scopePorEstado(Builder $query, EstadoPedido $estado): Builder
    {
        return $query->where('estado', $estado);
    }
}
