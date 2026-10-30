<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Route::post('/api/test-validation', function (Request $request) {
        $request->validate([
            'email' => 'required|email',
        ]);

        return response()->json(['ok' => true]);
    });

    Route::get('/api/test-admin-only', function () {
        return response()->json(['admin' => true]);
    })->middleware('admin');
});

test('ruta inexistente en /api retorna 404 con formato json error', function () {
    $response = $this->getJson('/api/ruta-inexistente-xyz-123');

    $response->assertStatus(404)
        ->assertJsonStructure(['error'])
        ->assertJson(['error' => 'Ruta no encontrada.']);
});

test('ruta protegida por sanctum sin token retorna 401 con formato json error', function () {
    $response = $this->getJson('/api/user');

    $response->assertStatus(401)
        ->assertJsonStructure(['error'])
        ->assertJson(['error' => 'No autenticado.']);
});

test('usuario no admin intentando acceder a ruta admin retorna 403 json', function () {
    $user = new User;
    $user->id = 999;
    $user->name = 'Cliente Prueba';
    $user->email = 'cliente@test.com';
    $user->rol = 'cliente';

    Sanctum::actingAs($user, ['*']);

    $response = $this->getJson('/api/test-admin-only');

    $response->assertStatus(403)
        ->assertJsonStructure(['error'])
        ->assertJson(['error' => 'Acceso no permitido. Se requieren permisos de administrador.']);
});

test('usuario admin puede acceder a ruta protegida con middleware admin', function () {
    $admin = new User;
    $admin->id = 1;
    $admin->name = 'Admin Prueba';
    $admin->email = 'admin@test.com';
    $admin->rol = 'admin';

    Sanctum::actingAs($admin, ['*']);

    $response = $this->getJson('/api/test-admin-only');

    $response->assertStatus(200)
        ->assertJson(['admin' => true]);
});

test('fallo de validacion en /api retorna 422 con formato error y errors', function () {
    $response = $this->postJson('/api/test-validation', []);

    $response->assertStatus(422)
        ->assertJsonStructure(['error', 'errors']);
});

test('toda respuesta bajo /api incluye header X-Request-ID', function () {
    $response = $this->getJson('/api/health');

    $response->assertStatus(200)
        ->assertHeader('X-Request-ID');

    $requestId = $response->headers->get('X-Request-ID');
    expect($requestId)->toBeString()->not->toBeEmpty();
});

test('si cliente envia su propio X-Request-ID este se preserva', function () {
    $customId = 'custom-request-id-456';

    $response = $this->withHeader('X-Request-ID', $customId)
        ->getJson('/api/health');

    $response->assertStatus(200)
        ->assertHeader('X-Request-ID', $customId);
});
