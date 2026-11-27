<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;
use App\Enums\RolUsuario;
use App\Mail\PagoConfirmadoMailable;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->cliente = Usuario::factory()->create([
        'nombre' => 'Cliente',
        'apellidos' => 'Auditoria',
        'correo' => 'auditoria.cliente@plaxtilineas.test',
        'rol' => RolUsuario::CLIENTE->value,
        'email_verificado' => true,
    ]);

    $this->admin = Usuario::factory()->create([
        'nombre' => 'Admin',
        'apellidos' => 'Auditoria',
        'correo' => 'auditoria.admin@plaxtilineas.test',
        'rol' => RolUsuario::ADMIN->value,
        'email_verificado' => true,
    ]);

    config([
        'wompi.env' => 'sandbox',
        'wompi.public_key' => 'pub_test_audit_123',
        'wompi.private_key' => 'prv_test_audit_123',
        'wompi.integrity_secret' => 'audit_integrity_secret_xyz',
        'wompi.events_secret' => 'audit_events_secret_xyz',
        'wompi.redirect_url' => 'https://plaxtilineas.com/perfil?tab=pedidos',
    ]);
});

test('A3: envio a domicilio con subtotal exacto de 49999 es rechazado con 422', function () {
    Sanctum::actingAs($this->cliente);

    $producto = Producto::factory()->create([
        'nombre' => 'Producto Borde 49999',
        'precio' => 49999.00,
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    $this->postJson('/api/pedidos/draft', [
        'tipo_entrega' => 'domicilio',
        'direccion_envio' => 'Cra 19 #19-35',
        'ciudad' => 'Armenia',
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ],
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['tipo_entrega']);
});

test('A5: servidor ignora costo_envio y total manipulados por el cliente', function () {
    Sanctum::actingAs($this->cliente);

    $producto = Producto::factory()->create([
        'nombre' => 'Lona Industrial 50k',
        'precio' => 50000.00,
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    $response = $this->postJson('/api/pedidos/draft', [
        'tipo_entrega' => 'domicilio',
        'direccion_envio' => 'Calle 20 #10-15',
        'ciudad' => 'Armenia',
        // Intento de manipulación desde el cliente:
        'costo_envio' => 0,
        'subtotal' => 100,
        'total' => 100,
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 1, 'precio_unitario' => 100],
        ],
    ]);

    $response->assertStatus(201)
        ->assertJson([
            'tipo_entrega' => 'domicilio',
            'subtotal' => 50000,
            'costo_envio' => 10000,
            'total' => 60000,
        ]);

    $this->assertDatabaseHas('pedidos', [
        'id' => $response->json('pedido_id'),
        'subtotal' => 50000.00,
        'costo_envio' => 10000.00,
        'total' => 60000.00,
    ]);
});

test('A6: tipo_entrega invalido es rechazado con 422', function () {
    Sanctum::actingAs($this->cliente);

    $producto = Producto::factory()->create([
        'precio' => 60000.00,
        'stock' => 5,
        'controlar_stock' => true,
    ]);

    $this->postJson('/api/pedidos/draft', [
        'tipo_entrega' => 'dron_express',
        'direccion_envio' => 'Calle 1 #2-3',
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ],
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['tipo_entrega']);
});

test('A7-A8 + B: flujo E2E Wompi para recogida en tienda (envio 0) genera firma exacta y envia correo de recogida', function () {
    Mail::fake();
    Sanctum::actingAs($this->cliente);

    $producto = Producto::factory()->create([
        'nombre' => 'Pegante Mini 12500',
        'precio' => 12500.00,
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    // 1. Crear draft en recogida_tienda (< 50.000, envío 0)
    $draftRes = $this->postJson('/api/pedidos/draft', [
        'tipo_entrega' => 'recogida_tienda',
        'metodo_pago' => 'wompi',
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ],
    ])->assertStatus(201)
        ->assertJson([
            'tipo_entrega' => 'recogida_tienda',
            'subtotal' => 12500,
            'costo_envio' => 0,
            'total' => 12500,
        ]);

    $pedidoId = (int) $draftRes->json('pedido_id');

    // 2. Generar datos firmados de Wompi
    $datosPago = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedidoId,
    ])->assertOk();

    $ref = (string) $datosPago->json('referencia');
    $expectedSig = hash('sha256', $ref.'1250000'.'COP'.'audit_integrity_secret_xyz');

    $datosPago->assertJson([
        'monto_centavos' => 1250000,
        'moneda' => 'COP',
        'firma_integridad' => $expectedSig,
        'firma' => $expectedSig,
    ]);

    // 3. Simular webhook APPROVED + doble verificación S2S
    $txId = 'tx-audit-recogida-1';
    $timestamp = 1764002000;
    $checksum = hash('sha256', $txId.'APPROVED'.'1250000'.$timestamp.'audit_events_secret_xyz');

    Http::fake([
        "*/transactions/{$txId}" => Http::response([
            'data' => [
                'id' => $txId,
                'status' => 'APPROVED',
                'reference' => $ref,
                'currency' => 'COP',
                'amount_in_cents' => 1250000,
            ],
        ], 200),
    ]);

    $this->postJson('/api/wompi/webhook', [
        'event' => 'transaction.updated',
        'environment' => 'test',
        'timestamp' => $timestamp,
        'data' => [
            'transaction' => [
                'id' => $txId,
                'status' => 'APPROVED',
                'reference' => $ref,
                'currency' => 'COP',
                'amount_in_cents' => 1250000,
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksum,
        ],
    ], ['X-Event-Checksum' => $checksum])->assertOk();

    expect(Pedido::find($pedidoId)?->estado)->toBe(EstadoPedido::PAGADO);

    Mail::assertSent(PagoConfirmadoMailable::class, function (PagoConfirmadoMailable $mail) {
        $html = $mail->content()->htmlString ?? '';

        return $mail->tipoEntrega === 'recogida_tienda'
            && str_contains($html, 'Recogida en tienda')
            && str_contains($html, '$0 COP');
    });
});

test('A7-A8 + B: flujo E2E Wompi para domicilio >= 50000 firma total con envio 10000 incluido', function () {
    Mail::fake();
    Sanctum::actingAs($this->cliente);

    $producto = Producto::factory()->create([
        'nombre' => 'Rollo Espuma 50k',
        'precio' => 50000.00,
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    $draftRes = $this->postJson('/api/pedidos/draft', [
        'tipo_entrega' => 'domicilio',
        'direccion_envio' => 'Av Bolivar #15-20',
        'ciudad' => 'Armenia',
        'metodo_pago' => 'wompi',
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ],
    ])->assertStatus(201);

    $pedidoId = (int) $draftRes->json('pedido_id');

    $datosPago = $this->postJson('/api/wompi/datos-pago', [
        'pedido_id' => $pedidoId,
    ])->assertOk();

    $ref = (string) $datosPago->json('referencia');
    $expectedSig = hash('sha256', $ref.'6000000'.'COP'.'audit_integrity_secret_xyz');

    $datosPago->assertJson([
        'monto_centavos' => 6000000,
        'firma_integridad' => $expectedSig,
    ]);
});

test('B5: recogida en tienda no auto-promueve a en_camino pero exige foto de evidencia para entregado', function () {
    Mail::fake();
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::PAGADO,
        'tipo_entrega' => 'recogida_tienda',
        'costo_envio' => 0,
        'total' => 15000,
    ]);

    // No debe auto-promover a en_camino aunque lleguen transportadora/guia
    $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'en_preparacion',
        'transportadora' => 'Servientrega',
        'guia_numero' => 'GUIA-IGNORADA',
    ])->assertOk()
        ->assertJson([
            'estado_nuevo' => 'en_preparacion',
        ]);

    // Intentar marcar entregado sin foto de evidencia -> 400
    $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'entregado',
    ])->assertStatus(400);

    // Con foto de evidencia -> 200 entregado
    $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'entregado',
        'evidencia_entrega_url' => 'https://res.cloudinary.com/demo/image/upload/evidencia.jpg',
    ])->assertOk()
        ->assertJson([
            'estado_nuevo' => 'entregado',
        ]);
});

