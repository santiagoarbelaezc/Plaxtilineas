<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('usuarios', 'password_cambios_historial')) {
            Schema::table('usuarios', function (Blueprint $table) {
                $table->json('password_cambios_historial')->nullable()->after('requiere_cambio_password');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('usuarios', 'password_cambios_historial')) {
            Schema::table('usuarios', function (Blueprint $table) {
                $table->dropColumn('password_cambios_historial');
            });
        }
    }
};
