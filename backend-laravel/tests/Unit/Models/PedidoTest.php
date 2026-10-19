<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('pedido castea estado a enum EstadoPedido y maneja relaciones', function () {
    $usuario = Usuario::factory()->create();
    $producto = Producto::factory()->create(['precio' => 20000]);

    $pedido = Pedido::factory()->draft()->create([
        'usuario_id' => $usuario->id,
    ]);

    PedidoItem::query()->create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'nombre_producto' => $producto->nombre,
        'cantidad' => 2,
        'precio_unitario' => 20000,
        'subtotal' => 40000,
    ]);

    expect($pedido->estado)->toBe(EstadoPedido::DRAFT)
        ->and($pedido->usuario->id)->toBe($usuario->id)
        ->and($pedido->items)->toHaveCount(1)
        ->and($pedido->items->first()->producto->id)->toBe($producto->id);
});

test('scope porEstado filtra pedidos adecuadamente', function () {
    Pedido::factory()->draft()->create();
    Pedido::factory()->draft()->create();
    Pedido::factory()->pagado()->create();

    expect(Pedido::query()->porEstado(EstadoPedido::DRAFT)->count())->toBe(2)
        ->and(Pedido::query()->porEstado(EstadoPedido::PAGADO)->count())->toBe(1);
});
