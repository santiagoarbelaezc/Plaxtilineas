<?php

declare(strict_types=1);

use App\Contracts\GoogleAuthClientInterface;
use App\Models\Usuario;

test('login con google crea usuario nuevo si no existe', function () {
    $fakeClient = new class implements GoogleAuthClientInterface
    {
        public function verifyCredential(string $credential): array
        {
            return [
                'email' => 'googleuser@test.com',
                'name' => 'Usuario Google Test',
                'sub' => 'google-sub-123456',
            ];
        }
    };
    app()->instance(GoogleAuthClientInterface::class, $fakeClient);

    $response = $this->postJson('/api/auth/google', [
        'credential' => 'token-fake-google',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['mensaje', 'token', 'usuario'])
        ->assertJson([
            'mensaje' => 'Login con Google exitoso',
            'usuario' => [
                'correo' => 'googleuser@test.com',
                'nombre' => 'Usuario Google Test',
            ],
        ]);

    $usuario = Usuario::query()->where('correo', 'googleuser@test.com')->first();
    expect($usuario)->not->toBeNull()
        ->and($usuario->google_id)->toBe('google-sub-123456')
        ->and($usuario->email_verificado)->toBeTrue();
});

test('login con google asocia google_id a usuario existente si coinciden correos', function () {
    $existente = Usuario::factory()->create([
        'correo' => 'existente@test.com',
        'google_id' => null,
        'email_verificado' => false,
    ]);

    $fakeClient = new class implements GoogleAuthClientInterface
    {
        public function verifyCredential(string $credential): array
        {
            return [
                'email' => 'existente@test.com',
                'name' => 'Existente Actualizado',
                'sub' => 'google-sub-999',
            ];
        }
    };
    app()->instance(GoogleAuthClientInterface::class, $fakeClient);

    $response = $this->postJson('/api/auth/google', [
        'credential' => 'token-fake-google',
    ]);

    $response->assertStatus(200);

    $existente->refresh();
    expect($existente->google_id)->toBe('google-sub-999')
        ->and($existente->email_verificado)->toBeTrue();
});
