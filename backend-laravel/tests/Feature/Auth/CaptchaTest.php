<?php

declare(strict_types=1);

use App\Models\Captcha;

test('genera captcha svg y almacena registro en base de datos', function () {
    $response = $this->getJson('/api/auth/captcha');

    $response->assertStatus(200)
        ->assertJsonStructure(['id', 'svg']);

    $id = $response->json('id');
    $svg = $response->json('svg');

    expect($id)->toBeString()->not->toBeEmpty()
        ->and($svg)->toContain('<svg', '</svg>', '<defs>', 'linearGradient');

    $captcha = Captcha::query()->find($id);
    expect($captcha)->not->toBeNull()
        ->and($captcha->expires_at->isFuture())->toBeTrue();
});
