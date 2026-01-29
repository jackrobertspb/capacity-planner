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
        Schema::create('project_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained()->onDelete('cascade');
            $table->enum('type', ['project', 'sla', 'misc'])->default('project');
            $table->string('title')->nullable()->comment('Custom title for SLA/misc blocks');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days_per_week', 3, 1)->default(5.0)->comment('Number of days allocated per week');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'start_date', 'end_date']);
            $table->index(['project_id', 'start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_allocations');
    }
};
