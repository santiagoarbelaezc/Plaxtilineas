<?php

declare(strict_types=1);

use App\Models\Configuracion;
use App\Models\Usuario;

test('cualquier usuario puede consultar el mapa de configuraciones', function () {
    Configuracion::create([
        'clave' => 'telefono_contacto',
        'valor' => '3006680125',
    ]);
    Configuracion::create([
        'clave' => 'email_contacto',
        'valor' => 'ventas@plaxtilineas.com',
    ]);

    $response = $this->getJson('/api/configuraciones');

    $response->assertStatus(200)
        ->assertJson([
            'telefono_contacto' => '3006680125',
            'email_contacto' => 'ventas@plaxtilineas.com',
        ]);
});

test('solo administradores pueden actualizar configuraciones', function () {
    // Anonimo -> 401
    $this->putJson('/api/configuraciones/costo_envio', ['valor' => '12000'])->assertStatus(401);

    // Cliente -> 403
    $cliente = Usuario::factory()->cliente()->create();
    $this->actingAs($cliente)->putJson('/api/configuraciones/costo_envio', ['valor' => '12000'])->assertStatus(403);

    // Admin -> 200
    $admin = Usuario::factory()->admin()->create();
    $response = $this->actingAs($admin)->putJson('/api/configuraciones/costo_envio', [
        'valor' => '12000',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'mensaje' => 'Configuración actualizada',
            'clave' => 'costo_envio',
            'valor' => '12000',
        ]);

    $this->assertDatabaseHas('configuraciones', [
        'clave' => 'costo_envio',
        'valor' => '12000',
    ]);
});

test('actualizar configuracion requiere el campo valor', function () {
    $admin = Usuario::factory()->admin()->create();

    $response = $this->actingAs($admin)->putJson('/api/configuraciones/costo_envio', []);

    $response->assertStatus(400)
        ->assertJson([
            'error' => "Se requiere el campo 'valor'",
        ]);
});
