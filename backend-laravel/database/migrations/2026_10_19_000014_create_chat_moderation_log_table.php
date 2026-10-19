<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_moderation_log', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 100);
            $table->string('ip', 45);
            $table->text('mensaje');
            $table->string('razon', 100);
            $table->tinyInteger('nivel')->default(1);
            $table->timestamps();

            $table->index('session_id');
            $table->index('ip');
            $table->index('razon');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_moderation_log');
    }
};
