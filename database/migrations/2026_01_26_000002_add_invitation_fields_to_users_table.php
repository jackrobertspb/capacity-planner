<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('supabase_id')->nullable()->unique()->after('id');
            $table->enum('status', ['invited', 'active', 'disabled'])->default('active')->after('role');
            $table->timestamp('invited_at')->nullable()->after('status');
            $table->foreignId('invited_by')->nullable()->after('invited_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['invited_by']);
            $table->dropColumn(['supabase_id', 'status', 'invited_at', 'invited_by']);
        });
    }
};
