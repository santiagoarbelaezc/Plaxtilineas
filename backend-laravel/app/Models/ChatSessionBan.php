<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $session_id
 * @property string $ip
 * @property string $razon
 * @property Carbon $banned_until
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ChatSessionBan extends Model
{
    protected $table = 'chat_session_bans';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'session_id',
        'ip',
        'razon',
        'banned_until',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'banned_until' => 'datetime',
        ];
    }

    public function estaBaneada(): bool
    {
        return $this->banned_until->isFuture();
    }
}
