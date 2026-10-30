<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('apellidos')->nullable();
            $table->integer('edad')->nullable();
            $table->string('direccion')->nullable();
            $table->string('ciudad')->nullable();
            $table->string('telefono', 50)->nullable();
            $table->string('correo', 150)->unique();
            $table->string('password');
            $table->string('rol', 50)->default('cliente');
            $table->string('google_id', 100)->nullable();
            $table->boolean('email_verificado')->default(false);
            $table->string('token_verificacion', 50)->nullable();
            $table->dateTime('token_expira_en')->nullable();
            $table->boolean('requiere_cambio_password')->default(false);
            $table->timestamp('fecha_creacion')->nullable()->useCurrent();
            $table->timestamps();

            $table->index('correo');
            $table->index('rol');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
