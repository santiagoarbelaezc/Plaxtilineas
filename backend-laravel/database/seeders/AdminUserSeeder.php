<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\RolUsuario;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        Usuario::query()->firstOrCreate(
            ['correo' => 'admin@plaxtilineas.com'],
            [
                'nombre' => 'Administrador',
                'apellidos' => 'Plaxtilineas',
                'edad' => 35,
                'direccion' => 'Calle Principal # 10 - 20',
                'ciudad' => 'Bogotá',
                'telefono' => '3001234567',
                'password' => Hash::make('Admin123*'),
                'rol' => RolUsuario::ADMIN->value,
                'email_verificado' => true,
                'requiere_cambio_password' => false,
            ]
        );
    }
}
