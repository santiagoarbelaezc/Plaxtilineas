<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $session_id
 * @property string $ip
 * @property string $mensaje
 * @property string $razon
 * @property int $nivel
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ChatModerationLog extends Model
{
    protected $table = 'chat_moderation_log';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'session_id',
        'ip',
        'mensaje',
        'razon',
        'nivel',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'nivel' => 'integer',
        ];
    }
}
