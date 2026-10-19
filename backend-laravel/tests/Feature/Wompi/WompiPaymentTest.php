<?php

declare(strict_types=1);

use App\Contracts\WompiClientInterface;
use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'correo' => 'cliente@test.com',
    ]);

    config([
        'services.wompi.public_key' => 'pub_test_123',
        'services.wompi.private_key' => 'prv_test_123',
        'services.wompi.events_key' => 'events_key_123',
    ]);
});

test('datos pago genera link de checkout y actualiza estado a pendiente_pago', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::DRAFT,
        'total' => 120000.00,
        'wompi_referencia' => 'PLX-TEST-WMP',
    ]);

    $mockWompi = Mockery::mock(WompiClientInterface::class);
    $mockWompi->shouldReceive('crearPaymentLink')
        ->once()
        ->andReturn([
            'data' => [
                'id' => 'link_xyz_999',
            ],
        ]);
    $this->app->instance(WompiClientInterface::class, $mockWompi);

    $response = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedido->id,
    ]);

    $response->assertOk()
        ->assertJson([
            'public_key' => 'pub_test_123',
            'referencia' => 'PLX-TEST-WMP',
            'monto_centavos' => 12000000,
            'checkout_url' => 'https://checkout.wompi.co/l/link_xyz_999',
        ]);

    expect($pedido->fresh()->wompi_link_id)->toBe('link_xyz_999')
        ->and($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
});

test('webhook con firma checksum valida y evento APPROVED confirma pedido y descuenta stock', function () {
    $producto = Producto::factory()->create([
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-APPROVED-001',
        'total' => 50000.00,
    ]);

    PedidoItem::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'nombre_producto' => 'Caja Plastica',
        'cantidad' => 3,
        'precio_unitario' => 15000,
        'subtotal' => 45000,
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 3,
        'expira_at' => now()->addMinutes(30),
    ]);

    $mockWompi = Mockery::mock(WompiClientInterface::class);
    $mockWompi->shouldReceive('verificarChecksum')->once()->andReturn(true);
    $this->app->instance(WompiClientInterface::class, $mockWompi);

    $payload = [
        'event' => 'transaction.updated',
        'id' => 'evt_test_001',
        'created_at' => '2026-10-19T14:00:00Z',
        'data' => [
            'transaction' => [
                'id' => 'tx_wompi_888',
                'status' => 'APPROVED',
                'reference' => 'PLX-APPROVED-001',
                'amount_in_cents' => 5000000,
            ],
        ],
    ];

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => 'valid_hash',
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_wompi_888')
        ->and($pedido->fresh()->wompi_evento_id)->toBe('evt_test_001')
        ->and($producto->fresh()->stock)->toBe(7);

    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('webhook con evento duplicado es idempotente', function () {
    Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-DUP-001',
        'wompi_evento_id' => 'evt_duplicado_999',
        'estado' => EstadoPedido::PAGADO,
    ]);

    $mockWompi = Mockery::mock(WompiClientInterface::class);
    $mockWompi->shouldReceive('verificarChecksum')->once()->andReturn(true);
    $this->app->instance(WompiClientInterface::class, $mockWompi);

    $payload = [
        'event' => 'transaction.updated',
        'id' => 'evt_duplicado_999',
        'data' => [
            'transaction' => [
                'id' => 'tx_999',
                'status' => 'APPROVED',
                'reference' => 'PLX-DUP-001',
                'amount_in_cents' => 1000000,
            ],
        ],
    ];

    $response = $this->postJson('/api/wompi/webhook', $payload);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Evento ya procesado',
        ]);
});

test('webhook con firma checksum invalida retorna 401', function () {
    $mockWompi = Mockery::mock(WompiClientInterface::class);
    $mockWompi->shouldReceive('verificarChecksum')->once()->andReturn(false);
    $this->app->instance(WompiClientInterface::class, $mockWompi);

    $payload = [
        'event' => 'transaction.updated',
        'id' => 'evt_fake',
        'data' => [
            'transaction' => [
                'id' => 'tx_fake',
                'status' => 'APPROVED',
            ],
        ],
    ];

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => 'bad_checksum',
    ]);

    $response->assertStatus(401)
        ->assertJson([
            'error' => 'Firma de evento inválida',
        ]);
});

test('webhook con transaccion DECLINED cancela pedido y libera stock reservado', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-DECLINED-001',
        'estado' => EstadoPedido::DRAFT,
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => Producto::factory()->create()->id,
        'cantidad' => 2,
        'expira_at' => now()->addMinutes(30),
    ]);

    $mockWompi = Mockery::mock(WompiClientInterface::class);
    $mockWompi->shouldReceive('verificarChecksum')->once()->andReturn(true);
    $this->app->instance(WompiClientInterface::class, $mockWompi);

    $payload = [
        'event' => 'transaction.updated',
        'id' => 'evt_declined_123',
        'data' => [
            'transaction' => [
                'id' => 'tx_declined_456',
                'status' => 'DECLINED',
                'reference' => 'PLX-DECLINED-001',
                'amount_in_cents' => 2000000,
            ],
        ],
    ];

    $response = $this->postJson('/api/wompi/webhook', $payload);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});
