<?php

declare(strict_types=1);

use App\Contracts\MediaStorageInterface;
use App\Enums\EstadoPedido;
use App\Enums\RolUsuario;
use App\Mail\CambioEstadoPedidoMailable;
use App\Mail\PagoConfirmadoMailable;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'correo' => 'cliente@test.com',
        'rol' => RolUsuario::CLIENTE->value,
    ]);

    $this->admin = Usuario::factory()->create([
        'correo' => 'admin@test.com',
        'rol' => RolUsuario::ADMIN->value,
    ]);
});

test('verifica stock disponible antes de iniciar checkout', function () {
    Http::fake([
        '*' => Http::response([
            'success' => true,
            'data' => [
                'id' => 501,
                'name' => 'Producto de prueba',
                'stock' => 13,
                'price' => 15000,
                'variants' => [],
            ],
        ], 200),
    ]);
    Sanctum::actingAs($this->usuario);

    $response = $this->postJson('/api/productos/verificar-stock', [
        'items' => [
            ['producto_id' => 501, 'cantidad' => 13],
        ],
    ]);

    $response->assertOk()->assertJson([
        'valido' => true,
        'items_con_error' => [],
    ]);
});

test('verifica stock permite pagar las ultimas unidades ya reservadas en el carrito del propio usuario', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create([
        'nombre' => 'Lona Ultima Unidad',
        'precio' => 45000,
        'stock' => 2,
        'controlar_stock' => true,
    ]);

    // 1. El usuario agrega las 2 últimas unidades a su carrito (stock libre pasa a 0)
    $this->postJson('/api/carrito/sync', [
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 2, 'precio_unitario' => 45000],
        ],
    ])->assertOk();

    expect($producto->fresh()->stock)->toBe(0);

    // 2. Al verificar stock para ir a pagar, debe aprobar porque las 2 unidades ya son de su carrito
    $this->postJson('/api/productos/verificar-stock', [
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 2],
        ],
    ])->assertOk()->assertJson([
        'valido' => true,
        'items_con_error' => [],
    ]);
});

test('reporta stock insuficiente sin fallar la petición', function () {
    Http::fake([
        '*' => Http::response([
            'success' => true,
            'data' => [
                'id' => 502,
                'name' => 'Producto agotado',
                'stock' => 13,
                'variants' => [],
            ],
        ], 200),
    ]);
    Sanctum::actingAs($this->usuario);

    $response = $this->postJson('/api/productos/verificar-stock', [
        'items' => [
            ['producto_id' => 502, 'cantidad' => 14],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('valido', false)
        ->assertJsonPath('items_con_error.0.stock_disponible', 13)
        ->assertJsonPath('items_con_error.0.cantidad_solicitada', 14);
});

test('obtener mis pedidos devuelve lista sin incluir borradores draft', function () {
    Sanctum::actingAs($this->usuario);

    // Pedido en draft (no debe aparecer)
    Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::DRAFT,
    ]);

    // Pedido pagado (debe aparecer)
    $pedidoPagado = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
        'codigo_pedido' => 'PX-2026-0001',
    ]);

    PedidoItem::create([
        'pedido_id' => $pedidoPagado->id,
        'producto_id' => Producto::factory()->create()->id,
        'nombre_producto' => 'Caja 30L',
        'cantidad' => 2,
        'precio_unitario' => 20000,
        'subtotal' => 40000,
    ]);

    $response = $this->getJson('/api/pedidos/mis-pedidos');

    $response->assertOk()
        ->assertJson([
            'total_pedidos' => 1,
            'pedidos' => [
                [
                    'codigo_pedido' => 'PX-2026-0001',
                    'estado' => 'pagado',
                    'total_items' => 2,
                ],
            ],
        ]);
});

test('verificar estado por ref devuelve estado actual del pedido', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'wompi_referencia' => 'PLX-TEST-123',
        'estado' => EstadoPedido::CONFIRMADO,
        'total' => 75000.00,
    ]);

    $response = $this->getJson('/api/pedidos/estado?ref=PLX-TEST-123');

    $response->assertOk()
        ->assertJson([
            'estado' => 'confirmado',
            'codigo_pedido' => $pedido->codigo_pedido,
            'total' => 75000.00,
        ]);
});

