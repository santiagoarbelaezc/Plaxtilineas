<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estadisticas_visitas', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->nullable();
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('pagina_url', 255)->nullable();
            $table->string('pagina', 255)->nullable();
            $table->string('session_id', 100)->nullable();
            $table->date('fecha')->nullable();
            $table->timestamps();

            $table->index('fecha');
            $table->index('session_id');
            $table->index('pagina_url');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estadisticas_visitas');
    }
};
