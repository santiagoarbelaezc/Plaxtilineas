<?php

declare(strict_types=1);

use App\Mail\VerificacionEmailMailable;
use App\Models\Captcha;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

test('registro exitoso con captcha crea usuario y envia email de verificacion', function () {
    Mail::fake();

    $captchaId = 'test-captcha-123';
    Captcha::query()->create([
        'id' => $captchaId,
        'codigo' => Hash::make('abcde'),
        'expires_at' => now()->addMinutes(5),
    ]);

    $response = $this->postJson('/api/auth/register', [
        'nombre' => 'Carlos',
        'apellidos' => 'Perez',
        'edad' => 28,
        'direccion' => 'Calle 100 # 20 - 30',
        'ciudad' => 'Medellin',
        'telefono' => '3123456789',
        'correo' => 'carlos@test.com',
        'password' => 'PasswordSeguro123',
        'rol' => 'cliente',
        'captchaId' => $captchaId,
        'captchaCode' => 'abcde',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'mensaje',
            'token',
            'usuario' => ['id', 'correo', 'nombre', 'telefono', 'rol'],
            'pendiente_verificacion',
        ])
        ->assertJson([
            'pendiente_verificacion' => true,
            'usuario' => [
                'correo' => 'carlos@test.com',
                'nombre' => 'Carlos',
            ],
        ]);

    // Verificar en BD
    $usuario = Usuario::query()->where('correo', 'carlos@test.com')->first();
    expect($usuario)->not->toBeNull()
        ->and($usuario->email_verificado)->toBeFalse()
        ->and($usuario->token_verificacion)->not->toBeNull();

    // El captcha debe haber sido consumido (one-time use)
    expect(Captcha::query()->find($captchaId))->toBeNull();

    // Email enviado
    Mail::assertSent(VerificacionEmailMailable::class, function ($mail) {
        return $mail->hasTo('carlos@test.com');
    });
});

test('registro con captcha invalido o expirado retorna 400', function () {
    $response = $this->postJson('/api/auth/register', [
        'nombre' => 'Carlos',
        'apellidos' => 'Perez',
        'edad' => 28,
        'direccion' => 'Calle 100',
        'ciudad' => 'Medellin',
        'telefono' => '3123456789',
        'correo' => 'carlos2@test.com',
        'password' => 'PasswordSeguro123',
        'captchaId' => 'inexistente',
        'captchaCode' => 'xyz',
    ]);

    $response->assertStatus(400)
        ->assertJson(['error' => 'El código captcha ha expirado o es incorrecto. Intenta nuevamente.']);
});

test('registro con correo duplicado retorna 409', function () {
    Usuario::factory()->create(['correo' => 'duplicado@test.com']);

    $captchaId = 'test-captcha-dup';
    Captcha::query()->create([
        'id' => $captchaId,
        'codigo' => Hash::make('abcde'),
        'expires_at' => now()->addMinutes(5),
    ]);

    $response = $this->postJson('/api/auth/register', [
        'nombre' => 'Carlos',
        'apellidos' => 'Perez',
        'edad' => 28,
        'direccion' => 'Calle 100',
        'ciudad' => 'Medellin',
        'telefono' => '3123456789',
        'correo' => 'duplicado@test.com',
        'password' => 'PasswordSeguro123',
        'captchaId' => $captchaId,
        'captchaCode' => 'abcde',
    ]);

    $response->assertStatus(409)
        ->assertJson(['error' => 'El correo electrónico ya está registrado']);
});
