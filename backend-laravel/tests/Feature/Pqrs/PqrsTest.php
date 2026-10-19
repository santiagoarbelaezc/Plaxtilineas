<?php

declare(strict_types=1);

use App\Contracts\MediaStorageInterface;
use App\Enums\EstadoPqr;
use App\Enums\TipoPqr;
use App\Mail\ConfirmacionCreacionPQRMailable;
use App\Mail\NotificacionRespuestaPQRMailable;
use App\Models\Pqr;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

beforeEach(function () {
    Mail::fake();
});

test('un usuario anonimo puede crear una PQR exitosamente y recibe emails', function () {
    $payload = [
        'nombre_completo' => 'Carlos Rodriguez',
        'email' => 'carlos@example.com',
        'telefono' => '3001234567',
        'tipo' => 'PETICION',
        'descripcion' => 'Quisiera saber si tienen disponibilidad para entrega inmediata de malla plástica.',
    ];

    $response = $this->postJson('/api/pqrs', $payload);

    $response->assertStatus(201)
        ->assertJson([
            'success' => true,
            'mensaje' => 'PQR creada exitosamente',
        ])
        ->assertJsonStructure([
            'success',
            'mensaje',
            'pqr' => [
                'id',
                'numero_ticket',
                'tipo',
                'estado',
            ],
        ]);

    $ticket = $response->json('pqr.numero_ticket');
    $this->assertDatabaseHas('pqrs', [
        'numero_ticket' => $ticket,
        'email' => 'carlos@example.com',
        'tipo' => 'PETICION',
    ]);

    Mail::assertSent(ConfirmacionCreacionPQRMailable::class, function ($mail) {
        return $mail->hasTo('carlos@example.com');
    });
});

test('falla la creacion de PQR si faltan campos obligatorios', function () {
    $response = $this->postJson('/api/pqrs', [
        'nombre_completo' => 'Carlos',
    ]);

    $response->assertStatus(422)
        ->assertJsonStructure(['error']);
});

test('un usuario puede subir archivos adjuntos al crear una PQR', function () {
    $mockStorage = Mockery::mock(MediaStorageInterface::class);
    $mockStorage->shouldReceive('upload')
        ->once()
        ->andReturn([
            'public_id' => 'pqr/adjunto_test',
            'url' => 'https://res.cloudinary.com/test/image.jpg',
            'secure_url' => 'https://res.cloudinary.com/test/image.jpg',
            'format' => 'jpg',
            'bytes' => 1024,
        ]);
    $this->app->instance(MediaStorageInterface::class, $mockStorage);

    $file = UploadedFile::fake()->image('factura.jpg');

    $response = $this->post('/api/pqrs', [
        'nombre_completo' => 'Maria Lopez',
        'email' => 'maria@example.com',
        'telefono' => '3119876543',
        'tipo' => 'RECLAMO',
        'descripcion' => 'Adjunto evidencia fotográfica del producto recibido con rotura.',
        'archivos' => [$file],
    ], [
        'Accept' => 'application/json',
    ]);

    $response->assertStatus(201)
        ->assertJson(['success' => true]);

    $pqrId = $response->json('pqr.id');
    $this->assertDatabaseHas('pqr_archivos', [
        'pqr_id' => $pqrId,
        'nombre_archivo' => 'factura.jpg',
        'url_archivo' => 'https://res.cloudinary.com/test/image.jpg',
    ]);
});

test('un usuario puede consultar el estado de su PQR por numero de ticket o UUID', function () {
    $uuid = (string) Str::uuid();
    $pqr = Pqr::create([
        'id' => $uuid,
        'numero_ticket' => 'PQR-261019-777',
        'nombre_completo' => 'Juan Perez',
        'email' => 'juan@example.com',
        'telefono' => '3150000000',
        'tipo' => TipoPqr::QUEJA,
        'descripcion' => 'El pedido no ha llegado en el tiempo indicado.',
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    $responseTicket = $this->getJson('/api/pqrs/consulta/PQR-261019-777');
    $responseTicket->assertStatus(200)
        ->assertJson([
            'success' => true,
            'pqr' => [
                'numero_ticket' => 'PQR-261019-777',
                'nombre_completo' => 'Juan Perez',
                'descripcion' => 'El pedido no ha llegado en el tiempo indicado.',
                'estado' => 'PENDIENTE',
            ],
        ]);

    $responseUuid = $this->getJson("/api/pqrs/consulta/{$uuid}");
    $responseUuid->assertStatus(200)
        ->assertJsonPath('pqr.id', $uuid);
});

test('solo administradores pueden listar todas las PQRs', function () {
    Pqr::create([
        'id' => (string) Str::uuid(),
        'numero_ticket' => 'PQR-261019-001',
        'nombre_completo' => 'Test User',
        'email' => 'test@example.com',
        'telefono' => '3000000000',
        'tipo' => TipoPqr::PETICION,
        'descripcion' => 'Test mensaje',
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    // Anónimo
    $this->getJson('/api/pqrs')->assertStatus(401);

    // Cliente regular
    $cliente = Usuario::factory()->cliente()->create();
    $this->actingAs($cliente)->getJson('/api/pqrs')->assertStatus(403);

    // Admin
    $admin = Usuario::factory()->admin()->create();
    $response = $this->actingAs($admin)->getJson('/api/pqrs');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data',
            'paginacion' => ['total', 'pagina_actual', 'total_paginas', 'por_pagina'],
        ]);
});

test('el admin puede obtener estadisticas y ultimas PQRs', function () {
    $admin = Usuario::factory()->admin()->create();

    Pqr::create([
        'id' => (string) Str::uuid(),
        'numero_ticket' => 'PQR-261019-002',
        'nombre_completo' => 'Test User 2',
        'email' => 'test2@example.com',
        'telefono' => '3000000002',
        'tipo' => TipoPqr::SUGERENCIA,
        'descripcion' => 'Muy buena atención al cliente.',
        'estado' => EstadoPqr::RESUELTO,
    ]);

    $responseStats = $this->actingAs($admin)->getJson('/api/pqrs/estadisticas');
    $responseStats->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'estadisticas' => [
                'total',
                'pendientes',
                'en_proceso',
                'resueltos',
                'cerrados',
            ],
            'por_tipo',
        ]);

    $responseUltimas = $this->actingAs($admin)->getJson('/api/pqrs/ultimas');
    $responseUltimas->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data',
        ]);
});

