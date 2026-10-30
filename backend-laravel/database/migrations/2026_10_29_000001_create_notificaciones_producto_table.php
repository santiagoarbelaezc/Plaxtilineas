<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones_producto', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('producto_id')->unique();
            $table->json('payload');
            $table->string('estado', 20)->default('pendiente');
            $table->unsignedInteger('total_destinatarios')->default(0);
            $table->unsignedInteger('enviados')->default(0);
            $table->unsignedInteger('fallidos')->default(0);
            $table->timestamps();

            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones_producto');
    }
};
