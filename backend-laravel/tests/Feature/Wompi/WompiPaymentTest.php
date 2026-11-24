<?php

declare(strict_types=1);

namespace Tests\Feature\Wompi;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use App\Models\WompiWebhookEvent;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'correo' => 'cliente@test.com',
        'nombre' => 'Cliente',
        'apellidos' => 'Prueba',
        'telefono' => '3001234567',
    ]);

    config([
        'wompi.env' => 'sandbox',
        'wompi.public_key' => 'pub_test_123',
        'wompi.private_key' => 'prv_test_123',
        'wompi.integrity_secret' => 'test_integrity_secret_123',
        'wompi.events_secret' => 'test_events_secret_123',
        'wompi.redirect_url' => 'https://plaxtilineas.com/pago-exitoso',
    ]);
});

test('datos pago genera parametros firmados SHA-256 para Web Checkout y actualiza estado a pendiente_pago', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::DRAFT,
        'total' => 120000.00,
        'wompi_referencia' => 'PLX-TEST-WMP',
    ]);

    $response = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedido->id,
    ]);

    $expectedSignature = hash('sha256', 'PLX-TEST-WMP12000000COPtest_integrity_secret_123');

    $response->assertOk()
        ->assertJson([
            'public_key' => 'pub_test_123',
            'referencia' => 'PLX-TEST-WMP',
            'monto_centavos' => 12000000,
            'moneda' => 'COP',
            'checkout_url' => 'https://checkout.wompi.co/p/',
            'firma_integridad' => $expectedSignature,
            'firma' => $expectedSignature,
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
});

test('datos pago retorna 503 si falta el secreto de integridad', function () {
    Sanctum::actingAs($this->usuario);
    config(['wompi.integrity_secret' => '']);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::DRAFT,
        'total' => 50000.00,
        'wompi_referencia' => 'PLX-NO-SECRET',
    ]);

    $this->postJson('/api/wompi/datos-pago', ['pedido_id' => $pedido->id])
        ->assertStatus(503);
});

test('webhook oficial de Wompi sin id raiz valida checksum real y confirma pedido APPROVED', function () {
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

    $expectedChecksum = hash('sha256', 'tx_wompi_888'.'APPROVED'.'5000000'.'1700000000'.'test_events_secret_123');

    // Payload oficial exacto de Wompi (properties relativas a data, sin id en raíz, checksum real en signature.checksum)
    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'sent_at' => '2026-11-24T15:00:00.000Z',
        'data' => [
            'transaction' => [
                'id' => 'tx_wompi_888',
                'status' => 'APPROVED',
                'reference' => 'PLX-APPROVED-001',
                'currency' => 'COP',
                'amount_in_cents' => 5000000,
            ],
        ],
        'signature' => [
            'properties' => [
                'transaction.id',
                'transaction.status',
                'transaction.amount_in_cents',
            ],
            'checksum' => strtoupper($expectedChecksum),
        ],
    ];

    Http::fake([
        '*/transactions/tx_wompi_888' => Http::response([
            'data' => [
                'id' => 'tx_wompi_888',
                'status' => 'APPROVED',
                'reference' => 'PLX-APPROVED-001',
                'currency' => 'COP',
                'amount_in_cents' => 5000000,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/wompi/webhook', $payload, [
        'X-Event-Checksum' => $expectedChecksum,
    ]);

    $response->assertOk()
        ->assertJson(['mensaje' => 'Webhook procesado']);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_wompi_888');

    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'tx_wompi_888:APPROVED',
        'result' => 'processed',
    ]);
});

test('webhook rechaza con 401 si events_secret no esta configurado (fail-closed)', function () {
    config(['wompi.events_secret' => '']);

    $payload = [
        'event' => 'transaction.updated',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_spoof',
                'status' => 'APPROVED',
                'reference' => 'PLX-SPOOF',
                'amount_in_cents' => 1000000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id'],
            'checksum' => 'anything',
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => 'anything'])
        ->assertStatus(401);
});