test('cliente cancela su propio pedido pendiente liberando reservas de stock', function () {
    Sanctum::actingAs($this->usuario);

    $producto = Producto::factory()->create();

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
    ]);

    $reserva = StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
        'expira_at' => now()->addMinutes(30),
    ]);

    $response = $this->postJson("/api/pedidos/{$pedido->id}/cancelar");

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Pedido cancelado correctamente.',
        ]);

    expect($pedido->fresh()->estado)->toBe(EstadoPedido::CANCELADO);
    $this->assertDatabaseMissing('stock_reservas', ['id' => $reserva->id]);
});

test('cliente no puede cancelar pedido ya pagado o en proceso', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
    ]);

    $response = $this->postJson("/api/pedidos/{$pedido->id}/cancelar");

    $response->assertStatus(400)
        ->assertJson([
            'error' => 'No puedes cancelar un pedido que ya ha sido pagado o procesado.',
        ]);
});

test('cliente puede eliminar pedido no pagado', function () {
    Sanctum::actingAs($this->usuario);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE,
    ]);

    $response = $this->deleteJson("/api/pedidos/{$pedido->id}");

    $response->assertOk()
        ->assertJson([
            'mensaje' => 'Pedido eliminado correctamente.',
        ]);

    $this->assertDatabaseMissing('pedidos', ['id' => $pedido->id]);
});

test('admin obtiene listado de todos los pedidos y estadisticas', function () {
    Sanctum::actingAs($this->admin);

    Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
        'total' => 100000.00,
    ]);

    Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::ENTREGADO,
        'total' => 50000.00,
    ]);

    $response = $this->getJson('/api/admin/pedidos');

    $response->assertOk()
        ->assertJsonStructure([
            'pedidos',
            'estadisticas' => [
                'total_pedidos',
                'ingresos_totales',
                'pedidos_activos',
                'pedidos_entregados',
                'pedidos_cancelados',
            ],
        ]);

    expect($response->json('estadisticas.ingresos_totales'))->toEqual(150000)
        ->and($response->json('estadisticas.pedidos_entregados'))->toBe(1);
});

test('admin actualiza estado de pedido y notifica al cliente con transportadora y guia', function () {
    Mail::fake();
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'email_cliente' => 'cliente@test.com',
        'estado' => EstadoPedido::PAGADO,
    ]);

    $response = $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'en_camino',
        'transportadora' => 'Servientrega',
        'guia_numero' => 'SER123456789',
    ]);

    $response->assertOk()
        ->assertJson([
            'estado_anterior' => 'pagado',
            'estado_nuevo' => 'en_camino',
        ]);

    expect($pedido->fresh()->guia_numero)->toBe('SER123456789')
        ->and($pedido->fresh()->fecha_envio)->not->toBeNull();

    Mail::assertSent(CambioEstadoPedidoMailable::class, function ($mail) {
        return $mail->hasTo('cliente@test.com');
    });
});

test('admin no puede cambiar pedido pagado a estado pendiente', function () {
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
    ]);

    $response = $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'pendiente',
    ]);

    $response->assertStatus(400)
        ->assertJson([
            'error' => 'No puedes cambiar un pedido pagado a estado pendiente.',
        ]);
});

test('admin elimina un pedido pendiente con confirmacion textual', function () {
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE,
    ]);

    $response = $this->deleteJson("/api/admin/pedidos/{$pedido->id}", [
        'confirmacion' => 'eliminar',
    ]);

    $response->assertOk()->assertJson([
        'mensaje' => 'Pedido eliminado correctamente.',
    ]);
    $this->assertDatabaseMissing('pedidos', ['id' => $pedido->id]);
});

test('admin no elimina pedido pendiente sin confirmacion exacta', function () {
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE,
    ]);

    $this->deleteJson("/api/admin/pedidos/{$pedido->id}", [
        'confirmacion' => 'borrar',
    ])->assertStatus(422);

    $this->assertDatabaseHas('pedidos', ['id' => $pedido->id]);
});

test('admin no elimina pedido con pago confirmado', function () {
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
    ]);

    $this->deleteJson("/api/admin/pedidos/{$pedido->id}", [
        'confirmacion' => 'eliminar',
    ])->assertStatus(400);

    $this->assertDatabaseHas('pedidos', ['id' => $pedido->id]);
});

