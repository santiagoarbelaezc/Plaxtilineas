<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $wompi_event_id
 * @property string $event_type
 * @property string|null $transaction_status
 * @property string|null $reference
 * @property string|null $wompi_transaction_id
 * @property array<string, mixed> $payload
 * @property string $result
 * @property Carbon $processed_at
 */
class WompiWebhookEvent extends Model
{
    public $timestamps = false;

    protected $table = 'wompi_webhook_events';

    /** @var list<string> */
    protected $fillable = [
        'wompi_event_id',
        'event_type',
        'transaction_status',
        'reference',
        'wompi_transaction_id',
        'payload',
        'result',
        'processed_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    /**
     * Verifica si un evento ya fue procesado previamente (idempotencia).
     */
    public static function alreadyProcessed(string $wompiEventId): bool
    {
        return static::where('wompi_event_id', $wompiEventId)->exists();
    }
}