test('webhook con evento duplicado es idempotente sin requerir id raiz', function () {
    Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-DUP-001',
        'estado' => EstadoPedido::PAGADO,
        'total' => 10000.00,
    ]);

    WompiWebhookEvent::create([
        'wompi_event_id' => 'tx_999:APPROVED',
        'event_type' => 'transaction.updated',
        'payload' => [],
        'result' => 'processed',
        'processed_at' => now(),
    ]);

    $checksum = hash('sha256', 'tx_999'.'APPROVED'.'1000000'.'1700000000'.'test_events_secret_123');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_999',
                'status' => 'APPROVED',
                'reference' => 'PLX-DUP-001',
                'currency' => 'COP',
                'amount_in_cents' => 1000000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertOk()
        ->assertJson(['mensaje' => 'Evento ya procesado']);
});

test('webhook con firma checksum invalida retorna 401', function () {
    $payload = [
        'event' => 'transaction.updated',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_fake',
                'status' => 'APPROVED',
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id'],
            'checksum' => 'bad_checksum',
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => 'bad_checksum'])
        ->assertStatus(401);
});

test('webhook permite reintento exitoso tras un primer intento DECLINED en la misma referencia (regla Wompi seccion 8)', function () {
    $producto = Producto::factory()->create(['stock' => 10, 'controlar_stock' => true]);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-RETRY-001',
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'total' => 20000.00,
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
        'expira_at' => now()->addMinutes(30),
    ]);

    // 1) Primer intento DECLINED (ej. tarjeta rechazada) -> conserva pendiente_pago y reserva activa
    $checksumDeclined = hash('sha256', 'tx_try_1'.'DECLINED'.'2000000'.'1700000000'.'test_events_secret_123');
    $payloadDeclined = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_try_1',
                'status' => 'DECLINED',
                'reference' => 'PLX-RETRY-001',
                'currency' => 'COP',
                'amount_in_cents' => 2000000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksumDeclined,
        ],
    ];

    Http::fake([
        '*/transactions/tx_try_1' => Http::response([
            'data' => [
                'id' => 'tx_try_1',
                'status' => 'DECLINED',
                'reference' => 'PLX-RETRY-001',
                'currency' => 'COP',
                'amount_in_cents' => 2000000,
            ],
        ], 200),
        '*/transactions/tx_try_2' => Http::response([
            'data' => [
                'id' => 'tx_try_2',
                'status' => 'APPROVED',
                'reference' => 'PLX-RETRY-001',
                'currency' => 'COP',
                'amount_in_cents' => 2000000,
            ],
        ], 200),
    ]);

    $this->postJson('/api/wompi/webhook', $payloadDeclined, ['X-Event-Checksum' => $checksumDeclined])
        ->assertOk();

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
    $this->assertDatabaseHas('stock_reservas', ['id' => $reserva->id]);

    // 2) Segundo intento APPROVED (ej. Nequi dentro de la ventana de 3 min) -> confirma la orden
    $checksumApproved = hash('sha256', 'tx_try_2'.'APPROVED'.'2000000'.'1700000100'.'test_events_secret_123');
    $payloadApproved = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000100,
        'data' => [
            'transaction' => [
                'id' => 'tx_try_2',
                'status' => 'APPROVED',
                'reference' => 'PLX-RETRY-001',
                'currency' => 'COP',
                'amount_in_cents' => 2000000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksumApproved,
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payloadApproved, ['X-Event-Checksum' => $checksumApproved])
        ->assertOk();

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_try_2');
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('webhook con monto alterado retorna 422 y audita el rechazo', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-TAMPERING-001',
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'total' => 120000.00,
    ]);

    $checksum = hash('sha256', 'tx_tampering_001'.'APPROVED'.'10000'.'1700000000'.'test_events_secret_123');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_tampering_001',
                'status' => 'APPROVED',
                'reference' => 'PLX-TAMPERING-001',
                'currency' => 'COP',
                'amount_in_cents' => 10000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertStatus(422)
        ->assertJson(['mensaje' => 'Monto del evento no coincide con la orden']);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'tx_tampering_001:APPROVED',
        'result' => 'rejected_amount_mismatch',
    ]);
});

