<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carritos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->unsignedBigInteger('producto_id');
            $table->unsignedBigInteger('variante_id')->nullable();
            $table->integer('cantidad')->default(1);
            $table->decimal('precio_unitario', 12, 2);
            $table->timestamps();

            $table->unique(['usuario_id', 'producto_id', 'variante_id'], 'uq_usuario_producto_variante');
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carritos');
    }
};
