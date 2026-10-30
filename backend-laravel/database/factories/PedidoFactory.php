<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Pedido>
 */
class PedidoFactory extends Factory
{
    protected $model = Pedido::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 20000, 200000);
        $costoEnvio = 10000.00;
        $total = $subtotal + $costoEnvio;

        return [
            'usuario_id' => Usuario::factory(),
            'codigo_pedido' => 'PED-'.strtoupper(Str::random(8)),
            'nombre_cliente' => fake()->name(),
            'email_cliente' => fake()->safeEmail(),
            'telefono_cliente' => fake()->numerify('3#########'),
            'direccion_envio' => fake()->streetAddress(),
            'ciudad_envio' => fake()->city(),
            'notas' => fake()->optional()->sentence(),
            'subtotal' => $subtotal,
            'iva' => 0.00,
            'costo_envio' => $costoEnvio,
            'total' => $total,
            'metodo_pago' => 'wompi',
            'wompi_referencia' => 'PLX-'.Str::random(12),
            'wompi_transaction_id' => null,
            'wompi_evento_id' => null,
            'wompi_monto_centavos' => (int) round($total * 100),
            'wompi_pagado_at' => null,
            'estado' => EstadoPedido::DRAFT,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => EstadoPedido::DRAFT,
        ]);
    }

    public function pagado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => EstadoPedido::PAGADO,
            'wompi_transaction_id' => 'trans-'.Str::random(10),
            'wompi_evento_id' => 'evt-'.Str::random(10),
            'wompi_pagado_at' => now(),
        ]);
    }

    public function cancelado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => EstadoPedido::CANCELADO,
        ]);
    }
}
