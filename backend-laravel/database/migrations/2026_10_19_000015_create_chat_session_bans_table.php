<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_session_bans', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 100)->unique();
            $table->string('ip', 45);
            $table->string('razon', 200);
            $table->timestamp('banned_until');
            $table->timestamps();

            $table->index('ip');
            $table->index('banned_until');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_session_bans');
    }
};
