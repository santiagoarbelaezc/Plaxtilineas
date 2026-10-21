<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RolUsuario;
use Database\Factories\UsuarioFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $nombre
 * @property string|null $apellidos
 * @property int|null $edad
 * @property string|null $direccion
 * @property string|null $ciudad
 * @property string|null $telefono
 * @property string $correo
 * @property string $password
 * @property string $rol
 * @property string|null $google_id
 * @property bool $email_verificado
 * @property string|null $token_verificacion
 * @property Carbon|null $token_expira_en
 * @property bool $requiere_cambio_password
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Usuario extends Authenticatable
{
    /** @use HasFactory<UsuarioFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';

    /**
     * Esquema legacy de producción: solo existe `fecha_creacion` (sin updated_at).
     */
    public const CREATED_AT = 'fecha_creacion';

    public const UPDATED_AT = null;

    /** Valor real del enum `usuarios.rol` para clientes en producción. */
    public const ROL_CLIENTE_DB = 'usuario';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'nombre',
        'apellidos',
        'edad',
        'direccion',
        'ciudad',
        'telefono',
        'correo',
        'password',
        'rol',
        'google_id',
        'email_verificado',
        'token_verificacion',
        'token_expira_en',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'token_verificacion',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'edad' => 'integer',
            'email_verificado' => 'boolean',
            'token_expira_en' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * El enum de producción solo admite 'admin' | 'usuario'. El código
     * Laravel usa 'cliente', que se traduce al escribir.
     */
    protected function setRolAttribute(?string $value): void
    {
        $this->attributes['rol'] = $value === RolUsuario::CLIENTE->value || $value === null || $value === ''
            ? self::ROL_CLIENTE_DB
            : $value;
    }

    /**
     * La columna no existe en producción (el esquema legacy no soporta
     * contraseñas temporales persistentes). Se expone siempre como false.
     */
    protected function getRequiereCambioPasswordAttribute(): bool
    {
        return false;
    }

    /**
     * @return HasMany<Pedido, $this>
     */
    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class, 'usuario_id');
    }

    /**
     * @return HasMany<Carrito, $this>
     */
    public function carritos(): HasMany
    {
        return $this->hasMany(Carrito::class, 'usuario_id');
    }

    /**
     * @param  Builder<Usuario>  $query
     * @return Builder<Usuario>
     */
    public function scopeAdmin(Builder $query): Builder
    {
        return $query->where('rol', RolUsuario::ADMIN->value);
    }

    /**
     * @param  Builder<Usuario>  $query
     * @return Builder<Usuario>
     */
    public function scopeCliente(Builder $query): Builder
    {
        return $query->where('rol', '!=', RolUsuario::ADMIN->value);
    }

    public function isAdmin(): bool
    {
        return $this->rol === RolUsuario::ADMIN->value;
    }

    public function tienePasswordTemporal(): bool
    {
        return false;
    }

    public function emailVerificado(): bool
    {
        return $this->email_verificado;
    }
}