test('el admin puede buscar PQRs por termino', function () {
    $admin = Usuario::factory()->admin()->create();

    Pqr::create([
        'id' => (string) Str::uuid(),
        'numero_ticket' => 'PQR-261019-999',
        'nombre_completo' => 'Bernardo O Higgins',
        'email' => 'bernardo@example.com',
        'telefono' => '3009999999',
        'tipo' => TipoPqr::PETICION,
        'descripcion' => 'Consulta especial de productos agricolas',
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/pqrs/buscar?q=Bernardo');
    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);
    expect($response->json('data'))->toHaveCount(1);
});

test('el admin puede actualizar el estado de una PQR', function () {
    $admin = Usuario::factory()->admin()->create();

    $pqr = Pqr::create([
        'id' => (string) Str::uuid(),
        'numero_ticket' => 'PQR-261019-003',
        'nombre_completo' => 'Pedro Castillo',
        'email' => 'pedro@example.com',
        'telefono' => '3003333333',
        'tipo' => TipoPqr::RECLAMO,
        'descripcion' => 'Recibí un artículo diferente.',
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    $response = $this->actingAs($admin)->putJson("/api/pqrs/{$pqr->id}/estado", [
        'estado' => 'EN_PROCESO',
        'mensaje_respuesta' => 'Estamos verificando su solicitud con despacho.',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'mensaje' => 'Estado de PQR actualizado correctamente',
        ]);

    $this->assertDatabaseHas('pqrs', [
        'id' => $pqr->id,
        'estado' => 'EN_PROCESO',
    ]);
});

test('el admin puede responder una PQR y notifica por email al cliente', function () {
    $admin = Usuario::factory()->admin()->create();

    $pqr = Pqr::create([
        'id' => (string) Str::uuid(),
        'numero_ticket' => 'PQR-261019-004',
        'nombre_completo' => 'Sofia Ramirez',
        'email' => 'sofia@example.com',
        'telefono' => '3004444444',
        'tipo' => TipoPqr::PETICION,
        'descripcion' => 'Solicito cotización de 50 rollos de plástico negro.',
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    $response = $this->actingAs($admin)->postJson("/api/pqrs/{$pqr->id}/respuestas", [
        'mensaje' => 'Estimada Sofía, adjuntamos la información solicitada en su correo.',
    ]);

    $response->assertStatus(201)
        ->assertJson([
            'success' => true,
            'mensaje' => 'Respuesta agregada correctamente',
        ]);

    $this->assertDatabaseHas('pqr_respuestas', [
        'pqr_id' => $pqr->id,
        'tipo' => 'ADMINISTRACION',
    ]);

    $this->assertDatabaseHas('pqrs', [
        'id' => $pqr->id,
        'estado' => 'EN_PROCESO',
    ]);

    Mail::assertSent(NotificacionRespuestaPQRMailable::class, function ($mail) {
        return $mail->hasTo('sofia@example.com');
    });
});

test('el admin puede eliminar una PQR', function () {
    $admin = Usuario::factory()->admin()->create();

    $pqr = Pqr::create([
        'id' => (string) Str::uuid(),
        'numero_ticket' => 'PQR-261019-005',
        'nombre_completo' => 'Spam Bot',
        'email' => 'spam@example.com',
        'telefono' => '0000000000',
        'tipo' => TipoPqr::PETICION,
        'descripcion' => 'Buy crypto now',
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    $mockStorage = Mockery::mock(MediaStorageInterface::class);
    $this->app->instance(MediaStorageInterface::class, $mockStorage);

    $response = $this->actingAs($admin)->deleteJson("/api/pqrs/{$pqr->id}");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'mensaje' => 'PQR eliminada correctamente',
        ]);

    $this->assertDatabaseMissing('pqrs', [
        'id' => $pqr->id,
    ]);
});
