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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('work_days')->default('[1,2,3,4,5]')->comment('JSON array of working days [1-7] where 1=Monday');
            $table->boolean('is_visible')->default(true)->comment('Whether employee is visible in calendar');
            $table->integer('annual_leave_default')->default(25)->comment('Default annual leave days per year');
            $table->timestamps();
            $table->softDeletes();
        });

        // Add employee_id to project_allocations (nullable for migration)
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained()->onDelete('cascade');
        });

        // Add employee_id to annual_leave (nullable for migration)
        Schema::table('annual_leave', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained()->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('annual_leave', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn('employee_id');
        });

        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn('employee_id');
        });

        Schema::dropIfExists('employees');
    }
};