test('admin sube evidencia fotografica y al asignar transportadora y guia avanza automaticamente de pagado a en_camino', function () {
    Mail::fake();
    Sanctum::actingAs($this->admin);

    $mediaMock = Mockery::mock(MediaStorageInterface::class);
    $mediaMock->shouldReceive('upload')
        ->once()
        ->andReturn([
            'url' => 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_envio/foto_guia.jpg',
            'public_id' => 'plaxtilineas/evidencias_envio/foto_guia',
        ]);
    $this->app->instance(MediaStorageInterface::class, $mediaMock);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
        'subtotal' => 98000,
        'costo_envio' => 10000,
        'total' => 108000,
    ]);

    // 1. Subir foto de evidencia a Cloudinary (PNG válido 1x1 sin depender de la extensión GD)
    $png1x1 = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    $file = UploadedFile::fake()->createWithContent('guia.png', $png1x1);
    $uploadRes = $this->post("/api/admin/pedidos/{$pedido->id}/evidencia-envio", [
        'evidencia' => $file,
    ]);

    $uploadRes->assertOk()
        ->assertJsonPath('evidencia_envio_url', 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_envio/foto_guia.jpg');

    // 2. Guardar transportadora + guía (aun enviando estado='pagado', debe promover automáticamente a 'en_camino')
    $updateRes = $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'pagado',
        'transportadora' => 'Domicilio Plaxtilineas (Armenia)',
        'guia_numero' => '98393894384928492',
        'evidencia_envio_url' => 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_envio/foto_guia.jpg',
    ]);

    $updateRes->assertOk()
        ->assertJson([
            'estado_anterior' => 'pagado',
            'estado_nuevo' => 'en_camino',
        ]);

    $pedidoFresh = $pedido->fresh();
    expect($pedidoFresh->estado)->toBe(EstadoPedido::EN_CAMINO)
        ->and($pedidoFresh->transportadora)->toBe('Domicilio Plaxtilineas (Armenia)')
        ->and($pedidoFresh->guia_numero)->toBe('98393894384928492')
        ->and($pedidoFresh->evidencia_envio_url)->toBe('https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_envio/foto_guia.jpg')
        ->and($pedidoFresh->fecha_envio)->not->toBeNull();

    // 3. Verificar correo enviado con etiquetas legibles y botón de evidencia (nunca "de pagado a pagado")
    Mail::assertSent(CambioEstadoPedidoMailable::class, function (CambioEstadoPedidoMailable $mail) {
        $html = $mail->content()->htmlString ?? '';

        return $mail->hasTo('cliente@test.com')
            && str_contains($html, 'Pago Confirmado')
            && str_contains($html, 'En Camino')
            && str_contains($html, 'Ver foto de evidencia del envío')
            && ! str_contains($html, 'De pagado a pagado');
    });

    // 4. Verificar que el cliente también recibe el estado en_camino y la foto en /api/pedidos/mis-pedidos
    Sanctum::actingAs($this->usuario);
    $this->getJson('/api/pedidos/mis-pedidos')
        ->assertOk()
        ->assertJsonPath('pedidos.0.estado', 'en_camino')
        ->assertJsonPath('pedidos.0.transportadora', 'Domicilio Plaxtilineas (Armenia)')
        ->assertJsonPath('pedidos.0.guia_numero', '98393894384928492')
        ->assertJsonPath('pedidos.0.evidencia_envio_url', 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_envio/foto_guia.jpg');
});

test('editar guia cuando ya esta en_camino envia correo de actualizacion de envio sin repetir estado', function () {
    Mail::fake();
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::EN_CAMINO,
        'transportadora' => 'Servientrega',
        'guia_numero' => '111111',
    ]);

    $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'en_camino',
        'transportadora' => 'Servientrega',
        'guia_numero' => '222222',
    ])->assertOk();

    Mail::assertSent(CambioEstadoPedidoMailable::class, function (CambioEstadoPedidoMailable $mail) {
        $html = $mail->content()->htmlString ?? '';

        return str_contains($html, 'Se han actualizado los datos de envío')
            && str_contains($html, 'En Camino')
            && ! str_contains($html, 'De En Camino a En Camino');
    });
});

