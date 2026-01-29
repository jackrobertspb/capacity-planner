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
        Schema::create('calendar_markers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade')->comment('Creator of the marker, null for system/admin markers');
            $table->date('date');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#ef4444')->comment('Hex color code for marker display');
            $table->enum('type', ['custom', 'project_end', 'milestone'])->default('custom');
            $table->timestamps();
            
            $table->index('date');
            $table->index(['date', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calendar_markers');
    }
};
