<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (! Schema::hasColumn('pedidos', 'evidencia_entrega_url')) {
                $table->string('evidencia_entrega_url', 500)->nullable()->after('evidencia_envio_url');
            }
            if (! Schema::hasColumn('pedidos', 'fecha_entrega')) {
                $table->timestamp('fecha_entrega')->nullable()->after('fecha_envio');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (Schema::hasColumn('pedidos', 'evidencia_entrega_url')) {
                $table->dropColumn('evidencia_entrega_url');
            }
            if (Schema::hasColumn('pedidos', 'fecha_entrega')) {
                $table->dropColumn('fecha_entrega');
            }
        });
    }
};
