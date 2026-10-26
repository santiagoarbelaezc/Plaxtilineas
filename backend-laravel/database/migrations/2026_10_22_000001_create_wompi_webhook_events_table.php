<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla de idempotencia y auditoría de webhooks Wompi.
 *
 * Cada evento de Wompi que llega al endpoint /api/wompi/webhook
 * se registra aquí ANTES de procesarlo. Si el evento ya existe
 * (mismo wompi_event_id), se rechaza como duplicado sin efectos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wompi_webhook_events', function (Blueprint $table) {
            $table->id();

            // ID único del evento tal como lo envía Wompi (campo "id" del payload)
            $table->string('wompi_event_id', 100)->unique()->comment('ID único del evento Wompi');

            // Tipo de evento (ej. "transaction.updated")
            $table->string('event_type', 60)->default('')->comment('Tipo de evento Wompi');

            // Estado de la transacción en este evento (APPROVED, DECLINED, etc.)
            $table->string('transaction_status', 30)->nullable()->comment('Estado de la transacción');

            // Referencia del pedido interna
            $table->string('reference', 80)->nullable()->index()->comment('Referencia del pedido');

            // ID de transacción en Wompi
            $table->string('wompi_transaction_id', 100)->nullable()->comment('ID de transacción Wompi');

            // Payload completo para auditoría (sin datos sensibles de tarjeta)
            $table->json('payload')->comment('Payload completo del evento');

            // Resultado del procesamiento
            $table->enum('result', ['processed', 'rejected_invalid_signature', 'rejected_amount_mismatch', 'rejected_duplicate', 'rejected_order_not_found', 'error'])
                ->default('processed')
                ->comment('Resultado del procesamiento');

            // Timestamp en que fue procesado por nuestra aplicación
            $table->timestamp('processed_at')->useCurrent()->comment('Fecha/hora de procesamiento');

            $table->index(['reference', 'transaction_status']);
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wompi_webhook_events');
    }
};
