<?php

declare(strict_types=1);

use App\Models\EstadisticaProducto;
use App\Models\EstadisticaVisita;
use App\Models\Lead;
use App\Models\Producto;
use App\Models\Usuario;
use Illuminate\Support\Carbon;

test('cualquier usuario puede registrar visitas de pagina o producto anonimamente', function () {
    // 1. Visita de pagina general
    $resPagina = $this->postJson('/api/stats/track', [
        'tipo' => 'pagina',
        'url' => '/productos',
        'session_id' => 'ses_123',
    ]);

    $resPagina->assertStatus(201)
        ->assertJson(['tracked' => true]);

    $this->assertDatabaseHas('estadisticas_visitas', [
        'pagina_url' => '/productos',
        'session_id' => 'ses_123',
    ]);

    // 2. Visita de producto
    $prod = Producto::factory()->create();

    $resProd = $this->postJson('/api/stats/track', [
        'tipo' => 'producto',
        'producto_id' => $prod->id,
        'session_id' => 'ses_456',
    ]);

    $resProd->assertStatus(201)
        ->assertJson(['tracked' => true]);

    $this->assertDatabaseHas('estadisticas_productos', [
        'producto_id' => $prod->id,
        'session_id' => 'ses_456',
    ]);
});

test('solo administradores pueden acceder a las metricas del dashboard', function () {
    // Anonimo -> 401
    $this->getJson('/api/stats/dashboard')->assertStatus(401);

    // Cliente -> 403
    $cliente = Usuario::factory()->cliente()->create();
    $this->actingAs($cliente)->getJson('/api/stats/dashboard')->assertStatus(403);

    // Preparar datos para las metricas
    EstadisticaVisita::create([
        'ip' => '127.0.0.1',
        'ip_address' => '127.0.0.1',
        'pagina' => '/nosotros',
        'pagina_url' => '/nosotros',
        'session_id' => 's_today',
        'fecha' => Carbon::today(),
    ]);

    $p = Producto::factory()->create();
    EstadisticaProducto::create([
        'producto_id' => $p->id,
        'session_id' => 's_today',
    ]);

    Lead::create([
        'nombre' => 'Lead Dashboard',
        'telefono' => '3000000001',
    ]);

    // Admin -> 200
    $admin = Usuario::factory()->admin()->create();
    $response = $this->actingAs($admin)->getJson('/api/stats/dashboard');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'resumen' => [
                'visitas_hoy',
                'visitas_ayer',
                'visitas_semana',
                'visitas_mes',
                'sesiones_unicas',
                'diferencia_hoy',
                'total_productos',
                'total_categorias',
                'total_subcats',
                'total_leads',
                'leads_hoy',
                'leads_semana',
            ],
            'grafico_visitas',
            'top_productos',
            'visitas_categoria',
            'visitas_subcategoria',
            'paginas_top',
            'leads_recientes',
        ]);

    expect($response->json('resumen.visitas_hoy'))->toBeGreaterThanOrEqual(1)
        ->and($response->json('resumen.total_leads'))->toBeGreaterThanOrEqual(1);
});
