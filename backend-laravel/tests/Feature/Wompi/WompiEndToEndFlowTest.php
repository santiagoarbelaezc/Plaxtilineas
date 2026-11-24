<?php

declare(strict_types=1);

namespace Tests\Feature\Wompi;

use App\Enums\EstadoPedido;
use App\Mail\PagoConfirmadoMailable;
use App\Models\Carrito;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->cliente = Usuario::factory()->create([
        'nombre' => 'Santiago',
        'apellidos' => 'Prueba',
        'correo' => 'comprador@plaxtilineas.test',
        'telefono' => '3053298122',
    ]);

    config([
        'wompi.env' => 'sandbox',
        'wompi.public_key' => 'pub_test_e2e_123',
        'wompi.private_key' => 'prv_test_e2e_123',
        'wompi.integrity_secret' => 'test_integrity_e2e_secret',
        'wompi.events_secret' => 'test_events_e2e_secret',
        'wompi.redirect_url' => 'https://plaxtilineas.com/pago-exitoso',
    ]);
});

test('flujo completo E2E: checkout firmado -> retorno solo lectura -> webhook APPROVED S2S -> correo y carrito limpio -> reintento idempotente', function () {
    Mail::fake();
    Sanctum::actingAs($this->cliente);

    $producto = Producto::factory()->create([
        'nombre' => 'Rollo Plástico Negro',
        'precio' => 39900,
        'stock' => 20,
        'controlar_stock' => true,
    ]);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::DRAFT,
        'metodo_pago' => 'wompi',
        'subtotal' => 39900.00,
        'iva' => 0.00,
        'costo_envio' => 10000.00,
        'total' => 49900.00,
        'wompi_referencia' => 'PLX-E2E-001',
        'email_cliente' => $this->cliente->correo,
        'nombre_cliente' => 'Santiago Prueba',
    ]);

    PedidoItem::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'nombre_producto' => $producto->nombre,
        'cantidad' => 1,
        'precio_unitario' => 39900,
        'subtotal' => 39900,
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 1,
        'expira_at' => now()->addMinutes(30),
    ]);

    Carrito::create([
        'usuario_id' => $this->cliente->id,
        'producto_id' => $producto->id,
        'cantidad' => 1,
        'precio_unitario' => 39900,
    ]);

    // ── PASO 1: Solicitar datos firmados para Web Checkout ───────────────────
    $checkoutRes = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedido->id,
    ]);

    $expectedIntegrity = hash('sha256', 'PLX-E2E-001'.'4990000'.'COP'.'test_integrity_e2e_secret');

    $checkoutRes->assertOk()
        ->assertJson([
            'public_key' => 'pub_test_e2e_123',
            'referencia' => 'PLX-E2E-001',
            'monto_centavos' => 4990000,
            'moneda' => 'COP',
            'firma_integridad' => $expectedIntegrity,
            'firma' => $expectedIntegrity,
            'checkout_url' => 'https://checkout.wompi.co/p/',
            'redirect_url' => 'https://plaxtilineas.com/pago-exitoso',
        ]);

    // Verificar que ningún secreto se haya filtrado en la respuesta al navegador
    $rawCheckoutJson = $checkoutRes->getContent();
    expect($rawCheckoutJson)->not->toContain('test_integrity_e2e_secret')
        ->and($rawCheckoutJson)->not->toContain('prv_test_e2e_123')
        ->and($rawCheckoutJson)->not->toContain('test_events_e2e_secret')
        ->and($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);

    // ── PASO 2: Cliente regresa a /pago-exitoso ANTES del webhook (solo lectura)
    $txId = '112233-tx-wompi';
    Http::fake([
        "*/transactions/{$txId}" => Http::response([
            'data' => [
                'id' => $txId,
                'status' => 'APPROVED',
                'reference' => 'PLX-E2E-001',
                'currency' => 'COP',
                'amount_in_cents' => 4990000,
            ],
        ], 200),
    ]);

    $this->getJson("/api/pedidos/estado?ref=PLX-E2E-001&id={$txId}")
        ->assertOk()
        ->assertJson([
            'estado' => 'pendiente_pago',
            'wompi_referencia' => 'PLX-E2E-001',
            'total' => 49900,
        ]);

    // Regla Wompi: la redirección JAMÁS consulta la API de Wompi ni cambia el estado
    Http::assertNothingSent();
    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);

    // ── PASO 3: Wompi envía Webhook oficial transaction.updated (APPROVED) ────
    $timestamp = 1764001200;
    $eventChecksum = hash('sha256', $txId.'APPROVED'.'4990000'.$timestamp.'test_events_e2e_secret');

    $webhookPayload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => $timestamp,
        'sent_at' => '2026-11-24T16:20:00.000Z',
        'data' => [
            'transaction' => [
                'id' => $txId,
                'status' => 'APPROVED',
                'reference' => 'PLX-E2E-001',
                'currency' => 'COP',
                'amount_in_cents' => 4990000,
                'payment_method_type' => 'NEQUI',
            ],
        ],
        'signature' => [
            'properties' => [
                'transaction.id',
                'transaction.status',
                'transaction.amount_in_cents',
            ],
            'checksum' => strtoupper($eventChecksum),
        ],
    ];

    $this->postJson('/api/wompi/webhook', $webhookPayload, [
        'X-Event-Checksum' => $eventChecksum,
    ])->assertOk()->assertJson(['mensaje' => 'Webhook procesado']);

    // Verificar estado final en BD, stock reserva eliminada, carrito vacío y correo enviado
    $pedidoActualizado = $pedido->fresh();
    expect($pedidoActualizado->estado)->toBe(EstadoPedido::PAGADO)
        ->and($pedidoActualizado->wompi_transaction_id)->toBe($txId)
        ->and($pedidoActualizado->wompi_pagado_at)->not->toBeNull();

    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
    $this->assertDatabaseMissing('carritos', ['usuario_id' => $this->cliente->id]);
    Mail::assertSent(PagoConfirmadoMailable::class, 1);

    // ── PASO 4: Reintento duplicado del mismo webhook (idempotencia) ──────────
    $this->postJson('/api/wompi/webhook', $webhookPayload, [
        'X-Event-Checksum' => $eventChecksum,
    ])->assertOk()->assertJson(['mensaje' => 'Evento ya procesado']);

    // No debe duplicar el correo de confirmación
    Mail::assertSent(PagoConfirmadoMailable::class, 1);

    // ── PASO 5: Cliente consulta estado tras el webhook -> ya refleja PAGADO ──
    $this->getJson('/api/pedidos/estado?ref=PLX-E2E-001')
        ->assertOk()
        ->assertJson([
            'estado' => 'pagado',
            'wompi_referencia' => 'PLX-E2E-001',
            'wompi_transaction_id' => $txId,
        ]);
});

