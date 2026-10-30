<?php

declare(strict_types=1);

use App\Mail\PasswordTemporalMailable;
use App\Models\Captcha;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

test('recuperar password genera clave temporal y actualiza usuario', function () {
    Mail::fake();

    $usuario = Usuario::factory()->create([
        'correo' => 'recuperar@test.com',
        'requiere_cambio_password' => false,
    ]);

    $captchaId = 'captcha-recuperar-1';
    Captcha::query()->create([
        'id' => $captchaId,
        'codigo' => Hash::make('12345'),
        'expires_at' => now()->addMinutes(5),
    ]);

    $response = $this->postJson('/api/auth/recuperar-password', [
        'correo' => 'recuperar@test.com',
        'captchaId' => $captchaId,
        'captchaCode' => '12345',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Hemos enviado una contraseña temporal a tu correo electrónico. Úsala para ingresar.',
        ]);

    $usuario->refresh();
    expect($usuario->requiere_cambio_password)->toBeTrue();

    Mail::assertSent(PasswordTemporalMailable::class, function ($mail) {
        return $mail->hasTo('recuperar@test.com');
    });
});

test('recuperar password con correo inexistente retorna 404', function () {
    $captchaId = 'captcha-recuperar-404';
    Captcha::query()->create([
        'id' => $captchaId,
        'codigo' => Hash::make('12345'),
        'expires_at' => now()->addMinutes(5),
    ]);

    $response = $this->postJson('/api/auth/recuperar-password', [
        'correo' => 'nadie@test.com',
        'captchaId' => $captchaId,
        'captchaCode' => '12345',
    ]);

    $response->assertStatus(404)
        ->assertJson(['error' => 'No existe ninguna cuenta registrada con este correo electrónico.']);
});

test('cambiar password temporal actualiza clave y desactiva bandera', function () {
    $usuario = Usuario::factory()->conPasswordTemporal()->create();
    Sanctum::actingAs($usuario, ['*']);

    $response = $this->postJson('/api/auth/cambiar-password-temporal', [
        'nueva_password' => 'NuevaDefinitiva123',
    ]);

    $response->assertStatus(200)
        ->assertJson(['mensaje' => 'Tu contraseña ha sido actualizada exitosamente.']);

    $usuario->refresh();
    expect($usuario->requiere_cambio_password)->toBeFalse()
        ->and(Hash::check('NuevaDefinitiva123', $usuario->password))->toBeTrue();
});
