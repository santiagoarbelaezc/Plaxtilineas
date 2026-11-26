<?php

declare(strict_types=1);

use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;

test('perfil devuelve datos del usuario autenticado', function () {
    $usuario = Usuario::factory()->create([
        'nombre' => 'Ana',
        'apellidos' => 'Gomez',
        'correo' => 'ana@test.com',
    ]);
    Sanctum::actingAs($usuario, ['*']);

    $response = $this->getJson('/api/auth/perfil');

    $response->assertStatus(200)
        ->assertJson([
            'id' => $usuario->id,
            'nombre' => 'Ana',
            'apellidos' => 'Gomez',
            'correo' => 'ana@test.com',
        ]);
});

test('actualizar perfil modifica informacion del usuario', function () {
    $usuario = Usuario::factory()->create([
        'nombre' => 'Pedro',
        'apellidos' => 'Ramirez',
        'edad' => 30,
        'direccion' => 'Cra 15 # 45-67',
        'ciudad' => 'Cali',
        'telefono' => '3001112233',
    ]);
    Sanctum::actingAs($usuario, ['*']);

    $response = $this->putJson('/api/auth/actualizar', [
        'nombre' => 'Pedro Modificado',
        'apellidos' => 'Ramirez Perez',
        'tipo_documento' => 'CC',
        'numero_documento' => '1094888777',
        'edad' => 31,
        'direccion' => 'Calle 50 # 10-20',
        'ciudad' => 'Bogota',
        'telefono' => '3009998877',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Perfil actualizado exitosamente',
            'usuario' => [
                'nombre' => 'Pedro Modificado',
                'tipo_documento' => 'CC',
                'numero_documento' => '1094888777',
                'ciudad' => 'Bogota',
            ],
        ]);

    $usuario->refresh();
    expect($usuario->nombre)->toBe('Pedro Modificado')
        ->and($usuario->tipo_documento)->toBe('CC')
        ->and($usuario->numero_documento)->toBe('1094888777')
        ->and($usuario->ciudad)->toBe('Bogota');
});

test('verificar email con token valido confirma correo', function () {
    $usuario = Usuario::factory()->noVerificado()->create([
        'correo' => 'confirmar@test.com',
        'token_verificacion' => '789012',
        'token_expira_en' => now()->addHours(5),
    ]);

    $response = $this->getJson('/api/auth/verificar-email?correo=confirmar@test.com&token=789012');

    $response->assertStatus(200)
        ->assertJson(['mensaje' => 'Correo electrónico verificado exitosamente. Ya puedes iniciar sesión.']);

    $usuario->refresh();
    expect($usuario->email_verificado)->toBeTrue()
        ->and($usuario->token_verificacion)->toBeNull();
});

test('eliminar cuenta propia borra cliente y revoca tokens', function () {
    $usuario = Usuario::factory()->cliente()->create();
    Sanctum::actingAs($usuario, ['*']);

    $response = $this->deleteJson('/api/auth/cuenta');

    $response->assertStatus(200)
        ->assertJson(['mensaje' => 'Cuenta eliminada exitosamente']);

    expect(Usuario::query()->find($usuario->id))->toBeNull();
});

test('intentar eliminar cuenta de admin retorna 403', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $response = $this->deleteJson('/api/auth/cuenta');

    $response->assertStatus(403)
        ->assertJson(['error' => 'No se pueden eliminar cuentas de administrador.']);

    expect(Usuario::query()->find($admin->id))->not->toBeNull();
});

test('actualizar perfil permite cambiar identificacion de CC a NIT con digito de verificacion', function () {
    $usuario = Usuario::factory()->create([
        'nombre' => 'Andres',
        'apellidos' => 'Lopez',
        'tipo_documento' => 'CC',
        'numero_documento' => '1094000111',
        'edad' => 34,
        'direccion' => 'Calle 10 # 5-20',
        'ciudad' => 'Armenia, Quindío',
        'telefono' => '3101112233',
    ]);
    Sanctum::actingAs($usuario, ['*']);

    $this->putJson('/api/auth/actualizar', [
        'nombre' => 'Andres',
        'apellidos' => 'Lopez SAS',
        'tipo_documento' => 'NIT',
        'numero_documento' => '900555444-3',
        'edad' => 35,
        'direccion' => 'Calle 37 N # 20-85',
        'ciudad' => 'Armenia, Quindío',
        'telefono' => '3109998877',
    ])->assertOk()
        ->assertJsonPath('usuario.tipo_documento', 'NIT')
        ->assertJsonPath('usuario.numero_documento', '900555444-3');

    $this->getJson('/api/auth/perfil')
        ->assertOk()
        ->assertJsonPath('tipo_documento', 'NIT')
        ->assertJsonPath('numero_documento', '900555444-3')
        ->assertJsonPath('direccion', 'Calle 37 N # 20-85');
});

test('actualizar perfil rechaza tipo_documento invalido, numero_documento mal formado y telefono invalido', function () {
    $usuario = Usuario::factory()->create([
        'tipo_documento' => 'CC',
        'numero_documento' => '1094123456',
        'telefono' => '3123456789',
    ]);
    Sanctum::actingAs($usuario, ['*']);

    $this->putJson('/api/auth/actualizar', [
        'nombre' => 'Juan',
        'apellidos' => 'Rios',
        'tipo_documento' => 'TI',
        'numero_documento' => '12-AB',
        'edad' => 28,
        'direccion' => 'Calle 1 # 2-3',
        'ciudad' => 'Armenia',
        'telefono' => '123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['tipo_documento', 'numero_documento', 'telefono']);

    $usuario->refresh();
    expect($usuario->tipo_documento)->toBe('CC')
        ->and($usuario->numero_documento)->toBe('1094123456')
        ->and($usuario->telefono)->toBe('3123456789');
});

test('actualizar perfil sin enviar documento conserva la identificacion existente', function () {
    $usuario = Usuario::factory()->create([
        'tipo_documento' => 'CC',
        'numero_documento' => '1094123456',
        'direccion' => 'Direccion Vieja',
        'ciudad' => 'Cali',
    ]);
    Sanctum::actingAs($usuario, ['*']);

    $this->putJson('/api/auth/actualizar', [
        'nombre' => 'Mario',
        'apellidos' => 'Diaz',
        'edad' => 40,
        'direccion' => 'Direccion Nueva 123',
        'ciudad' => 'Pereira, Risaralda',
        'telefono' => '3112223344',
    ])->assertOk()
        ->assertJsonPath('usuario.tipo_documento', 'CC')
        ->assertJsonPath('usuario.numero_documento', '1094123456');

    expect($usuario->fresh()->numero_documento)->toBe('1094123456')
        ->and($usuario->fresh()->direccion)->toBe('Direccion Nueva 123');
});

test('actualizar perfil requiere autenticacion', function () {
    $this->putJson('/api/auth/actualizar', [
        'nombre' => 'Sin Auth',
        'apellidos' => 'Test',
        'edad' => 25,
        'direccion' => 'Calle 1',
        'ciudad' => 'Armenia',
        'telefono' => '3001234567',
    ])->assertStatus(401);
});
