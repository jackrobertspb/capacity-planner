<?php

namespace App\Http\Controllers;

use App\Models\AnnualLeave;
use App\Models\CalendarMarker;
use App\Models\Employee;
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
        // Default to showing previous month, current month, and next month
        $defaultStart = now()->subMonth()->startOfMonth()->toDateString();
        $defaultEnd = now()->addMonth()->endOfMonth()->toDateString();

        $startDate = $request->input('start_date', $defaultStart);
        $endDate = $request->input('end_date', $defaultEnd);

        // Get visible employees for capacity planning
        $employees = Employee::where('is_visible', true)
            ->orderBy('name')
            ->get()
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'work_days' => $employee->work_days ?? [1, 2, 3, 4, 5],
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

        // Get project allocations filtered by date range (with overlap handling)
        $allocations = ProjectAllocation::with(['employee', 'project'])
            ->where(function($query) use ($startDate, $endDate) {
                $query->where(function($q) use ($startDate, $endDate) {
                    // Starts within range
                    $q->whereBetween('start_date', [$startDate, $endDate]);
                })->orWhere(function($q) use ($startDate, $endDate) {
                    // Ends within range
                    $q->whereBetween('end_date', [$startDate, $endDate]);
                })->orWhere(function($q) use ($startDate, $endDate) {
                    // Spans entire range
                    $q->where('start_date', '<=', $startDate)
                      ->where('end_date', '>=', $endDate);
                });
            })
            ->get()
            ->map(function ($allocation) {
                return [
                    'id' => $allocation->id,
                    'employee_id' => $allocation->employee_id,
                    'project_id' => $allocation->project_id,
                    'type' => $allocation->type,
                    'title' => $allocation->title,
                    'start_date' => $allocation->start_date ? $allocation->start_date->toDateString() : null,
                    'end_date' => $allocation->end_date ? $allocation->end_date->toDateString() : null,
                    'days_per_week' => (float) $allocation->days_per_week,
                    'notes' => $allocation->notes,
                    'project' => $allocation->project ? [
                        'id' => $allocation->project->id,
                        'name' => $allocation->project->name,
                        'color' => $allocation->project->color,
                    ] : null,
                ];
            });

        // Get annual leave filtered by date range (with overlap handling)
        $annualLeave = AnnualLeave::with('employee')
            ->where(function($query) use ($startDate, $endDate) {
                $query->where(function($q) use ($startDate, $endDate) {
                    // Starts within range
                    $q->whereBetween('start_date', [$startDate, $endDate]);
                })->orWhere(function($q) use ($startDate, $endDate) {
                    // Ends within range
                    $q->whereBetween('end_date', [$startDate, $endDate]);
                })->orWhere(function($q) use ($startDate, $endDate) {
                    // Spans entire range
                    $q->where('start_date', '<=', $startDate)
                      ->where('end_date', '>=', $endDate);
                });
            })
            ->get()
            ->map(function ($leave) {
                return [
                    'id' => $leave->id,
                    'employee_id' => $leave->employee_id,
                    'start_date' => $leave->start_date ? $leave->start_date->toDateString() : null,
                    'end_date' => $leave->end_date ? $leave->end_date->toDateString() : null,
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
                    'date' => $marker->date ? $marker->date->toDateString() : null,
                    'title' => $marker->title,
                    'description' => $marker->description,
                    'color' => $marker->color,
                    'type' => $marker->type,
                ];
            });

        return Inertia::render('Calendar', [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'employees' => $employees,
            'projects' => $projects,
            'allocations' => $allocations,
            'annualLeave' => $annualLeave,
            'markers' => $markers,
        ]);
    }
}


