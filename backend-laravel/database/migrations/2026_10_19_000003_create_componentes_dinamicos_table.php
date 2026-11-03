<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('componentes_dinamicos', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 50);
            $table->integer('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->json('contenido');
            $table->timestamps();

            $table->index('orden');
            $table->index('activo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('componentes_dinamicos');
    }
};
