<?php

declare(strict_types=1);

use App\Contracts\MediaStorageInterface;
use App\Models\ComponenteDinamico;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;

test('un usuario anonimo puede consultar los componentes dinamicos ordenados', function () {
    ComponenteDinamico::create([
        'tipo' => 'banner_secundario',
        'orden' => 2,
        'activo' => true,
        'contenido' => ['titulo' => 'Segundo Banner'],
    ]);

    ComponenteDinamico::create([
        'tipo' => 'banner_principal',
        'orden' => 1,
        'activo' => true,
        'contenido' => ['titulo' => 'Primer Banner'],
    ]);

    $response = $this->getJson('/api/componentes');

    $response->assertStatus(200);
    $data = $response->json();
    expect($data)->toHaveCount(2)
        ->and($data[0]['tipo'])->toBe('banner_principal')
        ->and($data[1]['tipo'])->toBe('banner_secundario');
});

test('solo administradores pueden crear componentes dinamicos', function () {
    $payload = [
        'tipo' => 'testimonios',
        'contenido' => ['items' => ['Excelente servicio']],
    ];

    // Anonimo -> 401
    $this->postJson('/api/componentes', $payload)->assertStatus(401);

    // Cliente -> 403
    $cliente = Usuario::factory()->cliente()->create();
    $this->actingAs($cliente)->postJson('/api/componentes', $payload)->assertStatus(403);

    // Admin -> 201
    $admin = Usuario::factory()->admin()->create();
    $response = $this->actingAs($admin)->postJson('/api/componentes', $payload);

    $response->assertStatus(201)
        ->assertJson([
            'tipo' => 'testimonios',
            'activo' => 1,
        ])
        ->assertJsonStructure(['id', 'tipo', 'orden', 'activo', 'contenido']);

    $this->assertDatabaseHas('componentes_dinamicos', [
        'tipo' => 'testimonios',
    ]);
});

test('falla la creacion de componente si falta tipo o contenido con 400', function () {
    $admin = Usuario::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/componentes', [
        'tipo' => '',
    ]);

    $response->assertStatus(400)
        ->assertJsonStructure(['error']);
});

test('admin puede actualizar un componente existente', function () {
    $admin = Usuario::factory()->admin()->create();

    $comp = ComponenteDinamico::create([
        'tipo' => 'contacto',
        'orden' => 1,
        'activo' => true,
        'contenido' => ['telefono' => '3001112233'],
    ]);

    $response = $this->actingAs($admin)->putJson("/api/componentes/{$comp->id}", [
        'contenido' => ['telefono' => '3009998877'],
        'activo' => false,
    ]);

    $response->assertStatus(200)
        ->assertJson(['actualizado' => true]);

    $comp->refresh();
    expect($comp->activo)->toBeFalse()
        ->and($comp->contenido['telefono'])->toBe('3009998877');
});

test('actualizar componente inexistente retorna 404', function () {
    $admin = Usuario::factory()->admin()->create();

    $response = $this->actingAs($admin)->putJson('/api/componentes/99999', [
        'tipo' => 'nuevo',
    ]);

    $response->assertStatus(404)
        ->assertJson(['error' => 'Componente no encontrado']);
});

test('admin puede reordenar componentes en lote', function () {
    $admin = Usuario::factory()->admin()->create();

    $c1 = ComponenteDinamico::create([
        'tipo' => 'c1',
        'orden' => 1,
        'activo' => true,
        'contenido' => [],
    ]);
    $c2 = ComponenteDinamico::create([
        'tipo' => 'c2',
        'orden' => 2,
        'activo' => true,
        'contenido' => [],
    ]);

    $response = $this->actingAs($admin)->putJson('/api/componentes/reordenar', [
        'orden_ids' => [$c2->id, $c1->id],
    ]);

    $response->assertStatus(200)
        ->assertJson(['reordenado' => true]);

    expect($c2->fresh()->orden)->toBe(1)
        ->and($c1->fresh()->orden)->toBe(2);
});

test('admin puede eliminar un componente', function () {
    $admin = Usuario::factory()->admin()->create();

    $c = ComponenteDinamico::create([
        'tipo' => 'borrar',
        'orden' => 1,
        'activo' => true,
        'contenido' => [],
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/componentes/{$c->id}");

    $response->assertStatus(200)
        ->assertJson(['eliminado' => true]);

    $this->assertDatabaseMissing('componentes_dinamicos', ['id' => $c->id]);
});

test('admin puede subir imagenes de componentes', function () {
    $admin = Usuario::factory()->admin()->create();

    $mockStorage = Mockery::mock(MediaStorageInterface::class);
    $mockStorage->shouldReceive('upload')
        ->once()
        ->andReturn([
            'url' => 'https://res.cloudinary.com/test/componente.png',
            'public_id' => 'componentes/banner_123',
        ]);
    $this->app->instance(MediaStorageInterface::class, $mockStorage);

    $file = UploadedFile::fake()->create('banner.png', 10, 'image/png');

    $response = $this->actingAs($admin)->post('/api/componentes/upload', [
        'imagen' => $file,
    ], ['Accept' => 'application/json']);

    $response->assertStatus(200)
        ->assertJson([
            'url' => 'https://res.cloudinary.com/test/componente.png',
            'public_id' => 'componentes/banner_123',
        ]);
});
