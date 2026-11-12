<?php

declare(strict_types=1);

use App\Enums\EstadoPedido;
use App\Enums\EstadoPqr;
use App\Enums\TipoPqr;
use App\Models\AdminAuditoriaLog;
use App\Models\AdminSesion;
use App\Models\Pedido;
use App\Models\Pqr;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Mail::fake();
});

test('login de administrador crea sesion activa y registro LOGIN en auditoria', function () {
    $admin = Usuario::factory()->admin()->create([
        'nombre' => 'Admin Principal',
        'correo' => 'admin.audit@plaxtilineas.com',
        'password' => Hash::make('Password123!'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'correo' => 'admin.audit@plaxtilineas.com',
        'password' => 'Password123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['token', 'usuario']);

    $sesion = AdminSesion::where('admin_id', $admin->id)->first();
    expect($sesion)->not->toBeNull()
        ->and($sesion->activa)->toBeTrue()
        ->and($sesion->inicio_sesion_at)->not->toBeNull();

    $log = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'AUTH')
        ->where('accion', 'LOGIN')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->sesion_id)->toBe($sesion->id)
        ->and($log->descripcion)->toContain('Inicio de sesión de administrador');
});

test('logout de administrador cierra la sesion, calcula tiempo logueado y registra LOGOUT', function () {
    $admin = Usuario::factory()->admin()->create([
        'nombre' => 'Admin Sesion',
        'correo' => 'admin.sesion@plaxtilineas.com',
    ]);

    $inicio = now()->subMinutes(25);
    $sesion = AdminSesion::create([
        'admin_id' => $admin->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest/Test',
        'inicio_sesion_at' => $inicio,
        'ultima_actividad_at' => now()->subMinutes(5),
        'duracion_segundos' => 1200,
        'activa' => true,
    ]);

    Sanctum::actingAs($admin, ['*']);

    $response = $this->postJson('/api/auth/logout');
    $response->assertStatus(200)
        ->assertJson(['mensaje' => 'Sesión cerrada exitosamente.']);

    $sesion->refresh();
    expect($sesion->activa)->toBeFalse()
        ->and($sesion->fin_sesion_at)->not->toBeNull()
        ->and($sesion->duracion_segundos)->toBeGreaterThanOrEqual(1490);

    $logoutLog = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'AUTH')
        ->where('accion', 'LOGOUT')
        ->first();

    expect($logoutLog)->not->toBeNull()
        ->and($logoutLog->sesion_id)->toBe($sesion->id)
        ->and($logoutLog->descripcion)->toContain('Tiempo conectado:');
});

test('eliminar un usuario como admin registra la operacion en auditoria con hora y datos anteriores', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $cliente = Usuario::factory()->cliente()->create([
        'nombre' => 'Roberto',
        'apellidos' => 'Gómez',
        'correo' => 'roberto@cliente.com',
        'ciudad' => 'Armenia',
    ]);

    $response = $this->deleteJson("/api/admin/usuarios/{$cliente->id}");
    $response->assertStatus(200);

    $log = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'USUARIOS')
        ->where('accion', 'ELIMINAR_USUARIO')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->entidad_tipo)->toBe('Usuario')
        ->and($log->entidad_id)->toBe((string) $cliente->id)
        ->and($log->descripcion)->toContain('roberto@cliente.com')
        ->and($log->datos_anteriores['correo'])->toBe('roberto@cliente.com')
        ->and($log->created_at)->not->toBeNull();
});

test('actualizar estado y eliminar un pedido como admin quedan registrados en auditoria', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $cliente = Usuario::factory()->cliente()->create(['nombre' => 'Laura']);

    $pedido1 = Pedido::factory()->create([
        'usuario_id' => $cliente->id,
        'codigo_pedido' => 'PLX-AUDIT-001',
        'estado' => EstadoPedido::PAGADO,
        'total' => 85000,
    ]);

    $resEstado = $this->putJson("/api/admin/pedidos/{$pedido1->id}/estado", [
        'estado' => 'en_camino',
        'guia_numero' => 'GUIA-9988',
        'transportadora' => 'Servientrega',
    ]);
    $resEstado->assertStatus(200);

    $logActualizar = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'PEDIDOS')
        ->where('accion', 'ACTUALIZAR_ESTADO_PEDIDO')
        ->first();

    expect($logActualizar)->not->toBeNull()
        ->and($logActualizar->entidad_id)->toBe('PLX-AUDIT-001')
        ->and($logActualizar->datos_anteriores['estado'])->toBe('pagado')
        ->and($logActualizar->datos_nuevos['estado'])->toBe('en_camino')
        ->and($logActualizar->datos_nuevos['guia_numero'])->toBe('GUIA-9988');

    // Ahora probar eliminación de un pedido pendiente
    $pedido2 = Pedido::factory()->create([
        'usuario_id' => $cliente->id,
        'codigo_pedido' => 'PLX-AUDIT-002',
        'estado' => EstadoPedido::PENDIENTE,
        'total' => 42000,
    ]);

    $resEliminar = $this->deleteJson("/api/admin/pedidos/{$pedido2->id}", [
        'confirmacion' => 'eliminar',
    ]);
    $resEliminar->assertStatus(200);

    $logEliminar = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'PEDIDOS')
        ->where('accion', 'ELIMINAR_PEDIDO')
        ->first();

    expect($logEliminar)->not->toBeNull()
        ->and($logEliminar->entidad_id)->toBe('PLX-AUDIT-002')
        ->and($logEliminar->datos_anteriores['codigo_pedido'])->toBe('PLX-AUDIT-002');
});

