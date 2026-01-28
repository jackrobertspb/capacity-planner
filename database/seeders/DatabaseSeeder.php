<?php

namespace Database\Seeders;

use App\Models\AnnualLeave;
use App\Models\CalendarMarker;
use App\Models\Project;
use App\Models\ProjectAllocation;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User (or get existing)
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'work_days' => [1, 2, 3, 4, 5], // Mon-Fri
                'is_visible' => true,
                'annual_leave_default' => 25,
            ]
        );

        // Create Regular Users (Employees)
        $employee1 = User::firstOrCreate(
            ['email' => 'john@example.com'],
            [
                'name' => 'John Developer',
                'password' => Hash::make('password'),
                'role' => 'user',
                'work_days' => [1, 2, 3, 4, 5], // Mon-Fri
                'is_visible' => true,
                'annual_leave_default' => 25,
            ]
        );

        $employee2 = User::firstOrCreate(
            ['email' => 'jane@example.com'],
            [
                'name' => 'Jane Designer',
                'password' => Hash::make('password'),
                'role' => 'user',
                'work_days' => [1, 2, 3, 4], // Mon-Thu
                'is_visible' => true,
                'annual_leave_default' => 20,
            ]
        );

        // Create Projects
        $project1 = Project::firstOrCreate(
            ['name' => 'Website Redesign'],
            [
                'description' => 'Complete overhaul of company website',
                'color' => '#3b82f6',
                'is_visible' => true,
            ]
        );

        $project2 = Project::firstOrCreate(
            ['name' => 'Mobile App Development'],
            [
                'description' => 'New mobile application for iOS and Android',
                'color' => '#10b981',
                'is_visible' => true,
            ]
        );

        $project3 = Project::firstOrCreate(
            ['name' => 'API Integration'],
            [
                'description' => 'Third-party API integrations',
                'color' => '#f59e0b',
                'is_visible' => true,
            ]
        );

        // Create Project Allocations (only if they don't exist)
        ProjectAllocation::firstOrCreate(
            [
                'user_id' => $employee1->id,
                'project_id' => $project1->id,
                'start_date' => now()->startOfMonth(),
            ],
            [
                'type' => 'project',
                'end_date' => now()->addMonth()->endOfMonth(),
                'days_per_week' => 5.0,
                'notes' => 'Full-time allocation',
            ]
        );

        ProjectAllocation::firstOrCreate(
            [
                'user_id' => $employee2->id,
                'project_id' => $project2->id,
                'start_date' => now()->startOfMonth(),
            ],
            [
                'type' => 'project',
                'end_date' => now()->addWeeks(3),
                'days_per_week' => 3.0,
                'notes' => 'Part-time allocation',
            ]
        );

        // Create SLA Block
        ProjectAllocation::firstOrCreate(
            [
                'user_id' => $employee1->id,
                'type' => 'sla',
                'title' => 'Client Support',
                'start_date' => now()->addMonth(),
            ],
            [
                'project_id' => null,
                'end_date' => now()->addMonths(2),
                'days_per_week' => 2.0,
                'notes' => 'General client support time',
            ]
        );

        // Create Annual Leave
        AnnualLeave::firstOrCreate(
            [
                'user_id' => $employee2->id,
                'start_date' => now()->addWeeks(2),
            ],
            [
                'end_date' => now()->addWeeks(2)->addDays(4),
                'days_count' => 5,
                'notes' => 'Summer vacation',
            ]
        );

        // Create Calendar Markers
        CalendarMarker::firstOrCreate(
            [
                'date' => now()->addMonth()->endOfMonth(),
                'title' => 'Website Launch',
            ],
            [
                'user_id' => $admin->id,
                'description' => 'Official launch of the redesigned website',
                'color' => '#ef4444',
                'type' => 'milestone',
            ]
        );

        CalendarMarker::firstOrCreate(
            [
                'date' => now()->addWeeks(3),
                'title' => 'Team Meeting',
            ],
            [
                'user_id' => $admin->id,
                'description' => 'Quarterly planning session',
                'color' => '#8b5cf6',
                'type' => 'custom',
            ]
        );
    }
}
