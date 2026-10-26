<?php

declare(strict_types=1);

namespace Tests\Feature\Wompi;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use App\Services\Wompi\SignatureService;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'correo' => 'cliente@test.com',
    ]);

    config([
        'wompi.public_key'       => 'pub_test_123',
        'wompi.private_key'      => 'prv_test_123',
        'wompi.integrity_secret' => 'integrity_secret_123',
        'wompi.events_secret'    => 'events_secret_123',
        'wompi.redirect_url'     => 'http://localhost:3000/pedido-confirmado',
    ]);
});

test('datos pago genera link de checkout y actualiza estado a pendiente_pago', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'estado'           => EstadoPedido::DRAFT,
        'total'            => 120000.00,
        'wompi_referencia' => 'PLX-TEST-WMP',
    ]);

    Http::fake([
        '*/payment_links' => Http::response([
            'data' => [
                'id' => 'link_xyz_999',
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedido->id,
    ]);

    $response->assertOk()
        ->assertJson([
            'public_key'       => 'pub_test_123',
            'referencia'       => 'PLX-TEST-WMP',
            'monto_centavos'   => 12000000,
            'checkout_url'     => 'https://checkout.wompi.co/l/link_xyz_999',
            'firma_integridad' => hash('sha256', 'PLX-TEST-WMP12000000COPintegrity_secret_123'),
        ]);

    expect($pedido->fresh()->wompi_link_id)->toBe('link_xyz_999')
        ->and($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
});

test('webhook con firma checksum valida y evento APPROVED confirma pedido y descuenta stock', function () {
    $producto = Producto::factory()->create([
        'stock'           => 10,
        'controlar_stock' => true,
    ]);

    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'estado'           => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-APPROVED-001',
        'total'            => 50000.00,
    ]);

    PedidoItem::create([
        'pedido_id'       => $pedido->id,
        'producto_id'     => $producto->id,
        'nombre_producto' => 'Caja Plastica',
        'cantidad'        => 3,
        'precio_unitario' => 15000,
        'subtotal'        => 45000,
    ]);

    $reserva = StockReserva::create([
        'pedido_id'   => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad'    => 3,
        'expira_at'   => now()->addMinutes(30),
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_test_001',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_wompi_888',
                'status'          => 'APPROVED',
                'reference'       => 'PLX-APPROVED-001',
                'amount_in_cents' => 5000000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
                'data.transaction.amount_in_cents',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    // SHA256( id + status + amount_in_cents + timestamp + events_secret )
    $expectedChecksum = hash('sha256', 'tx_wompi_888' . 'APPROVED' . '5000000' . '1700000000' . 'events_secret_123');

    Http::fake([
        '*/transactions/tx_wompi_888' => Http::response([
            'data' => [
                'id'              => 'tx_wompi_888',
                'status'          => 'APPROVED',
                'reference'       => 'PLX-APPROVED-001',
                'amount_in_cents' => 5000000,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $expectedChecksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_wompi_888')
        ->and($pedido->fresh()->wompi_evento_id)->toBe('evt_test_001');

    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'evt_test_001',
        'result'         => 'processed',
    ]);
});

test('webhook con evento duplicado es idempotente', function () {
    Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'wompi_referencia' => 'PLX-DUP-001',
        'wompi_evento_id'  => 'evt_duplicado_999',
        'estado'           => EstadoPedido::PAGADO,
        'total'            => 10000.00,
    ]);

    // Registrarlo previamente en la tabla de idempotencia
    \App\Models\WompiWebhookEvent::create([
        'wompi_event_id' => 'evt_duplicado_999',
        'event_type'     => 'transaction.updated',
        'payload'        => [],
        'result'         => 'processed',
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_duplicado_999',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_999',
                'status'          => 'APPROVED',
                'reference'       => 'PLX-DUP-001',
                'amount_in_cents' => 1000000,
            ],
        ],
        'signature' => [
            'properties' => ['data.transaction.id'],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_999' . '1700000000' . 'events_secret_123');

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Evento ya procesado',
        ]);
});

test('webhook con firma checksum invalida retorna 401', function () {
    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_fake',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'     => 'tx_fake',
                'status' => 'APPROVED',
            ],
        ],
        'signature' => [
            'properties' => ['data.transaction.id'],
            'checksum'   => '1700000000',
        ],
    ];

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => 'bad_checksum',
    ]);

    $response->assertStatus(401);
});

