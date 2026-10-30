<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            // Opción 1 aprobada: clientes existentes quedan suscritos (true) con baja en 1 clic.
            $table->boolean('acepta_novedades')->default(true);
            $table->string('token_baja', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropUnique(['token_baja']);
            $table->dropColumn(['acepta_novedades', 'token_baja']);
        });
    }
};
