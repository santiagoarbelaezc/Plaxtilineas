<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_historial', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 100);
            $table->string('rol', 20);
            $table->text('mensaje');
            $table->timestamps();

            $table->index('session_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_historial');
    }
};
