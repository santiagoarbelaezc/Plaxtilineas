<?php

declare(strict_types=1);

use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('producto valida stock suficiente correctamente cuando controla stock', function () {
    $producto = Producto::factory()->create([
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    expect($producto->tieneStockSuficiente(5))->toBeTrue()
        ->and($producto->tieneStockSuficiente(10))->toBeTrue()
        ->and($producto->tieneStockSuficiente(11))->toBeFalse();
});

test('producto con stock ilimitado siempre tiene stock suficiente', function () {
    $producto = Producto::factory()->stockIlimitado()->create([
        'stock' => 0,
    ]);

    expect($producto->tieneStockSuficiente(9999))->toBeTrue();
});

test('scopes activo y conStock filtran productos apropiadamente', function () {
    Producto::factory()->create(['stock' => 5, 'activo' => true]);
    Producto::factory()->sinStock()->create(['activo' => true]);
    Producto::factory()->inactivo()->create(['stock' => 10]);

    expect(Producto::query()->activo()->count())->toBe(2)
        ->and(Producto::query()->conStock()->count())->toBe(2);
});
