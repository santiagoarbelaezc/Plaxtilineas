<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;
use App\Mail\PagoConfirmadoMailable;
use App\Models\Captcha;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\StockReserva;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

function generarCaptchaTest(string $codigo = 'abcd12'): Captcha
{
    return Captcha::create([
        'id' => (string) Str::uuid(),
        'codigo' => Hash::make(strtolower(trim($codigo))),
        'expires_at' => now()->addMinutes(5),
    ]);
}

beforeEach(function () {
    $this->usuario = Usuario::factory()->create([
        'correo' => 'cliente@example.com',
        'email_verificado' => true,
    ]);
});

test('crear draft exitoso genera pedido con estado draft y crea reservas de stock', function () {
    Sanctum::actingAs($this->usuario);

    $captcha = generarCaptchaTest('ABCD12');

    $producto = Producto::factory()->create([
        'nombre' => 'Mesa Plegable Plastica',
        'precio' => 100000.00,
        'stock' => 10,
        'controlar_stock' => true,
    ]);

    $response = $this->postJson('/api/pedidos/draft', [
        'captchaId' => $captcha->id,
        'captchaCode' => 'ABCD12',
        'direccion_envio' => 'Carrera 15 # 45 - 20',
        'ciudad' => 'Medellín',
        'departamento' => 'Antioquia',
        'telefono_contacto' => '3109876543',
        'metodo_pago' => 'wompi',
        'items' => [
            [
                'producto_id' => $producto->id,
                'cantidad' => 2,
            ],
        ],
    ]);

    $response->assertStatus(201)
        ->assertJson([
            'mensaje' => 'Pedido creado exitosamente.',
            'subtotal' => 200000.00,
            'iva' => 0.00,
            'costo_envio' => 10000.00,
            'total' => 210000.00,
            'estado' => 'draft',
        ]);

    $pedidoId = $response->json('pedido_id');

    $this->assertDatabaseHas('pedidos', [
        'id' => $pedidoId,
        'usuario_id' => $this->usuario->id,
        'estado' => 'draft',
        'total' => 210000.00,
    ]);

    $this->assertDatabaseHas('pedido_items', [
        'pedido_id' => $pedidoId,
        'producto_id' => $producto->id,
        'cantidad' => 2,
    ]);

    $this->assertDatabaseHas('stock_reservas', [
        'pedido_id' => $pedidoId,
        'producto_id' => $producto->id,
        'cantidad' => 2,
    ]);

    // En draft, el stock real aún no se deduce (Two-Phase Commit)
    expect($producto->fresh()->stock)->toBe(10);
});

test('crear draft offline descuenta stock real y envia correo de confirmacion', function () {
    Mail::fake();
    Sanctum::actingAs($this->usuario);

    $captcha = generarCaptchaTest('ABCD12');

    $producto = Producto::factory()->create([
        'nombre' => 'Silla Plastica Jardin',
        'precio' => 50000.00,
        'stock' => 5,
        'controlar_stock' => true,
    ]);

    $response = $this->postJson('/api/pedidos/draft', [
        'captchaId' => $captcha->id,
        'captchaCode' => 'ABCD12',
        'direccion_envio' => 'Calle 100 # 20 - 10',
        'metodo_pago' => 'contraentrega',
        'items' => [
            [
                'producto_id' => $producto->id,
                'cantidad' => 2,
            ],
        ],
    ]);

    $response->assertStatus(201)
        ->assertJson([
            'estado' => 'pendiente_pago',
        ]);

    expect($producto->fresh()->stock)->toBe(3);

    Mail::assertSent(PagoConfirmadoMailable::class, function ($mail) {
        return $mail->hasTo('cliente@example.com');
    });
});

