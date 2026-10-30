<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;

test('draft puede pasar a pendiente_pago o cancelado', function () {
    expect(EstadoPedido::DRAFT->puedePasarA(EstadoPedido::PENDIENTE_PAGO))->toBeTrue()
        ->and(EstadoPedido::DRAFT->puedePasarA(EstadoPedido::CANCELADO))->toBeTrue()
        ->and(EstadoPedido::DRAFT->puedePasarA(EstadoPedido::PAGADO))->toBeFalse()
        ->and(EstadoPedido::DRAFT->puedePasarA(EstadoPedido::ENTREGADO))->toBeFalse();
});

test('pendiente_pago puede pasar a pagado o cancelado', function () {
    expect(EstadoPedido::PENDIENTE_PAGO->puedePasarA(EstadoPedido::PAGADO))->toBeTrue()
        ->and(EstadoPedido::PENDIENTE_PAGO->puedePasarA(EstadoPedido::CANCELADO))->toBeTrue()
        ->and(EstadoPedido::PENDIENTE_PAGO->puedePasarA(EstadoPedido::ENTREGADO))->toBeFalse();
});

test('pagado puede pasar a confirmado, en_preparacion o cancelado', function () {
    expect(EstadoPedido::PAGADO->puedePasarA(EstadoPedido::CONFIRMADO))->toBeTrue()
        ->and(EstadoPedido::PAGADO->puedePasarA(EstadoPedido::EN_PREPARACION))->toBeTrue()
        ->and(EstadoPedido::PAGADO->puedePasarA(EstadoPedido::CANCELADO))->toBeTrue()
        ->and(EstadoPedido::PAGADO->puedePasarA(EstadoPedido::ENTREGADO))->toBeFalse();
});

test('en_camino puede pasar a entregado o cancelado', function () {
    expect(EstadoPedido::EN_CAMINO->puedePasarA(EstadoPedido::ENTREGADO))->toBeTrue()
        ->and(EstadoPedido::EN_CAMINO->puedePasarA(EstadoPedido::CANCELADO))->toBeTrue()
        ->and(EstadoPedido::EN_CAMINO->puedePasarA(EstadoPedido::PENDIENTE_PAGO))->toBeFalse();
});

test('estados terminales entregado y cancelado no permiten transiciones', function () {
    expect(EstadoPedido::ENTREGADO->puedePasarA(EstadoPedido::CANCELADO))->toBeFalse()
        ->and(EstadoPedido::ENTREGADO->puedePasarA(EstadoPedido::CONFIRMADO))->toBeFalse()
        ->and(EstadoPedido::CANCELADO->puedePasarA(EstadoPedido::PAGADO))->toBeFalse()
        ->and(EstadoPedido::CANCELADO->puedePasarA(EstadoPedido::DRAFT))->toBeFalse();
});

test('permanecer en el mismo estado siempre es valido', function () {
    foreach (EstadoPedido::cases() as $estado) {
        expect($estado->puedePasarA($estado))->toBeTrue();
    }
});
