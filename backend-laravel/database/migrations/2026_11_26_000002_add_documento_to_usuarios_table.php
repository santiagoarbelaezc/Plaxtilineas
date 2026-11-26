<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            if (! Schema::hasColumn('usuarios', 'tipo_documento')) {
                $table->string('tipo_documento', 10)->nullable()->after('apellidos');
            }
            if (! Schema::hasColumn('usuarios', 'numero_documento')) {
                $table->string('numero_documento', 30)->nullable()->index()->after('tipo_documento');
            }
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            if (Schema::hasColumn('usuarios', 'numero_documento')) {
                $table->dropIndex(['numero_documento']);
                $table->dropColumn('numero_documento');
            }
            if (Schema::hasColumn('usuarios', 'tipo_documento')) {
                $table->dropColumn('tipo_documento');
            }
        });
    }
};
