<?php

namespace App\Http\Controllers;

use App\Models\AnnualLeave;
use App\Models\CalendarMarker;
use App\Models\Project;
use App\Models\ProjectAllocation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * Display the calendar page.
     */
    public function index(Request $request): Response
    {
        // Default to showing current month with full calendar grid (including padding days)
        $defaultStart = now()->startOfMonth()->startOfWeek(\Carbon\Carbon::MONDAY)->toDateString();
        $defaultEnd = now()->endOfMonth()->endOfWeek(\Carbon\Carbon::MONDAY)->toDateString();

        $startDate = $request->input('start_date', $defaultStart);
        $endDate = $request->input('end_date', $defaultEnd);

        // Get visible employees
        $users = User::where('is_visible', true)
            ->where('role', '!=', 'guest')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'work_days' => $user->work_days ?? [1, 2, 3, 4, 5],
                ];
            });

        // Get visible projects
        $projects = Project::where('is_visible', true)
            ->orderBy('name')
            ->get()
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'color' => $project->color,
                    'description' => $project->description,
                ];
            });

        // Get all project allocations (no date filtering to show everything)
        $allocations = ProjectAllocation::with(['user', 'project'])
            ->get()
            ->map(function ($allocation) {
                return [
                    'id' => $allocation->id,
                    'user_id' => $allocation->user_id,
                    'project_id' => $allocation->project_id,
                    'type' => $allocation->type,
                    'title' => $allocation->title,
                    'start_date' => $allocation->start_date->toDateString(),
                    'end_date' => $allocation->end_date->toDateString(),
                    'days_per_week' => (float) $allocation->days_per_week,
                    'notes' => $allocation->notes,
                    'project' => $allocation->project ? [
                        'id' => $allocation->project->id,
                        'name' => $allocation->project->name,
                        'color' => $allocation->project->color,
                    ] : null,
                ];
            });

        // Get all annual leave (no date filtering to show everything)
        $annualLeave = AnnualLeave::with('user')
            ->get()
            ->map(function ($leave) {
                return [
                    'id' => $leave->id,
                    'user_id' => $leave->user_id,
                    'start_date' => $leave->start_date->toDateString(),
                    'end_date' => $leave->end_date->toDateString(),
                    'days_count' => $leave->days_count,
                    'notes' => $leave->notes,
                ];
            });

        // Get calendar markers for date range
        $markers = CalendarMarker::with('user')
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->map(function ($marker) {
                return [
                    'id' => $marker->id,
                    'date' => $marker->date->toDateString(),
                    'title' => $marker->title,
                    'description' => $marker->description,
                    'color' => $marker->color,
                    'type' => $marker->type,
                ];
            });

        return Inertia::render('Calendar', [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'users' => $users,
            'projects' => $projects,
            'allocations' => $allocations,
            'annualLeave' => $annualLeave,
            'markers' => $markers,
        ]);
    }
}


