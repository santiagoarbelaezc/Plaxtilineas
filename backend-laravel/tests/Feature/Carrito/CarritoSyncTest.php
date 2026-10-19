<?php

declare(strict_types=1);

use App\Models\Carrito;
use App\Models\Producto;
use App\Models\Usuario;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'email_verificado' => true,
    ]);
});

test('peticion sin autenticacion retorna 401', function () {
    $response = $this->postJson('/api/carrito/sync', [
        'items' => [],
    ]);

    $response->assertStatus(401);
});

test('validacion falla si items no es un arreglo', function () {
    Sanctum::actingAs($this->usuario);

    $response = $this->postJson('/api/carrito/sync', [
        'items' => 'invalido',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['items']);
});

test('sincronizar carrito nuevo con stock suficiente descuenta stock y guarda items en base de datos', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Caja Organizadora 10L',
        'precio' => 25000.00,
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    $response = $this->postJson('/api/carrito/sync', [
        'items' => [
            [
                'producto_id' => $producto->id,
                'variante_id' => null,
                'cantidad' => 3,
                'precio_unitario' => 25000.00,
            ],
        ],
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Carrito sincronizado exitosamente.',
        ]);

    expect($producto->fresh()->stock)->toBe(7);

    $this->assertDatabaseHas('carritos', [
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 3,
    ]);
});

test('sincronizar carrito aumentando cantidad descuenta la diferencia de stock', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Balde Industrial 20L',
        'stock' => 8,
        'controlar_stock' => true,
    ]);

    Carrito::factory()->create([
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
        'precio_unitario' => 15000,
    ]);

    // Usuario ahora quiere 5 (diferencia de +3)
    $response = $this->postJson('/api/carrito/sync', [
        'items' => [
            [
                'producto_id' => $producto->id,
                'cantidad' => 5,
                'precio_unitario' => 15000,
            ],
        ],
    ]);

    $response->assertOk();
    expect($producto->fresh()->stock)->toBe(5);

    $this->assertDatabaseHas('carritos', [
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 5,
    ]);
});

test('sincronizar carrito reduciendo cantidad devuelve stock al inventario', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Caneca 50L',
        'stock' => 4,
        'controlar_stock' => true,
    ]);

    Carrito::factory()->create([
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 6,
        'precio_unitario' => 30000,
    ]);

    // Usuario reduce a 2 unidades (diferencia de -4)
    $response = $this->postJson('/api/carrito/sync', [
        'items' => [
            [
                'producto_id' => $producto->id,
                'cantidad' => 2,
                'precio_unitario' => 30000,
            ],
        ],
    ]);

    $response->assertOk();
    expect($producto->fresh()->stock)->toBe(8);

    $this->assertDatabaseHas('carritos', [
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
    ]);
});

test('sincronizar carrito con lista vacia vacia el carrito y devuelve todo el stock', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Contenedor Multiuso',
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    Carrito::factory()->create([
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 4,
        'precio_unitario' => 12000,
    ]);

    $response = $this->postJson('/api/carrito/sync', [
        'items' => [],
    ]);

    $response->assertOk();
    expect($producto->fresh()->stock)->toBe(14);

    $this->assertDatabaseMissing('carritos', [
        'usuario_id' => $this->usuario->id,
    ]);
});

test('intento de reservar mas stock del disponible retorna 400 y revierte cambios', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Silla Plastica Infantil',
        'stock' => 2,
        'controlar_stock' => true,
    ]);

    $response = $this->postJson('/api/carrito/sync', [
        'items' => [
            [
                'producto_id' => $producto->id,
                'cantidad' => 5,
                'precio_unitario' => 18000,
            ],
        ],
    ]);

    $response->assertStatus(400)
        ->assertJson([
            'error' => 'Stock insuficiente para "Silla Plastica Infantil". Disponible para reservar: 2.',
        ]);

    expect($producto->fresh()->stock)->toBe(2);
    $this->assertDatabaseMissing('carritos', [
        'usuario_id' => $this->usuario->id,
    ]);
});

test('producto con controlar_stock desactivado permite cualquier cantidad sin alterar inventario', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Servicio de Personalizacion',
        'stock' => 0,
        'controlar_stock' => false,
    ]);

    $response = $this->postJson('/api/carrito/sync', [
        'items' => [
            [
                'producto_id' => $producto->id,
                'cantidad' => 50,
                'precio_unitario' => 5000,
            ],
        ],
    ]);

    $response->assertOk();
    expect($producto->fresh()->stock)->toBe(0);

    $this->assertDatabaseHas('carritos', [
        'usuario_id' => $this->usuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 50,
    ]);
});

test('limpieza automatica de carritos expirados mas de 24 horas devuelve stock al inventario', function () {
    Sanctum::actingAs($this->usuario);

    $otroUsuario = Usuario::factory()->create();

    $producto = Producto::factory()->create([
        'stock' => 5,
        'controlar_stock' => true,
    ]);

    $carritoExpirado = Carrito::factory()->create([
        'usuario_id' => $otroUsuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 3,
        'updated_at' => Carbon::now()->subHours(25),
    ]);

    // Cuando el usuario sincroniza su carrito, la limpieza previa se dispara
    $response = $this->postJson('/api/carrito/sync', [
        'items' => [],
    ]);

    $response->assertOk();

    // El stock del producto debe haberse restituido (+3)
    expect($producto->fresh()->stock)->toBe(8);

    // El carrito expirado debe haber sido eliminado
    $this->assertDatabaseMissing('carritos', [
        'id' => $carritoExpirado->id,
    ]);
});

test('comando artisan carrito:limpiar-expirados procesa y libera stock correctamente', function () {
    $otroUsuario = Usuario::factory()->create();

    $producto = Producto::factory()->create([
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    Carrito::factory()->create([
        'usuario_id' => $otroUsuario->id,
        'producto_id' => $producto->id,
        'cantidad' => 4,
        'updated_at' => Carbon::now()->subHours(30),
    ]);

    Artisan::call('carrito:limpiar-expirados');

    expect($producto->fresh()->stock)->toBe(14);
    expect(Carrito::count())->toBe(0);
});
