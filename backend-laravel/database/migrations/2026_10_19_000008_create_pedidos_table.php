<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('codigo_pedido', 50)->unique();
            $table->string('nombre_cliente', 150)->nullable();
            $table->string('email_cliente', 150)->nullable();
            $table->string('telefono_cliente', 50)->nullable();
            $table->text('direccion_envio');
            $table->string('ciudad_envio', 100)->nullable();
            $table->string('departamento', 100)->nullable();
            $table->text('notas')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('iva', 12, 2)->default(0);
            $table->decimal('costo_envio', 12, 2)->default(10000);
            $table->decimal('total', 12, 2);
            $table->string('metodo_pago', 50)->default('wompi');
            $table->string('wompi_referencia', 60)->nullable()->unique();
            $table->string('wompi_link_id', 120)->nullable();
            $table->string('wompi_transaction_id', 120)->nullable();
            $table->string('wompi_evento_id', 120)->nullable()->unique();
            $table->bigInteger('wompi_monto_centavos')->nullable();
            $table->dateTime('wompi_pagado_at')->nullable();
            $table->string('guia_numero', 100)->nullable();
            $table->string('transportadora', 100)->nullable();
            $table->dateTime('fecha_envio')->nullable();
            $table->string('estado', 50)->default('draft');
            $table->timestamps();

            $table->index('estado');
            $table->index('usuario_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
