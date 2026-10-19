<?php

declare(strict_types=1);

use App\Models\ChatSessionBan;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('helper estaBaneada retorna true solo si fecha de baneo esta en el futuro', function () {
    $banActivo = ChatSessionBan::query()->create([
        'session_id' => 'sess-123',
        'ip' => '127.0.0.1',
        'razon' => 'spam',
        'banned_until' => now()->addMinutes(15),
    ]);

    $banExpirado = ChatSessionBan::query()->create([
        'session_id' => 'sess-456',
        'ip' => '127.0.0.2',
        'razon' => 'profanity',
        'banned_until' => now()->subMinute(),
    ]);

    expect($banActivo->estaBaneada())->toBeTrue()
        ->and($banExpirado->estaBaneada())->toBeFalse();
});
