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
        'tipo_documento' => 'CC',
        'numero_documento' => '1094912345',
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
            'usuario' => ['id', 'correo', 'nombre', 'tipo_documento', 'numero_documento', 'telefono', 'rol'],
            'pendiente_verificacion',
        ])
        ->assertJson([
            'pendiente_verificacion' => true,
            'usuario' => [
                'correo' => 'carlos@test.com',
                'nombre' => 'Carlos',
                'tipo_documento' => 'CC',
                'numero_documento' => '1094912345',
            ],
        ]);

    // Verificar en BD
    $usuario = Usuario::query()->where('correo', 'carlos@test.com')->first();
    expect($usuario)->not->toBeNull()
        ->and($usuario->tipo_documento)->toBe('CC')
        ->and($usuario->numero_documento)->toBe('1094912345')
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
        'tipo_documento' => 'CC',
        'numero_documento' => '1094912345',
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
        'tipo_documento' => 'NIT',
        'numero_documento' => '900123456-7',
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

test('registro de cliente acepta NIT con digito de verificacion y rechaza sin documento', function () {
    Mail::fake();

    // 1. Sin documento retorna 422
    $this->postJson('/api/auth/register', [
        'nombre' => 'Empresa',
        'apellidos' => 'SAS',
        'edad' => 30,
        'direccion' => 'Cra 14 # 20-10',
        'ciudad' => 'Armenia',
        'telefono' => '3101234567',
        'correo' => 'empresa@test.com',
        'password' => 'PasswordSeguro123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['tipo_documento', 'numero_documento']);

    // 2. Con NIT válido crea el usuario correctamente
    $captchaId = 'test-captcha-nit';
    Captcha::query()->create([
        'id' => $captchaId,
        'codigo' => Hash::make('abcde'),
        'expires_at' => now()->addMinutes(5),
    ]);

    $this->postJson('/api/auth/register', [
        'nombre' => 'Empresa',
        'apellidos' => 'Plaxti SAS',
        'tipo_documento' => 'NIT',
        'numero_documento' => '900123456-7',
        'edad' => 30,
        'direccion' => 'Cra 14 # 20-10',
        'ciudad' => 'Armenia',
        'telefono' => '3101234567',
        'correo' => 'empresa@test.com',
        'password' => 'PasswordSeguro123',
        'captchaId' => $captchaId,
        'captchaCode' => 'abcde',
    ])->assertStatus(201)
        ->assertJsonPath('usuario.tipo_documento', 'NIT')
        ->assertJsonPath('usuario.numero_documento', '900123456-7');
});

test('verificar correo inicia sesion automaticamente', function () {
    $usuario = Usuario::factory()->create([
        'correo' => 'verificar@test.com',
        'email_verificado' => false,
        'token_verificacion' => '772233',
        'token_expira_en' => now()->addHour(),
    ]);

    $response = $this->getJson('/api/auth/verificar-email?token=772233&correo=verificar%40test.com');

    $response->assertOk()
        ->assertJsonStructure([
            'mensaje',
            'token',
            'usuario' => ['id', 'correo', 'nombre', 'telefono', 'rol'],
        ]);

    expect($response->json('token'))->not->toBeEmpty()
        ->and($usuario->fresh()->email_verificado)->toBeTrue()
        ->and($usuario->fresh()->token_verificacion)->toBeNull();
});

test('registro rechaza tipo_documento invalido y numero_documento con formato incorrecto', function () {
    $this->postJson('/api/auth/register', [
        'nombre' => 'Laura',
        'apellidos' => 'Gomez',
        'tipo_documento' => 'PASAPORTE',
        'numero_documento' => 'ABC-123',
        'edad' => 25,
        'direccion' => 'Calle 20 # 10-15',
        'ciudad' => 'Armenia',
        'telefono' => '3105551234',
        'correo' => 'laura@test.com',
        'password' => 'PasswordSeguro123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['tipo_documento', 'numero_documento']);

    $this->postJson('/api/auth/register', [
        'nombre' => 'Laura',
        'apellidos' => 'Gomez',
        'tipo_documento' => 'CC',
        'numero_documento' => '123',
        'edad' => 25,
        'direccion' => 'Calle 20 # 10-15',
        'ciudad' => 'Armenia',
        'telefono' => '3105551234',
        'correo' => 'laura2@test.com',
        'password' => 'PasswordSeguro123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['numero_documento']);
});

test('registro rechaza campos obligatorios faltantes de cliente', function () {
    $this->postJson('/api/auth/register', [
        'correo' => 'incompleto@test.com',
        'password' => 'PasswordSeguro123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors([
            'nombre',
            'apellidos',
            'tipo_documento',
            'numero_documento',
            'edad',
            'direccion',
            'ciudad',
            'telefono',
        ]);
});

test('usuario registrado con CC puede verificar correo e iniciar sesion recibiendo su identificacion', function () {
    Mail::fake();

    $captchaId = 'test-captcha-flow';
    Captcha::query()->create([
        'id' => $captchaId,
        'codigo' => Hash::make('abcde'),
        'expires_at' => now()->addMinutes(5),
    ]);

    $this->postJson('/api/auth/register', [
        'nombre' => 'Camila',
        'apellidos' => 'Osorio',
        'tipo_documento' => 'CC',
        'numero_documento' => '1094999888',
        'edad' => 27,
        'direccion' => 'Cra 19 # 19-35',
        'ciudad' => 'Armenia, Quindío',
        'telefono' => '3157778899',
        'correo' => 'camila@test.com',
        'password' => 'PasswordSeguro123',
        'rol' => 'cliente',
        'captchaId' => $captchaId,
        'captchaCode' => 'abcde',
    ])->assertStatus(201);

    $usuario = Usuario::query()->where('correo', 'camila@test.com')->firstOrFail();

    $this->getJson('/api/auth/verificar-email?correo=camila%40test.com&token='.urlencode((string) $usuario->token_verificacion))
        ->assertOk()
        ->assertJsonPath('usuario.tipo_documento', 'CC')
        ->assertJsonPath('usuario.numero_documento', '1094999888');

    $this->postJson('/api/auth/login', [
        'correo' => 'camila@test.com',
        'password' => 'PasswordSeguro123',
    ])->assertOk()
        ->assertJsonPath('usuario.tipo_documento', 'CC')
        ->assertJsonPath('usuario.numero_documento', '1094999888');
});
