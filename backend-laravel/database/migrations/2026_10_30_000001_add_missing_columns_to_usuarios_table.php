<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('usuarios')) {
            return;
        }

        if (! Schema::hasColumn('usuarios', 'requiere_cambio_password')) {
            Schema::table('usuarios', function (Blueprint $table): void {
                $table->boolean('requiere_cambio_password')->default(false)->after('token_expira_en');
            });
        }

        if (! Schema::hasColumn('usuarios', 'updated_at')) {
            Schema::table('usuarios', function (Blueprint $table): void {
                $table->timestamp('updated_at')->nullable()->after('fecha_creacion');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('usuarios')) {
            return;
        }

        if (Schema::hasColumn('usuarios', 'updated_at')) {
            Schema::table('usuarios', function (Blueprint $table): void {
                $table->dropColumn('updated_at');
            });
        }

        if (Schema::hasColumn('usuarios', 'requiere_cambio_password')) {
            Schema::table('usuarios', function (Blueprint $table): void {
                $table->dropColumn('requiere_cambio_password');
            });
        }
    }
};
