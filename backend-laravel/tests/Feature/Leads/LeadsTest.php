<?php

declare(strict_types=1);

use App\Models\Lead;
use App\Models\Usuario;

test('un usuario anonimo puede registrarse como lead exitosamente', function () {
    $payload = [
        'nombre' => 'Ana Maria',
        'telefono' => '3123456789',
        'fuente' => 'modal_descuento',
    ];

    $response = $this->postJson('/api/leads', $payload);

    $response->assertStatus(201)
        ->assertJson([
            'registrado' => true,
            'mensaje' => '¡Registro exitoso! Pronto recibirás nuestras novedades.',
        ])
        ->assertJsonStructure(['registrado', 'id', 'mensaje']);

    $this->assertDatabaseHas('leads', [
        'nombre' => 'Ana Maria',
        'telefono' => '3123456789',
        'fuente' => 'modal_descuento',
    ]);
});

test('no permite registrar el mismo numero de telefono dos veces', function () {
    Lead::create([
        'nombre' => 'Carlos Perez',
        'telefono' => '3109998877',
        'fuente' => 'web',
    ]);

    $response = $this->postJson('/api/leads', [
        'nombre' => 'Carlos Perez Segundo Intento',
        'telefono' => '3109998877',
    ]);

    $response->assertStatus(409)
        ->assertJson([
            'error' => 'Este número de teléfono ya se encuentra registrado.',
        ]);
});

test('valida longitud minima del nombre en leads', function () {
    $response = $this->postJson('/api/leads', [
        'nombre' => 'Al',
        'telefono' => '3101112233',
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'error' => 'El nombre debe tener al menos 3 caracteres.',
        ]);
});

test('solo administradores pueden listar leads con busqueda y paginacion', function () {
    Lead::create([
        'nombre' => 'Cliente Interesado en Plastico',
        'telefono' => '3157778899',
        'fuente' => 'modal_bienvenida',
    ]);

    // Anonimo -> 401
    $this->getJson('/api/leads')->assertStatus(401);

    // Cliente -> 403
    $cliente = Usuario::factory()->cliente()->create();
    $this->actingAs($cliente)->getJson('/api/leads')->assertStatus(403);

    // Admin -> 200
    $admin = Usuario::factory()->admin()->create();
    $response = $this->actingAs($admin)->getJson('/api/leads?buscar=Interesado');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'leads',
            'total',
            'pagina',
            'limite',
            'total_paginas',
        ]);
    expect($response->json('leads'))->toHaveCount(1);
});

test('solo administradores pueden consultar estadisticas de leads', function () {
    Lead::create([
        'nombre' => 'Lead Stats 1',
        'telefono' => '3180001122',
        'fuente' => 'facebook',
    ]);

    $admin = Usuario::factory()->admin()->create();
    $response = $this->actingAs($admin)->getJson('/api/leads/stats');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'total',
            'hoy',
            'esta_semana',
            'por_dia',
            'por_fuente',
        ]);
});
