<?php

declare(strict_types=1);

use App\Enums\RolUsuario;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('usuario se crea con rol cliente por defecto y hashea password', function () {
    $usuario = Usuario::factory()->create([
        'password' => 'secret123',
    ]);

    expect($usuario->rol)->toBe(RolUsuario::CLIENTE->value)
        ->and($usuario->isAdmin())->toBeFalse()
        ->and($usuario->emailVerificado())->toBeTrue()
        ->and(Hash::check('secret123', $usuario->password))->toBeTrue();
});

test('usuario admin tiene rol admin y helper isAdmin retorna true', function () {
    $admin = Usuario::factory()->admin()->create();

    expect($admin->rol)->toBe(RolUsuario::ADMIN->value)
        ->and($admin->isAdmin())->toBeTrue();
});

test('scopes admin y cliente filtran correctamente', function () {
    Usuario::factory()->count(3)->cliente()->create();
    Usuario::factory()->count(2)->admin()->create();

    expect(Usuario::query()->cliente()->count())->toBe(3)
        ->and(Usuario::query()->admin()->count())->toBe(2);
});

test('usuario con password temporal es detectado por helper', function () {
    $usuario = Usuario::factory()->conPasswordTemporal()->create();

    expect($usuario->tienePasswordTemporal())->toBeTrue();
});
