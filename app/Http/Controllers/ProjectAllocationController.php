<?php

namespace App\Http\Controllers;

use App\Models\AnnualLeave;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectAllocationController extends Controller
{
    /**
     * Display a listing of allocations for a date range.
     */
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employee_id' => 'nullable|exists:employees,id',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $query = ProjectAllocation::with(['employee', 'project']);

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->where(function ($q) use ($request) {
                $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                    ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
                    ->orWhere(function ($q2) use ($request) {
                        $q2->where('start_date', '<=', $request->start_date)
                            ->where('end_date', '>=', $request->end_date);
                    });
            });
        }

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        return response()->json($query->get()->map(function ($allocation) {
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
                'employee' => $allocation->employee ? [
                    'id' => $allocation->employee->id,
                    'name' => $allocation->employee->name,
                ] : null,
                'project' => $allocation->project ? [
                    'id' => $allocation->project->id,
                    'name' => $allocation->project->name,
                    'color' => $allocation->project->color,
                ] : null,
            ];
        }));
    }

    /**
     * Store a newly created allocation.
     */
    public function store(Request $request)
    {
        // Guests cannot create allocations
        if ($request->user()->role === 'guest') {
            return response()->json(['message' => 'Guests cannot create allocations'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'project_id' => 'nullable|exists:projects,id',
            'type' => 'required|in:project,sla,misc',
            'title' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'days_per_week' => 'required|numeric|min:0|max:7',
            'notes' => 'nullable|string',
        ]);

        // Validate project_id is required for project type
        if ($validated['type'] === 'project' && empty($validated['project_id'])) {
            throw ValidationException::withMessages([
                'project_id' => ['Project is required for project type allocations.'],
            ]);
        }

        // Validate title is required for sla/misc types
        if (in_array($validated['type'], ['sla', 'misc']) && empty($validated['title'])) {
            throw ValidationException::withMessages([
                'title' => ['Title is required for SLA and miscellaneous allocations.'],
            ]);
        }

        // Check for annual leave conflicts
        $warnings = $this->checkAnnualLeaveConflicts(
            $validated['employee_id'],
            $validated['start_date'],
            $validated['end_date']
        );

        // Check for adjacent allocations to merge with (same employee, project, type, days_per_week)
        $startDate = \Carbon\Carbon::parse($validated['start_date']);
        $endDate = \Carbon\Carbon::parse($validated['end_date']);

        $adjacentAllocation = ProjectAllocation::where('employee_id', $validated['employee_id'])
            ->where('project_id', $validated['project_id'])
            ->where('type', $validated['type'])
            ->where('days_per_week', $validated['days_per_week'])
            ->where(function ($query) use ($startDate, $endDate) {
                // Find allocations that are adjacent (end date is day before start, or start date is day after end)
                // Or overlapping
                $query->where(function ($q) use ($startDate, $endDate) {
                    // Adjacent: existing end_date is one day before new start_date
                    $q->whereDate('end_date', $startDate->copy()->subDay());
                })->orWhere(function ($q) use ($startDate, $endDate) {
                    // Adjacent: existing start_date is one day after new end_date
                    $q->whereDate('start_date', $endDate->copy()->addDay());
                })->orWhere(function ($q) use ($startDate, $endDate) {
                    // Overlapping or contained
                    $q->whereDate('start_date', '<=', $endDate)
                      ->whereDate('end_date', '>=', $startDate);
                });
            })
            ->first();

        if ($adjacentAllocation) {
            // Merge by extending the existing allocation
            $newStart = min($adjacentAllocation->start_date, $startDate);
            $newEnd = max($adjacentAllocation->end_date, $endDate);
            $adjacentAllocation->update([
                'start_date' => $newStart,
                'end_date' => $newEnd,
            ]);
            $allocation = $adjacentAllocation;
        } else {
            $allocation = ProjectAllocation::create($validated);
        }

        return response()->json([
            'allocation' => [
                'id' => $allocation->id,
                'employee_id' => $allocation->employee_id,
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
            ],
            'warnings' => $warnings,
        ], 201);
    }

    /**
     * Update the specified allocation.
     */
    public function update(Request $request, ProjectAllocation $allocation)
    {
        // Guests cannot update allocations
        if ($request->user()->role === 'guest') {
            return response()->json(['message' => 'Guests cannot update allocations'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'sometimes|required|exists:employees,id',
            'project_id' => 'nullable|exists:projects,id',
            'type' => 'sometimes|required|in:project,sla,misc',
            'title' => 'nullable|string|max:255',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'days_per_week' => 'sometimes|required|numeric|min:0|max:7',
            'notes' => 'nullable|string',
        ]);

        // Validate project_id is required for project type
        if (isset($validated['type']) && $validated['type'] === 'project' && empty($validated['project_id'])) {
            throw ValidationException::withMessages([
                'project_id' => ['Project is required for project type allocations.'],
            ]);
        }

        // Validate title is required for sla/misc types
        if (isset($validated['type']) && in_array($validated['type'], ['sla', 'misc']) && empty($validated['title'])) {
            throw ValidationException::withMessages([
                'title' => ['Title is required for SLA and miscellaneous allocations.'],
            ]);
        }

        // Check for annual leave conflicts if dates are being updated
        $warnings = [];
        if (isset($validated['start_date']) || isset($validated['end_date'])) {
            $startDate = $validated['start_date'] ?? ($allocation->start_date ? $allocation->start_date->toDateString() : null);
            $endDate = $validated['end_date'] ?? ($allocation->end_date ? $allocation->end_date->toDateString() : null);
            $employeeId = $validated['employee_id'] ?? $allocation->employee_id;

            if ($startDate && $endDate) {
                $warnings = $this->checkAnnualLeaveConflicts($employeeId, $startDate, $endDate);
            }
        }

        $allocation->update($validated);
        $allocation->refresh();

        // Check for adjacent/overlapping allocations to merge with (same employee, project, type, days_per_week)
        $mergedIds = [];
        if ($allocation->start_date && $allocation->end_date) {
            $adjacentAllocations = ProjectAllocation::where('id', '!=', $allocation->id)
                ->where('employee_id', $allocation->employee_id)
                ->where('project_id', $allocation->project_id)
                ->where('type', $allocation->type)
                ->where('days_per_week', $allocation->days_per_week)
                ->where(function ($query) use ($allocation) {
                    $query->where(function ($q) use ($allocation) {
                        // Adjacent: other end_date is one day before this start_date
                        $q->whereDate('end_date', $allocation->start_date->copy()->subDay());
                    })->orWhere(function ($q) use ($allocation) {
                        // Adjacent: other start_date is one day after this end_date
                        $q->whereDate('start_date', $allocation->end_date->copy()->addDay());
                    })->orWhere(function ($q) use ($allocation) {
                        // Overlapping or contained
                        $q->whereDate('start_date', '<=', $allocation->end_date)
                          ->whereDate('end_date', '>=', $allocation->start_date);
                    });
                })
                ->get();

            if ($adjacentAllocations->isNotEmpty()) {
                // Calculate the merged date range
                $newStart = $allocation->start_date;
                $newEnd = $allocation->end_date;

                foreach ($adjacentAllocations as $adjacent) {
                    $newStart = min($newStart, $adjacent->start_date);
                    $newEnd = max($newEnd, $adjacent->end_date);
                    $mergedIds[] = $adjacent->id;
                }

                // Delete the adjacent allocations
                ProjectAllocation::whereIn('id', $mergedIds)->delete();

                // Update the current allocation with the merged range
                $allocation->update([
                    'start_date' => $newStart,
                    'end_date' => $newEnd,
                ]);
                $allocation->refresh();
            }
        }

        $allocation->load(['employee', 'project']);

        return response()->json([
            'allocation' => [
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
            ],
            'warnings' => $warnings,
            'merged_ids' => $mergedIds,
        ]);
    }

    /**
     * Remove the specified allocation.
     */
    public function destroy(Request $request, ProjectAllocation $allocation)
    {
        // Guests cannot delete allocations
        if ($request->user()->role === 'guest') {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Guests cannot delete allocations'], 403);
            }
            return back()->with('error', 'Guests cannot delete allocations');
        }

        $allocation->delete();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Allocation deleted successfully']);
        }

        return back();
    }

    /**
     * Check for annual leave conflicts.
     */
    private function checkAnnualLeaveConflicts($employeeId, $startDate, $endDate)
    {
        $conflicts = AnnualLeave::where('employee_id', $employeeId)
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('start_date', [$startDate, $endDate])
                    ->orWhereBetween('end_date', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('start_date', '<=', $startDate)
                            ->where('end_date', '>=', $endDate);
                    });
            })
            ->get();

        if ($conflicts->isEmpty()) {
            return [];
        }

        return $conflicts->map(function ($leave) {
            return [
                'message' => "Employee has annual leave from {$leave->start_date->format('M d, Y')} to {$leave->end_date->format('M d, Y')} ({$leave->days_count} days)",
                'leave' => [
                    'id' => $leave->id,
                    'start_date' => $leave->start_date->toDateString(),
                    'end_date' => $leave->end_date->toDateString(),
                    'days_count' => $leave->days_count,
                ],
            ];
        })->toArray();
    }
}