test('admin no puede marcar pedido en_camino como entregado sin evidencia fotografica de entrega', function () {
    Sanctum::actingAs($this->admin);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::EN_CAMINO,
        'transportadora' => 'Servientrega',
        'guia_numero' => 'SRV-123456',
    ]);

    $response = $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'entregado',
    ]);

    $response->assertStatus(400);
    expect($pedido->fresh()->estado)->toBe(EstadoPedido::EN_CAMINO);
});

test('admin sube evidencia fotografica de entrega y marca pedido en_camino como entregado', function () {
    Mail::fake();
    Sanctum::actingAs($this->admin);

    $mediaMock = Mockery::mock(MediaStorageInterface::class);
    $mediaMock->shouldReceive('upload')
        ->once()
        ->andReturn([
            'url' => 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_entrega/recibido.png',
            'public_id' => 'plaxtilineas/evidencias_entrega/recibido',
        ]);
    $this->app->instance(MediaStorageInterface::class, $mediaMock);

    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::EN_CAMINO,
        'transportadora' => 'Domicilio Plaxtilineas (Armenia)',
        'guia_numero' => '98393894384928492',
    ]);

    $png1x1 = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    $file = UploadedFile::fake()->createWithContent('recibido.png', $png1x1);

    $uploadRes = $this->post("/api/admin/pedidos/{$pedido->id}/evidencia-entrega", [
        'evidencia' => $file,
    ]);

    $uploadRes->assertOk()
        ->assertJsonPath('evidencia_entrega_url', 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_entrega/recibido.png');

    $updateRes = $this->putJson("/api/admin/pedidos/{$pedido->id}/estado", [
        'estado' => 'entregado',
        'evidencia_entrega_url' => 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_entrega/recibido.png',
    ]);

    $updateRes->assertOk()
        ->assertJson([
            'estado_anterior' => 'en_camino',
            'estado_nuevo' => 'entregado',
        ]);

    $pedidoFresh = $pedido->fresh();
    expect($pedidoFresh->estado)->toBe(EstadoPedido::ENTREGADO)
        ->and($pedidoFresh->evidencia_entrega_url)->toBe('https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_entrega/recibido.png')
        ->and($pedidoFresh->fecha_entrega)->not->toBeNull();

    Mail::assertSent(CambioEstadoPedidoMailable::class, function (CambioEstadoPedidoMailable $mail) {
        $html = $mail->content()->htmlString ?? '';

        return str_contains($html, 'En Camino')
            && str_contains($html, 'Entregado')
            && str_contains($html, 'Ver foto de evidencia de la entrega')
            && str_contains($html, 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_entrega/recibido.png');
    });

    Sanctum::actingAs($this->usuario);
    $misPedidosRes = $this->getJson('/api/pedidos/mis-pedidos');
    $misPedidosRes->assertOk()
        ->assertJsonPath('pedidos.0.estado', 'entregado')
        ->assertJsonPath('pedidos.0.evidencia_entrega_url', 'https://res.cloudinary.com/demo/image/upload/v1/plaxtilineas/evidencias_entrega/recibido.png');
});

test('factura de compra por correo incluye cedula o NIT del cliente y mis-pedidos la expone', function () {
    $this->usuario->update([
        'tipo_documento' => 'CC',
        'numero_documento' => '1094912345',
    ]);

    $mailable = new PagoConfirmadoMailable(
        nombreCliente: $this->usuario->nombre,
        codigoPedido: 'PX-2026-9999',
        detalles: [
            [
                'nombre_producto' => 'Soga Marinera',
                'cantidad' => 2,
                'precio_unitario' => 49000,
                'subtotal' => 98000,
            ],
        ],
        subtotal: 98000,
        iva: 0,
        costoEnvio: 10000,
        total: 108000,
        tipoDocumento: $this->usuario->tipo_documento,
        numeroDocumento: $this->usuario->numero_documento,
    );

    $html = $mailable->content()->htmlString ?? '';
    expect($html)->toContain('Identificación (C.C.):')
        ->and($html)->toContain('1094912345');

    Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
    ]);

    Sanctum::actingAs($this->usuario);
    $this->getJson('/api/pedidos/mis-pedidos')
        ->assertOk()
        ->assertJsonPath('pedidos.0.cliente_tipo_documento', 'CC')
        ->assertJsonPath('pedidos.0.cliente_numero_documento', '1094912345');
});
