<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->string('role')->default('student')->after('email');
            });
        }

        if (! Schema::hasColumn('simulation_sessions', 'user_id')) {
            Schema::table('simulation_sessions', function (Blueprint $table): void {
                $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('simulation_sessions', 'user_id')) {
            Schema::table('simulation_sessions', fn (Blueprint $table) => $table->dropForeign(['user_id'])->dropColumn('user_id'));
        }
        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
        }
    }
};