<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pqrs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tipo', 50);
            $table->string('nombre_completo');
            $table->string('email');
            $table->string('telefono', 50);
            $table->string('producto_relacionado')->nullable();
            $table->text('descripcion');
            $table->string('estado', 50)->default('PENDIENTE');
            $table->string('numero_ticket', 50)->unique();
            $table->timestamps();

            $table->index('tipo');
            $table->index('estado');
            $table->index('numero_ticket');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pqrs');
    }
};
