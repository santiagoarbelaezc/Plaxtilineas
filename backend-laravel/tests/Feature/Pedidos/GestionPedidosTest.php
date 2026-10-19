<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;
use App\Enums\RolUsuario;
use App\Mail\CambioEstadoPedidoMailable;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
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
