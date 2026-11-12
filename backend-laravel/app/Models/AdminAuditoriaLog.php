<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $sesion_id
 * @property int $admin_id
 * @property string $modulo
 * @property string $accion
 * @property string $descripcion
 * @property string|null $entidad_tipo
 * @property string|null $entidad_id
 * @property array<string, mixed>|null $datos_anteriores
 * @property array<string, mixed>|null $datos_nuevos
 * @property string|null $ip_address
 * @property Carbon|null $created_at
 * @property-read Usuario|null $admin
 * @property-read AdminSesion|null $sesion
 */
class AdminAuditoriaLog extends Model
{
    protected $table = 'admin_auditoria_logs';

    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sesion_id',
        'admin_id',
        'modulo',
        'accion',
        'descripcion',
        'entidad_tipo',
        'entidad_id',
        'datos_anteriores',
        'datos_nuevos',
        'ip_address',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sesion_id' => 'integer',
            'admin_id' => 'integer',
            'datos_anteriores' => 'array',
            'datos_nuevos' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Usuario, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'admin_id');
    }

    /**
     * @return BelongsTo<AdminSesion, $this>
     */
    public function sesion(): BelongsTo
    {
        return $this->belongsTo(AdminSesion::class, 'sesion_id');
    }
}

