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
            $table->string('ip', 45);
            $table->text('user_agent')->nullable();
            $table->string('pagina', 255);
            $table->date('fecha');
            $table->timestamps();

            $table->index('fecha');
            $table->index('pagina');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estadisticas_visitas');
    }
};
