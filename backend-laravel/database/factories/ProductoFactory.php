<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Producto>
 */
class ProductoFactory extends Factory
{
    protected $model = Producto::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => fake()->words(3, true),
            'precio' => fake()->randomFloat(2, 5000, 150000),
            'stock' => fake()->numberBetween(10, 100),
            'controlar_stock' => true,
            'imagen_url' => fake()->imageUrl(640, 480, 'products'),
            'activo' => true,
        ];
    }

    public function sinStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
            'controlar_stock' => true,
        ]);
    }

    public function stockIlimitado(): static
    {
        return $this->state(fn (array $attributes) => [
            'controlar_stock' => false,
        ]);
    }

    public function inactivo(): static
    {
        return $this->state(fn (array $attributes) => [
            'activo' => false,
        ]);
    }
}
