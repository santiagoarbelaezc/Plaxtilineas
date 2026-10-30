<?php

declare(strict_types=1);

use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

test('login exitoso retorna token sanctum y payload del usuario', function () {
    $usuario = Usuario::factory()->create([
        'correo' => 'juan@test.com',
        'password' => Hash::make('MiPasswordSeguro123'),
        'email_verificado' => true,
    ]);

    $response = $this->postJson('/api/auth/login', [
        'correo' => 'juan@test.com',
        'password' => 'MiPasswordSeguro123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'mensaje',
            'token',
            'requiere_cambio_password',
            'usuario' => ['id', 'correo', 'nombre', 'telefono', 'rol', 'requiere_cambio_password'],
        ])
        ->assertJson([
            'mensaje' => 'Login exitoso',
            'usuario' => [
                'id' => $usuario->id,
                'correo' => 'juan@test.com',
            ],
        ]);
});

test('login con correo no registrado retorna 401', function () {
    $response = $this->postJson('/api/auth/login', [
        'correo' => 'noexiste@test.com',
        'password' => 'cualquiera',
    ]);

    $response->assertStatus(401)
        ->assertJson(['error' => 'Usuario no encontrado']);
});

test('login con contrasena incorrecta retorna 401', function () {
    Usuario::factory()->create([
        'correo' => 'juan@test.com',
        'password' => Hash::make('ClaveCorrecta'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'correo' => 'juan@test.com',
        'password' => 'ClaveEquivocada',
    ]);

    $response->assertStatus(401)
        ->assertJson(['error' => 'Contraseña incorrecta']);
});

test('login de usuario con email no verificado retorna 403', function () {
    Usuario::factory()->noVerificado()->create([
        'correo' => 'noverificado@test.com',
        'password' => Hash::make('Clave123'),
        'google_id' => null,
    ]);

    $response = $this->postJson('/api/auth/login', [
        'correo' => 'noverificado@test.com',
        'password' => 'Clave123',
    ]);

    $response->assertStatus(403)
        ->assertJsonStructure(['error']);
});
