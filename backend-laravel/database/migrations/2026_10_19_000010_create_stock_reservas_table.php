<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_reservas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->unsignedBigInteger('variante_id')->nullable();
            $table->integer('cantidad');
            $table->timestamp('creado_at')->useCurrent();
            $table->timestamp('expira_at');

            $table->index('pedido_id');
            $table->index('producto_id');
            $table->index('expira_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_reservas');
    }
};