test('webhook de ambiente cruzado (prod en sandbox) es ignorado con 200 y no modifica el pedido', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-ENV-CROSS',
        'total' => 25000.00,
    ]);

    $checksum = hash('sha256', 'tx_prod_1'.'APPROVED'.'2500000'.'1764001200'.'test_events_e2e_secret');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'prod', // ambiente distinto al sandbox configurado
        'timestamp' => 1764001200,
        'data' => [
            'transaction' => [
                'id' => 'tx_prod_1',
                'status' => 'APPROVED',
                'reference' => 'PLX-ENV-CROSS',
                'currency' => 'COP',
                'amount_in_cents' => 2500000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertOk()
        ->assertJson(['mensaje' => 'Ambiente ignorado']);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'tx_prod_1:APPROVED',
        'result' => 'rejected_invalid_signature',
    ]);
});

test('webhook maneja con tolerancia tipos de evento no transaccionales como nequi_token.updated', function () {
    $checksum = hash('sha256', 'tok_nequi_123'.'APPROVED'.'1764001300'.'test_events_e2e_secret');

    $payload = [
        'event' => 'nequi_token.updated',
        'environment' => 'test',
        'timestamp' => 1764001300,
        'data' => [
            'token' => [
                'id' => 'tok_nequi_123',
                'status' => 'APPROVED',
            ],
        ],
        'signature' => [
            'properties' => ['token.id', 'token.status'],
            'checksum' => $checksum,
        ],
    ];

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertOk();
});

test('webhook rechaza con 422 si la doble verificacion API S2S reporta moneda o monto distinto', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'wompi_referencia' => 'PLX-S2S-DIFF',
        'total' => 50000.00,
    ]);

    $checksum = hash('sha256', 'tx_s2s_diff'.'APPROVED'.'5000000'.'1764001400'.'test_events_e2e_secret');

    $payload = [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => 1764001400,
        'data' => [
            'transaction' => [
                'id' => 'tx_s2s_diff',
                'status' => 'APPROVED',
                'reference' => 'PLX-S2S-DIFF',
                'currency' => 'COP',
                'amount_in_cents' => 5000000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ];

    // La API directa de Wompi devuelve un monto distinto al esperado
    Http::fake([
        '*/transactions/tx_s2s_diff' => Http::response([
            'data' => [
                'id' => 'tx_s2s_diff',
                'status' => 'APPROVED',
                'reference' => 'PLX-S2S-DIFF',
                'currency' => 'COP',
                'amount_in_cents' => 100000,
            ],
        ], 200),
    ]);

    $this->postJson('/api/wompi/webhook', $payload, ['X-Event-Checksum' => $checksum])
        ->assertStatus(422);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::PENDIENTE_PAGO);
    $this->assertDatabaseHas('wompi_webhook_events', [
        'wompi_event_id' => 'tx_s2s_diff:APPROVED',
        'result' => 'rejected_amount_mismatch',
    ]);
});

test('un usuario no puede generar checkout ni consultar el estado de un pedido ajeno', function () {
    $otroUsuario = Usuario::factory()->create(['correo' => 'otro@plaxtilineas.test']);

    $pedidoAjeno = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::DRAFT,
        'wompi_referencia' => 'PLX-AJENO-001',
        'total' => 30000.00,
    ]);

    Sanctum::actingAs($otroUsuario);

    $this->postJson('/api/wompi/datos-pago', ['pedido_id' => $pedidoAjeno->id])
        ->assertStatus(403);

    $this->getJson('/api/pedidos/estado?ref=PLX-AJENO-001')
        ->assertStatus(404);
});