test('C: admin eliminar pedido valida rol, palabra clave, estado no pagado y libera reserva', function () {
    $producto = Producto::factory()->create(['stock' => 5, 'controlar_stock' => true]);

    $pedidoPendiente = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'tipo_entrega' => 'recogida_tienda',
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedidoPendiente->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
        'expira_at' => now()->addMinutes(30),
    ]);

    // 1. Cliente normal no puede usar endpoint admin -> 403
    Sanctum::actingAs($this->cliente);
    $this->deleteJson("/api/admin/pedidos/{$pedidoPendiente->id}", [
        'confirmacion' => 'eliminar',
    ])->assertStatus(403);

    // 2. Admin sin palabra de confirmación -> 422
    Sanctum::actingAs($this->admin);
    $this->deleteJson("/api/admin/pedidos/{$pedidoPendiente->id}", [
        'confirmacion' => 'borrar',
    ])->assertStatus(422);

    // 3. Admin intentando eliminar pedido PAGADO -> 400
    $pedidoPagado = Pedido::factory()->create([
        'usuario_id' => $this->cliente->id,
        'estado' => EstadoPedido::PAGADO,
    ]);
    $this->deleteJson("/api/admin/pedidos/{$pedidoPagado->id}", [
        'confirmacion' => 'eliminar',
    ])->assertStatus(400);

    // 4. Admin eliminando pedido pendiente -> 200 y libera StockReserva
    $this->deleteJson("/api/admin/pedidos/{$pedidoPendiente->id}", [
        'confirmacion' => 'eliminar',
    ])->assertOk();

    $this->assertDatabaseMissing('pedidos', ['id' => $pedidoPendiente->id]);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});
