<?php

declare(strict_types=1);

use App\Models\Pedido;
use App\Models\Producto;
use App\Models\StockReserva;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('scopes expiradas y activas discriminan reservas por fecha', function () {
    $pedido = Pedido::factory()->create();
    $producto = Producto::factory()->create();

    StockReserva::query()->create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
        'creado_at' => now()->subMinutes(40),
        'expira_at' => now()->subMinutes(10), // Expirada
    ]);

    StockReserva::query()->create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 3,
        'creado_at' => now(),
        'expira_at' => now()->addMinutes(30), // Activa
    ]);

    expect(StockReserva::query()->expiradas()->count())->toBe(1)
        ->and(StockReserva::query()->activas()->count())->toBe(1);
});
