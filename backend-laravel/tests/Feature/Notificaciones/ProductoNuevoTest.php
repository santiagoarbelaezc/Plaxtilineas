<?php

declare(strict_types=1);

use App\Mail\ProductoNuevoMailable;
use App\Models\NotificacionProducto;
use App\Models\Usuario;
use Illuminate\Support\Facades\Mail;

const SECRETO_TEST = 'secreto_de_prueba_notificaciones';

beforeEach(function () {
    config([
        'services.catalogo.webhook_secret' => SECRETO_TEST,
        'services.catalogo.notificaciones_activas' => true,
        'services.catalogo.origin' => 'https://plaxtilineas.com',
    ]);
});

/**
 * @param  array<string, mixed>  $payload
 * @return array<string, mixed>
 */
function enviarFirmado(mixed $test, array $payload, ?int $timestamp = null, ?string $secreto = null)
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $ts = (string) ($timestamp ?? time());
    $firma = hash_hmac('sha256', $ts.'.'.$body, $secreto ?? SECRETO_TEST);

    return $test->call(
        'POST',
        '/api/notificaciones/producto-nuevo',
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_CATALOGO_TIMESTAMP' => $ts,
            'HTTP_X_CATALOGO_SIGNATURE' => $firma,
        ],
        $body
    );
}

function payloadProducto(int $id = 245): array
{
    return ['producto' => [
        'id' => $id,
        'nombre' => 'Malla Pajarito Metálica',
        'descripcion' => 'Malla resistente',
        'imagen_url' => 'https://res.cloudinary.com/demo/malla.png',
        'precio' => 16500,
        'unidad' => 'und',
        'categoria' => 'Mallas',
    ]];
}

function crearCliente(array $attrs = []): Usuario
{
    return Usuario::factory()->create(array_merge([
        'rol' => 'cliente',
        'email_verificado' => true,
        'acepta_novedades' => true,
    ], $attrs));
}

test('rechaza peticiones sin firma', function () {
    $this->postJson('/api/notificaciones/producto-nuevo', payloadProducto())
        ->assertStatus(401);
});

test('rechaza firma incorrecta', function () {
    enviarFirmado($this, payloadProducto(), null, 'otro_secreto')->assertStatus(401);
});

test('rechaza timestamp vencido', function () {
    enviarFirmado($this, payloadProducto(), time() - 3600)->assertStatus(401);
});

test('falla cerrado si el secreto no esta configurado', function () {
    config(['services.catalogo.webhook_secret' => '']);

    enviarFirmado($this, payloadProducto())->assertStatus(503);
});

test('valida el payload', function () {
    enviarFirmado($this, ['producto' => ['nombre' => 'sin id']])->assertStatus(422);
});

test('acepta producto nuevo y envia solo a clientes elegibles', function () {
    Mail::fake();

    $elegible = crearCliente(['correo' => 'ok@example.com']);
    crearCliente(['correo' => 'baja@example.com', 'acepta_novedades' => false]);
    crearCliente(['correo' => 'sinverificar@example.com', 'email_verificado' => false]);
    crearCliente(['correo' => 'admin@example.com', 'rol' => 'admin']);

    enviarFirmado($this, payloadProducto())
        ->assertStatus(202)
        ->assertJson(['aceptada' => true]);

    Mail::assertSent(ProductoNuevoMailable::class, 1);
    Mail::assertSent(ProductoNuevoMailable::class, fn ($m) => $m->hasTo('ok@example.com'));

    $notificacion = NotificacionProducto::query()->where('producto_id', 245)->firstOrFail();
    expect($notificacion->estado)->toBe('completada')
        ->and($notificacion->total_destinatarios)->toBe(1)
        ->and($notificacion->enviados)->toBe(1);

    expect($elegible->fresh()->token_baja)->not->toBeEmpty();
});

test('es idempotente: el mismo producto no se notifica dos veces', function () {
    Mail::fake();
    crearCliente(['correo' => 'ok@example.com']);

    enviarFirmado($this, payloadProducto())->assertStatus(202);
    enviarFirmado($this, payloadProducto())
        ->assertStatus(200)
        ->assertJson(['duplicada' => true]);

    Mail::assertSent(ProductoNuevoMailable::class, 1);
    expect(NotificacionProducto::query()->count())->toBe(1);
});

test('el interruptor de apagado evita el envio', function () {
    Mail::fake();
    crearCliente(['correo' => 'ok@example.com']);
    config(['services.catalogo.notificaciones_activas' => false]);

    enviarFirmado($this, payloadProducto())->assertStatus(202)->assertJson(['aceptada' => false]);

    Mail::assertNothingSent();
    expect(NotificacionProducto::query()->count())->toBe(0);
});

test('el enlace de baja desactiva las novedades', function () {
    $cliente = crearCliente(['correo' => 'ok@example.com', 'token_baja' => str_repeat('a', 48)]);

    $this->get('/api/notificaciones/baja/'.str_repeat('a', 48))->assertOk();

    expect($cliente->fresh()->acepta_novedades)->toBeFalse();
});

test('el enlace de baja con token invalido responde 404', function () {
    $this->get('/api/notificaciones/baja/'.str_repeat('z', 48))->assertStatus(404);
});