test('webhook VOIDED tardio no revierte un pedido ya pagado', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-LATE-VOIDED-001',
        'estado' => EstadoPedido::PAGADO,
        'total' => 50000.00,
        'wompi_transaction_id' => 'tx_approved_001',
    ]);

    $checksum = hash('sha256', 'tx_voided_late_001'.'VOIDED'.'5000000'.'1700000000'.'test_events_secret_123');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_voided_late_001',
                'status' => 'VOIDED',
                'reference' => 'PLX-LATE-VOIDED-001',
                'currency' => 'COP',
                'amount_in_cents' => 5000000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ];

    Http::fake([
        '*/transactions/tx_voided_late_001' => Http::response([
            'data' => [
                'id' => 'tx_voided_late_001',
                'status' => 'VOIDED',
                'reference' => 'PLX-LATE-VOIDED-001',
                'currency' => 'COP',
                'amount_in_cents' => 5000000,
            ],
        ], 200),
    ]);

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertOk();

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedido->fresh()->wompi_transaction_id)->toBe('tx_approved_001');
});

test('webhook con transaccion VOIDED cancela pedido pendiente y libera stock reservado', function () {
    $producto = Producto::factory()->create();

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-VOIDED-001',
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'total' => 25000.00,
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 1,
        'expira_at' => now()->addMinutes(30),
    ]);

    $checksum = hash('sha256', 'tx_voided_456'.'VOIDED'.'1700000000'.'test_events_secret_123');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_voided_456',
                'status' => 'VOIDED',
                'reference' => 'PLX-VOIDED-001',
                'currency' => 'COP',
                'amount_in_cents' => 2500000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status'],
            'checksum' => $checksum,
        ],
    ];

    Http::fake([
        '*/transactions/tx_voided_456' => Http::response([
            'data' => [
                'id' => 'tx_voided_456',
                'status' => 'VOIDED',
                'reference' => 'PLX-VOIDED-001',
                'currency' => 'COP',
                'amount_in_cents' => 2500000,
            ],
        ], 200),
    ]);

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertOk();

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('webhook retorna 503 cuando la API de Wompi falla en la doble verificacion para solicitar reintento oficial', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-API-DOWN-001',
        'total' => 35000.00,
    ]);

    $checksum = hash('sha256', 'tx_api_down_888'.'APPROVED'.'3500000'.'1700000000'.'test_events_secret_123');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1700000000,
        'data' => [
            'transaction' => [
                'id' => 'tx_api_down_888',
                'status' => 'APPROVED',
                'reference' => 'PLX-API-DOWN-001',
                'currency' => 'COP',
                'amount_in_cents' => 3500000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ];

    Http::fake([
        '*/transactions/tx_api_down_888' => Http::response(['error' => ['type' => 'InternalError']], 500),
    ]);

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertStatus(503);

    // El pedido NO se marca como pagado sin doble verificación exitosa
    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
});

test('endpoint pedidos estado es estrictamente de solo lectura y nunca muta la orden ni llama a Wompi', function () {
    Sanctum::actingAs($this->usuario);
    Http::fake();

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'metodo_pago' => 'wompi',
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-READONLY-001',
        'total' => 45000.00,
    ]);

    $this->getJson('/api/pedidos/estado?ref=PLX-READONLY-001&id=tx_inventado_cliente')
        ->assertOk()
        ->assertJson([
            'estado' => 'pendiente_pago',
            'wompi_referencia' => 'PLX-READONLY-001',
        ]);

    Http::assertNothingSent();
    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
});
