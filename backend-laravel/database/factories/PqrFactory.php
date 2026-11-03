<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EstadoPqr;
use App\Enums\TipoPqr;
use App\Models\Pqr;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Pqr>
 */
class PqrFactory extends Factory
{
    protected $model = Pqr::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'tipo' => fake()->randomElement(TipoPqr::cases()),
            'nombre_completo' => fake()->name(),
            'email' => fake()->safeEmail(),
            'telefono' => fake()->numerify('3#########'),
            'producto_relacionado' => fake()->optional()->word(),
            'descripcion' => fake()->paragraph(),
            'estado' => EstadoPqr::PENDIENTE,
            'numero_ticket' => 'PQR-'.date('ymd').'-'.str_pad((string) fake()->numberBetween(0, 999), 3, '0', STR_PAD_LEFT),
        ];
    }

    public function tipo(TipoPqr $tipo): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo' => $tipo,
        ]);
    }

    public function estado(EstadoPqr $estado): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => $estado,
        ]);
    }
}
