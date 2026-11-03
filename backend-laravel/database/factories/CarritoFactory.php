<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Carrito;
use App\Models\Producto;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Carrito>
 */
class CarritoFactory extends Factory
{
    protected $model = Carrito::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'usuario_id' => Usuario::factory(),
            'producto_id' => Producto::factory(),
            'variante_id' => null,
            'cantidad' => fake()->numberBetween(1, 5),
            'precio_unitario' => fake()->randomFloat(2, 5000, 50000),
        ];
    }
}
