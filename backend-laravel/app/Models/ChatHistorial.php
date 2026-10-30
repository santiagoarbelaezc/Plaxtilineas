<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RolChat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $session_id
 * @property RolChat $rol
 * @property string $mensaje
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ChatHistorial extends Model
{
    protected $table = 'chat_historial';

    /** Esquema de producción: solo `created_at`. */
    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'session_id',
        'rol',
        'mensaje',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rol' => RolChat::class,
        ];
    }
}
