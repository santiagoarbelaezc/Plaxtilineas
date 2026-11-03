<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Producto;
use Illuminate\Database\Seeder;

class TestCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $productos = [
            ['nombre' => 'Bolsa Plástica Biodegradable 30x40', 'precio' => 15000.00, 'stock' => 100, 'controlar_stock' => true],
            ['nombre' => 'Rollo Vinipel Transparente 500m', 'precio' => 32000.00, 'stock' => 50, 'controlar_stock' => true],
            ['nombre' => 'Cinta de Embalaje Transparente 48mm', 'precio' => 4500.00, 'stock' => 200, 'controlar_stock' => true],
            ['nombre' => 'Bolsa Hermética Ziploc 20x25 (100 und)', 'precio' => 28000.00, 'stock' => 35, 'controlar_stock' => true],
            ['nombre' => 'Bolsa para Basura Extra Fuerte 55L (Pack)', 'precio' => 12500.00, 'stock' => 80, 'controlar_stock' => true],
            ['nombre' => 'Plástico Burbuja Protección 1m x 50m', 'precio' => 54000.00, 'stock' => 20, 'controlar_stock' => true],
            ['nombre' => 'Malla Tubular Plástica Agrícola', 'precio' => 42000.00, 'stock' => 15, 'controlar_stock' => true],
            ['nombre' => 'Bolsa al Vacío con Válvula', 'precio' => 18000.00, 'stock' => 4, 'controlar_stock' => true], // stock bajo <= 5
            ['nombre' => 'Polietileno Tubular Calibre 2', 'precio' => 75000.00, 'stock' => 0, 'controlar_stock' => true], // sin stock
            ['nombre' => 'Servicio de Personalización de Empaque', 'precio' => 90000.00, 'stock' => 0, 'controlar_stock' => false], // sin control de stock
        ];

        foreach ($productos as $p) {
            Producto::query()->firstOrCreate(
                ['nombre' => $p['nombre']],
                [
                    'precio' => $p['precio'],
                    'stock' => $p['stock'],
                    'controlar_stock' => $p['controlar_stock'],
                    'activo' => true,
                ]
            );
        }
    }
}
