<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $producto_id
 * @property array<string, mixed> $payload
 * @property string $estado
 * @property int $total_destinatarios
 * @property int $enviados
 * @property int $fallidos
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class NotificacionProducto extends Model
{
    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_ENVIANDO = 'enviando';

    public const ESTADO_COMPLETADA = 'completada';

    protected $table = 'notificaciones_producto';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'producto_id',
        'payload',
        'estado',
        'total_destinatarios',
        'enviados',
        'fallidos',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'total_destinatarios' => 'integer',
            'enviados' => 'integer',
            'fallidos' => 'integer',
        ];
    }
}
