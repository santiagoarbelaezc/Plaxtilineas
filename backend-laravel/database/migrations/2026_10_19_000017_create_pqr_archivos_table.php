<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pqr_archivos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pqr_id')->constrained('pqrs')->cascadeOnDelete();
            $table->string('nombre_archivo');
            $table->string('url_archivo', 500);
            $table->string('tipo_archivo', 50);
            $table->timestamps();

            $table->index('pqr_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pqr_archivos');
    }
};
