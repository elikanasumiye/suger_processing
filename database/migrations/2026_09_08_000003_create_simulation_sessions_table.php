<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('simulation_sessions')) {
            Schema::create('simulation_sessions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('student_name');
                $table->string('experiment');
                $table->string('sample_name');
                $table->string('status')->default('in_progress');
                $table->decimal('result', 10, 2)->nullable();
                $table->string('unit')->nullable();
                $table->json('payload')->nullable();
                $table->timestamps();
            });
        } elseif (! Schema::hasColumn('simulation_sessions', 'user_id')) {
            Schema::table('simulation_sessions', function (Blueprint $table): void {
                $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('simulation_sessions');
    }
};