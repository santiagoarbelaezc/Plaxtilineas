<?php

declare(strict_types=1);

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
| El test case base para todos los tests de Pest.
| Usa RefreshDatabase para que cada test tenga una BD limpia.
*/

uses(TestCase::class, RefreshDatabase::class)->in('Feature');
uses(TestCase::class)->in('Unit');

/*
|--------------------------------------------------------------------------
| Prevenir requests HTTP reales en los tests
|--------------------------------------------------------------------------
| Todos los tests deben usar Http::fake(). Cualquier request no interceptado
| lanzara una excepcion para detectar integraciones no mockeadas.
*/
uses()->beforeEach(function () {
    Http::fake([]);
    Http::preventStrayRequests();
})->in('Feature');

/*
|--------------------------------------------------------------------------
| Helpers globales de tests
|--------------------------------------------------------------------------
*/

/**
 * Crear y autenticar un usuario admin para tests.
 */
function actingAsAdmin(): Usuario
{
    $admin = Usuario::factory()->admin()->create();
    Sanctum::actingAs($admin, ['*']);

    return $admin;
}

/**
 * Crear y autenticar un usuario cliente para tests.
 */
function actingAsCliente(): Usuario
{
    $cliente = Usuario::factory()->cliente()->create();
    Sanctum::actingAs($cliente, ['*']);

    return $cliente;
}

/*
|--------------------------------------------------------------------------
| Expectations personalizadas
|--------------------------------------------------------------------------
*/

expect()->extend('toBeUnauthorized', function () {
    return $this->toMatchArray(['error' => expect()->toBeString()])
        ->and($this->value)->status->toBe(401);
});
