<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;
use App\Models\Carrito;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;

test('usuario cliente no puede acceder a listado admin detalle de usuarios', function () {
    $cliente = Usuario::factory()->cliente()->create();
    Sanctum::actingAs($cliente, ['*']);

    $response = $this->getJson('/api/admin/usuarios-detalle');

    $response->assertStatus(403);
});

test('admin puede obtener detalle de usuarios con compras y carrito', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $cliente = Usuario::factory()->cliente()->create(['nombre' => 'Bernardo']);
    $producto = Producto::factory()->create(['precio' => 15000]);

    Pedido::factory()->pagado()->create([
        'usuario_id' => $cliente->id,
        'total' => 45000,
    ]);

    Carrito::factory()->create([
        'usuario_id' => $cliente->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
        'precio_unitario' => 15000,
    ]);

    $response = $this->getJson('/api/admin/usuarios-detalle');

    $response->assertStatus(200);

    $data = $response->json();
    expect($data)->toBeArray()->not->toBeEmpty();

    $bernardo = collect($data)->firstWhere('correo', $cliente->correo);
    expect($bernardo)->not->toBeNull()
        ->and($bernardo['total_compras'])->toEqual(45000)
        ->and($bernardo['cantidad_pedidos'])->toBe(1)
        ->and($bernardo['carrito'])->toHaveCount(1);
});

test('admin no puede eliminar a otro administrador', function () {
    $admin1 = Usuario::factory()->admin()->create();
    $admin2 = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin1, ['*']);

    $response = $this->deleteJson("/api/admin/usuarios/{$admin2->id}");

    $response->assertStatus(403)
        ->assertJson(['error' => 'No se pueden eliminar administradores.']);
});

test('admin no puede eliminar usuario con pedidos activos en proceso', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $cliente = Usuario::factory()->cliente()->create();
    Pedido::factory()->create([
        'usuario_id' => $cliente->id,
        'estado' => EstadoPedido::CONFIRMADO,
    ]);

    $response = $this->deleteJson("/api/admin/usuarios/{$cliente->id}");

    $response->assertStatus(400)
        ->assertJson(['error' => 'No se puede eliminar el usuario porque tiene pedidos activos en proceso.']);
});

test('admin puede eliminar usuario sin pedidos activos', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $cliente = Usuario::factory()->cliente()->create();
    Pedido::factory()->create([
        'usuario_id' => $cliente->id,
        'estado' => EstadoPedido::ENTREGADO,
    ]);

    $response = $this->deleteJson("/api/admin/usuarios/{$cliente->id}");

    $response->assertStatus(200)
        ->assertJson(['mensaje' => 'Usuario eliminado correctamente.']);

    expect(Usuario::query()->find($cliente->id))->toBeNull();
});
