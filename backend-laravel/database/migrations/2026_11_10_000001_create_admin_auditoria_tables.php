<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_sesiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('usuarios')->cascadeOnDelete();
            $table->unsignedBigInteger('token_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('inicio_sesion_at')->useCurrent();
            $table->timestamp('ultima_actividad_at')->nullable();
            $table->timestamp('fin_sesion_at')->nullable();
            $table->unsignedInteger('duracion_segundos')->default(0);
            $table->boolean('activa')->default(true);
            $table->timestamps();

            $table->index(['admin_id', 'activa']);
            $table->index('inicio_sesion_at');
        });

        Schema::create('admin_auditoria_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesion_id')->nullable()->constrained('admin_sesiones')->nullOnDelete();
            $table->foreignId('admin_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('modulo', 50);
            $table->string('accion', 80);
            $table->text('descripcion');
            $table->string('entidad_tipo', 60)->nullable();
            $table->string('entidad_id', 64)->nullable();
            $table->json('datos_anteriores')->nullable();
            $table->json('datos_nuevos')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['admin_id', 'created_at']);
            $table->index(['modulo', 'accion']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_auditoria_logs');
        Schema::dropIfExists('admin_sesiones');
    }
};
