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
                'ciudad' => 'Bogota',
            ],
        ]);

    $usuario->refresh();
    expect($usuario->nombre)->toBe('Pedro Modificado')
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
