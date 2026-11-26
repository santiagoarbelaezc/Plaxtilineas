<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pedidos', 'evidencia_envio_url')) {
            Schema::table('pedidos', function (Blueprint $table) {
                $table->string('evidencia_envio_url', 500)->nullable()->after('fecha_envio');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pedidos', 'evidencia_envio_url')) {
            Schema::table('pedidos', function (Blueprint $table) {
                $table->dropColumn('evidencia_envio_url');
            });
        }
    }
};
