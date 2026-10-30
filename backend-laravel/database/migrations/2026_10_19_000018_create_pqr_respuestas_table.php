<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pqr_respuestas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pqr_id')->constrained('pqrs')->cascadeOnDelete();
            $table->text('mensaje');
            $table->string('tipo', 50);
            $table->timestamp('fecha_creacion')->nullable()->useCurrent();

            $table->index('pqr_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pqr_respuestas');
    }
};