test('validacion falla si faltan items o direccion', function () {
    Sanctum::actingAs($this->usuario);

    $captcha = generarCaptchaTest('ABCD12');

    $response = $this->postJson('/api/pedidos/draft', [
        'captchaId' => $captcha->id,
        'captchaCode' => 'ABCD12',
        'items' => [],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['items', 'direccion_envio']);
});

test('validacion falla si captcha es invalido o expirado', function () {
    Sanctum::actingAs($this->usuario);

    $response = $this->postJson('/api/pedidos/draft', [
        'captchaId' => 'no-existe-id',
        'captchaCode' => 'INCORRECTO',
        'direccion_envio' => 'Calle 50 # 10 - 20',
        'items' => [
            ['producto_id' => 1, 'cantidad' => 1],
        ],
    ]);

    $response->assertStatus(400)
        ->assertJson([
            'error' => 'El código captcha ha expirado o es incorrecto. Intenta nuevamente.',
        ]);
});

test('cliente no puede tener 2 o mas pedidos pendientes simultaneos', function () {
    Sanctum::actingAs($this->usuario);

    $captcha = generarCaptchaTest('ABCD12');

    Pedido::factory()->count(2)->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::DRAFT,
    ]);

    $producto = Producto::factory()->create();

    $response = $this->postJson('/api/pedidos/draft', [
        'captchaId' => $captcha->id,
        'captchaCode' => 'ABCD12',
        'direccion_envio' => 'Calle 1 # 2 - 3',
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ],
    ]);

    $response->assertStatus(403)
        ->assertJson([
            'error' => 'Tienes 2 o más pedidos pendientes. Por favor completa el pago o cancela uno antes de intentar crear otro pedido nuevo.',
        ]);
});

test('intento de reservar mas stock del disponible considerando reservas activas retorna 400', function () {
    Sanctum::actingAs($this->usuario);

    $captcha = generarCaptchaTest('ABCD12');

    $producto = Producto::factory()->create([
        'nombre' => 'Tarro Hermético 5L',
        'stock' => 5,
        'controlar_stock' => true,
    ]);

    $otroPedido = Pedido::factory()->create(['estado' => EstadoPedido::DRAFT]);

    StockReserva::create([
        'pedido_id' => $otroPedido->id,
        'producto_id' => $producto->id,
        'cantidad' => 3,
        'expira_at' => now()->addMinutes(20),
    ]);

    // Quedan 2 disponibles (5 - 3). Pedimos 4.
    $response = $this->postJson('/api/pedidos/draft', [
        'captchaId' => $captcha->id,
        'captchaCode' => 'ABCD12',
        'direccion_envio' => 'Av Siempre Viva 742',
        'items' => [
            ['producto_id' => $producto->id, 'cantidad' => 4],
        ],
    ]);

    $response->assertStatus(400)
        ->assertJson([
            'error' => 'Stock insuficiente para "Tarro Hermético 5L". Disponible: 2, solicitado: 4.',
        ]);
});

test('limpia pedidos no confirmados después de 30 minutos y libera sus reservas', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::DRAFT,
        'fecha' => now()->subMinutes(31),
    ]);
    $pedido->items()->create([
        'producto_id' => 999,
        'nombre_producto' => 'Producto reservado',
        'cantidad' => 2,
        'precio_unitario' => 100,
        'subtotal' => 200,
    ]);
    StockReserva::create([
        'pedido_id' => $pedido->id,
        'producto_id' => 999,
        'cantidad' => 2,
        'creado_at' => now()->subMinutes(31),
        'expira_at' => now()->addMinutes(10),
    ]);

    Http::fake([
        '*' => Http::response(['success' => true], 200),
    ]);

    $this->artisan('pedidos:limpiar-expirados')
        ->expectsOutput('Limpieza completada: 1 pedidos eliminados y 1 reservas liberadas.')
        ->assertSuccessful();

    $this->assertDatabaseMissing('pedidos', ['id' => $pedido->id]);
    $this->assertDatabaseMissing('pedido_items', ['pedido_id' => $pedido->id]);
    $this->assertDatabaseMissing('stock_reservas', ['pedido_id' => $pedido->id]);
});

test('conserva pedidos pagados y confirmados aunque tengan más de 30 minutos', function () {
    $pagado = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PAGADO,
        'fecha' => now()->subMinutes(31),
    ]);
    $confirmado = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::CONFIRMADO,
        'fecha' => now()->subMinutes(31),
    ]);

    $this->artisan('pedidos:limpiar-expirados')->assertSuccessful();

    $this->assertDatabaseHas('pedidos', ['id' => $pagado->id, 'estado' => 'pagado']);
    $this->assertDatabaseHas('pedidos', ['id' => $confirmado->id, 'estado' => 'confirmado']);
});

test('conserva pedidos pendientes que todavía tienen menos de 30 minutos', function () {
    $pedido = Pedido::factory()->create([
        'usuario_id' => $this->usuario->id,
        'estado' => EstadoPedido::PENDIENTE_PAGO,
        'fecha' => now()->subMinutes(29),
    ]);

    $this->artisan('pedidos:limpiar-expirados')->assertSuccessful();

    $this->assertDatabaseHas('pedidos', [
        'id' => $pedido->id,
        'estado' => 'pendiente_pago',
    ]);
});
