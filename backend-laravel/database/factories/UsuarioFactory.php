<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\RolUsuario;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Usuario>
 */
class UsuarioFactory extends Factory
{
    protected $model = Usuario::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => fake()->firstName(),
            'apellidos' => fake()->lastName(),
            'edad' => fake()->numberBetween(18, 70),
            'direccion' => fake()->streetAddress(),
            'ciudad' => fake()->city(),
            'telefono' => fake()->numerify('3#########'),
            'correo' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password123'),
            'rol' => RolUsuario::CLIENTE->value,
            'google_id' => null,
            'email_verificado' => true,
            'token_verificacion' => null,
            'token_expira_en' => null,
            'requiere_cambio_password' => false,
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'rol' => RolUsuario::ADMIN->value,
        ]);
    }

    public function cliente(): static
    {
        return $this->state(fn (array $attributes) => [
            'rol' => RolUsuario::CLIENTE->value,
        ]);
    }

    public function noVerificado(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verificado' => false,
            'token_verificacion' => '123456',
            'token_expira_en' => now()->addHours(24),
        ]);
    }

    public function conPasswordTemporal(): static
    {
        return $this->state(fn (array $attributes) => [
            'requiere_cambio_password' => true,
        ]);
    }
}