test('webhook con transaccion DECLINED cancela pedido y libera stock reservado', function () {
    $producto = Producto::factory()->create();

    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'wompi_referencia' => 'PLX-DECLINED-001',
        'estado'           => EstadoPedido::DRAFT,
        'total'            => 20000.00,
    ]);

    $reserva = StockReserva::create([
        'pedido_id'   => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad'    => 2,
        'expira_at'   => now()->addMinutes(30),
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_declined_123',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_declined_456',
                'status'          => 'DECLINED',
                'reference'       => 'PLX-DECLINED-001',
                'amount_in_cents' => 2000000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_declined_456' . 'DECLINED' . '1700000000' . 'events_secret_123');

    Http::fake([
        '*/transactions/tx_declined_456' => Http::response([
            'data' => [
                'id'              => 'tx_declined_456',
                'status'          => 'DECLINED',
                'reference'       => 'PLX-DECLINED-001',
                'amount_in_cents' => 2000000,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('webhook con monto alterado retorna 422 y audita el rechazo', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'wompi_referencia' => 'PLX-TAMPERING-001',
        'estado'           => EstadoPedido::PENDIENTE_PAGO,
        'total'            => 120000.00,
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_tampering_001',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_tampering_001',
                'status'          => 'APPROVED',
                'reference'       => 'PLX-TAMPERING-001',
                'amount_in_cents' => 10000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
                'data.transaction.amount_in_cents',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_tampering_001' . 'APPROVED' . '10000' . '1700000000' . 'events_secret_123');

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'mensaje' => 'Monto del evento no coincide con la orden',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'evt_tampering_001',
        'result'         => 'rejected_amount_mismatch',
    ]);
});

test('webhook DECLINED tardio no revierte un pedido ya pagado', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'wompi_referencia' => 'PLX-LATE-DECLINED-001',
        'estado'           => EstadoPedido::PAGADO,
        'total'            => 50000.00,
        'wompi_transaction_id' => 'tx_approved_001',
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_late_declined_001',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_declined_late_001',
                'status'          => 'DECLINED',
                'reference'       => 'PLX-LATE-DECLINED-001',
                'amount_in_cents' => 5000000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
                'data.transaction.amount_in_cents',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_declined_late_001' . 'DECLINED' . '5000000' . '1700000000' . 'events_secret_123');

    Http::fake([
        '*/transactions/tx_declined_late_001' => Http::response([
            'data' => [
                'id'              => 'tx_declined_late_001',
                'status'          => 'DECLINED',
                'reference'       => 'PLX-LATE-DECLINED-001',
                'amount_in_cents' => 5000000,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_approved_001');
});

test('webhook con transaccion VOIDED cancela pedido y libera stock reservado', function () {
    $producto = Producto::factory()->create();

    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'wompi_referencia' => 'PLX-VOIDED-001',
        'estado'           => EstadoPedido::DRAFT,
        'total'            => 25000.00,
    ]);

    $reserva = StockReserva::create([
        'pedido_id'   => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad'    => 1,
        'expira_at'   => now()->addMinutes(30),
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_voided_123',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_voided_456',
                'status'          => 'VOIDED',
                'reference'       => 'PLX-VOIDED-001',
                'amount_in_cents' => 2500000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_voided_456' . 'VOIDED' . '1700000000' . 'events_secret_123');

    Http::fake([
        '*/transactions/tx_voided_456' => Http::response([
            'data' => [
                'id'              => 'tx_voided_456',
                'status'          => 'VOIDED',
                'reference'       => 'PLX-VOIDED-001',
                'amount_in_cents' => 2500000,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('webhook con transaccion ERROR cancela pedido y libera stock reservado', function () {
    $producto = Producto::factory()->create();

    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'wompi_referencia' => 'PLX-ERROR-001',
        'estado'           => EstadoPedido::DRAFT,
        'total'            => 15000.00,
    ]);

    $reserva = StockReserva::create([
        'pedido_id'   => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad'    => 1,
        'expira_at'   => now()->addMinutes(30),
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_error_123',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_error_456',
                'status'          => 'ERROR',
                'reference'       => 'PLX-ERROR-001',
                'amount_in_cents' => 1500000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_error_456' . 'ERROR' . '1700000000' . 'events_secret_123');

    Http::fake([
        '*/transactions/tx_error_456' => Http::response([
            'data' => [
                'id'              => 'tx_error_456',
                'status'          => 'ERROR',
                'reference'       => 'PLX-ERROR-001',
                'amount_in_cents' => 1500000,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('datos pago maneja error 500 de la API de Wompi retornando 502', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'estado'           => EstadoPedido::DRAFT,
        'total'            => 100000.00,
        'wompi_referencia' => 'PLX-API-FAIL',
    ]);

    Http::fake([
        '*/payment_links' => Http::response([
            'error' => ['type' => 'InternalError'],
        ], 500),
    ]);

    $response = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedido->id,
    ]);

    $response->assertStatus(502);
});

test('webhook maneja error de la API de Wompi al consultar transaccion y usa estado del payload como respaldo', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id'       => $this->usuario->id,
        'estado'           => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-API-DOWN-001',
        'total'            => 35000.00,
    ]);

    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_api_down_001',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_api_down_888',
                'status'          => 'APPROVED',
                'reference'       => 'PLX-API-DOWN-001',
                'amount_in_cents' => 3500000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
                'data.transaction.amount_in_cents',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_api_down_888' . 'APPROVED' . '3500000' . '1700000000' . 'events_secret_123');

    // La API externa de Wompi falla con 500 al consultar el estado de la transacción
    Http::fake([
        '*/transactions/tx_api_down_888' => Http::response([
            'error' => ['type' => 'InternalError'],
        ], 500),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Webhook procesado',
        ]);

    // Debe haber usado exitosamente el estado APPROVED del webhook
    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_api_down_888');
});

test('webhook con pedido no encontrado responde 200 y audita rejected_order_not_found', function () {
    $payload = [
        'event'     => 'transaction.updated',
        'id'        => 'evt_not_found_001',
        'timestamp' => 1700000000,
        'data'      => [
            'transaction' => [
                'id'              => 'tx_unknown_999',
                'status'          => 'APPROVED',
                'reference'       => 'PLX-NON-EXISTENT',
                'amount_in_cents' => 5000000,
            ],
        ],
        'signature' => [
            'properties' => [
                'data.transaction.id',
                'data.transaction.status',
                'data.transaction.amount_in_cents',
            ],
            'checksum'   => '1700000000',
        ],
    ];

    $checksum = hash('sha256', 'tx_unknown_999' . 'APPROVED' . '5000000' . '1700000000' . 'events_secret_123');

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $checksum,
    ]);

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Pedido no encontrado',
        ]);

    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'evt_not_found_001',
        'result'         => 'rejected_order_not_found',
    ]);
});
