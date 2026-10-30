<?php

declare(strict_types=1);

namespace Tests\Feature\Wompi;

use App\Enums\EstadoPedido;
use App\Jobs\ReconcilePendingPaymentsJob;
use App\Models\Pedido;
use App\Models\Usuario;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'correo' => 'cliente_reconcile@test.com',
    ]);

    config([
        'wompi.public_key' => 'pub_test_123',
        'wompi.private_key' => 'prv_test_123',
        'wompi.integrity_secret' => 'integrity_secret_123',
        'wompi.events_secret' => 'events_secret_123',
    ]);
});

test('reconciliacion actualiza pedidos pendientes a pagado si Wompi reporta APPROVED', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-REC-001',
        'wompi_link_id' => 'link_rec_123',
        'fecha' => now()->subMinutes(20),
        'total' => 50000.00,
    ]);

    Http::fake([
        '*/payment_links/link_rec_123/transactions' => Http::response([
            'data' => [
                [
                    'id' => 'tx_rec_999',
                    'status' => 'APPROVED',
                    'reference' => 'PLX-REC-001',
                    'amount_in_cents' => 5000000,
                ],
            ],
        ], 200),
    ]);

    $this->artisan('wompi:reconciliar-pendientes', ['--minutes' => 10])
        ->assertSuccessful();

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_rec_999');
});

test('reconciliacion cancela pedido si Wompi reporta DECLINED', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-REC-002',
        'wompi_link_id' => 'link_rec_declined',
        'fecha' => now()->subMinutes(30),
        'total' => 30000.00,
    ]);

    Http::fake([
        '*/payment_links/link_rec_declined/transactions' => Http::response([
            'data' => [
                [
                    'id' => 'tx_rec_dec_111',
                    'status' => 'DECLINED',
                    'reference' => 'PLX-REC-002',
                    'amount_in_cents' => 3000000,
                ],
            ],
        ], 200),
    ]);

    ReconcilePendingPaymentsJob::dispatchSync(10);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_rec_dec_111');
});

test('reconciliacion maneja error de la API de Wompi sin detener el job ni alterar el pedido', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-REC-ERR-001',
        'wompi_link_id' => 'link_rec_error',
        'fecha' => now()->subMinutes(25),
        'total' => 40000.00,
    ]);

    Http::fake([
        '*/payment_links/link_rec_error/transactions' => Http::response([
            'error' => ['type' => 'InternalError'],
        ], 500),
    ]);

    // Debe ejecutarse sin lanzar excepciones no controladas
    $this->artisan('wompi:reconciliar-pendientes', ['--minutes' => 10])
        ->assertSuccessful();

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBeNull();
});

test('reconciliacion no altera pedidos si no hay transacciones en Wompi', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-REC-EMPTY-001',
        'wompi_link_id' => 'link_rec_empty',
        'fecha' => now()->subMinutes(15),
        'total' => 45000.00,
    ]);

    Http::fake([
        '*/payment_links/link_rec_empty/transactions' => Http::response([
            'data' => [],
        ], 200),
    ]);

    ReconcilePendingPaymentsJob::dispatchSync(10);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBeNull();
});
