<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estadisticas_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->string('session_id', 100);
            $table->timestamps();

            $table->index('producto_id');
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estadisticas_productos');
    }
};