test('responder, cambiar estado y eliminar una PQR como admin quedan registrados en auditoria', function () {
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    $pqr = Pqr::create([
        'tipo' => TipoPqr::PETICION,
        'nombre_completo' => 'Andrés Quintero',
        'email' => 'andres@correo.com',
        'telefono' => '3001112233',
        'producto_relacionado' => 'Malla Polisombra',
        'descripcion' => 'Solicito cotización formal por rollo de 100 metros.',
        'estado' => EstadoPqr::PENDIENTE,
        'numero_ticket' => 'PQR-261110-777',
    ]);

    // 1. Responder PQR
    $resRespuesta = $this->postJson("/api/pqrs/{$pqr->id}/respuestas", [
        'mensaje' => 'Hola Andrés, te enviamos la cotización al correo.',
        'tipo' => 'ADMINISTRACION',
    ]);
    $resRespuesta->assertStatus(201);

    $logRespuesta = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'PQRS')
        ->where('accion', 'RESPONDER_PQR')
        ->first();

    expect($logRespuesta)->not->toBeNull()
        ->and($logRespuesta->entidad_id)->toBe('PQR-261110-777')
        ->and($logRespuesta->datos_nuevos['mensaje'])->toContain('cotización');

    // 2. Cambiar estado PQR
    $resEstado = $this->putJson("/api/pqrs/{$pqr->id}/estado", [
        'estado' => 'RESUELTO',
        'mensaje_respuesta' => 'Caso cerrado satisfactoriamente.',
    ]);
    $resEstado->assertStatus(200);

    $logEstado = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'PQRS')
        ->where('accion', 'CAMBIAR_ESTADO_PQR')
        ->first();

    expect($logEstado)->not->toBeNull()
        ->and($logEstado->entidad_id)->toBe('PQR-261110-777')
        ->and($logEstado->datos_nuevos['estado'])->toBe('RESUELTO');

    // 3. Eliminar PQR
    $resEliminar = $this->deleteJson("/api/pqrs/{$pqr->id}");
    $resEliminar->assertStatus(200);

    $logEliminar = AdminAuditoriaLog::where('admin_id', $admin->id)
        ->where('modulo', 'PQRS')
        ->where('accion', 'ELIMINAR_PQR')
        ->first();

    expect($logEliminar)->not->toBeNull()
        ->and($logEliminar->entidad_id)->toBe('PQR-261110-777')
        ->and($logEliminar->datos_anteriores['nombre_completo'])->toBe('Andrés Quintero');
});

test('endpoints de consulta de auditoria y sesiones retornan trazabilidad completa y bloquean clientes', function () {
    $cliente = Usuario::factory()->cliente()->create();
    Sanctum::actingAs($cliente, ['*']);

    $this->getJson('/api/admin/auditoria')->assertStatus(403);
    $this->getJson('/api/admin/auditoria/sesiones')->assertStatus(403);

    $admin = Usuario::factory()->admin()->create(['nombre' => 'Santiago Admin']);
    Sanctum::actingAs($admin, ['*']);

    // Generar una operación
    $targetUser = Usuario::factory()->cliente()->create(['nombre' => 'Cliente Temporal']);
    $this->deleteJson("/api/admin/usuarios/{$targetUser->id}")->assertStatus(200);

    $resAuditoria = $this->getJson('/api/admin/auditoria?modulo=USUARIOS');
    $resAuditoria->assertStatus(200)
        ->assertJsonStructure([
            'estadisticas' => [
                'total_operaciones',
                'operaciones_hoy',
                'total_sesiones',
                'sesiones_activas',
                'eliminaciones_totales',
                'tiempo_total_segundos',
                'tiempo_total_formateado',
                'sesion_actual',
            ],
            'logs',
            'paginacion',
        ]);

    expect($resAuditoria->json('logs'))->toHaveCount(1)
        ->and($resAuditoria->json('logs.0.accion'))->toBe('ELIMINAR_USUARIO');

    $resSesiones = $this->getJson('/api/admin/auditoria/sesiones');
    $resSesiones->assertStatus(200)
        ->assertJsonStructure([
            'sesiones' => [
                '*' => [
                    'id',
                    'admin_nombre',
                    'inicio_formateado',
                    'duracion_segundos',
                    'duracion_formateada',
                    'activa',
                    'total_operaciones',
                    'operaciones',
                ],
            ],
        ]);
});

