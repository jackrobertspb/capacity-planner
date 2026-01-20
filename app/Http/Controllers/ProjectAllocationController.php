<?php

namespace App\Http\Controllers;

use App\Models\AnnualLeave;
use App\Models\Project;
use App\Models\ProjectAllocation;
use App\Models\User;
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
            'user_id' => 'nullable|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $query = ProjectAllocation::with(['user', 'project']);

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

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        return response()->json($query->get()->map(function ($allocation) {
            return [
                'id' => $allocation->id,
                'user_id' => $allocation->user_id,
                'project_id' => $allocation->project_id,
                'type' => $allocation->type,
                'title' => $allocation->title,
                'start_date' => $allocation->start_date ? $allocation->start_date->toDateString() : null,
                'end_date' => $allocation->end_date ? $allocation->end_date->toDateString() : null,
                'days_per_week' => (float) $allocation->days_per_week,
                'notes' => $allocation->notes,
                'user' => $allocation->user ? [
                    'id' => $allocation->user->id,
                    'name' => $allocation->user->name,
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
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
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
            $validated['user_id'],
            $validated['start_date'],
            $validated['end_date']
        );

        $allocation = ProjectAllocation::create($validated);

        return response()->json([
            'allocation' => [
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
            ],
            'warnings' => $warnings,
        ], 201);
    }

    /**
     * Update the specified allocation.
     */
    public function update(Request $request, ProjectAllocation $projectAllocation)
    {
        $validated = $request->validate([
            'user_id' => 'sometimes|required|exists:users,id',
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
            $startDate = $validated['start_date'] ?? ($projectAllocation->start_date ? $projectAllocation->start_date->toDateString() : null);
            $endDate = $validated['end_date'] ?? ($projectAllocation->end_date ? $projectAllocation->end_date->toDateString() : null);
            $userId = $validated['user_id'] ?? $projectAllocation->user_id;

            if ($startDate && $endDate) {
                $warnings = $this->checkAnnualLeaveConflicts($userId, $startDate, $endDate);
            }
        }

        $projectAllocation->update($validated);
        $projectAllocation->refresh();
        $projectAllocation->load(['user', 'project']);

        return response()->json([
            'allocation' => [
                'id' => $projectAllocation->id,
                'user_id' => $projectAllocation->user_id,
                'project_id' => $projectAllocation->project_id,
                'type' => $projectAllocation->type,
                'title' => $projectAllocation->title,
                'start_date' => $projectAllocation->start_date ? $projectAllocation->start_date->toDateString() : null,
                'end_date' => $projectAllocation->end_date ? $projectAllocation->end_date->toDateString() : null,
                'days_per_week' => (float) $projectAllocation->days_per_week,
                'notes' => $projectAllocation->notes,
                'project' => $projectAllocation->project ? [
                    'id' => $projectAllocation->project->id,
                    'name' => $projectAllocation->project->name,
                    'color' => $projectAllocation->project->color,
                ] : null,
            ],
            'warnings' => $warnings,
        ]);
    }

    /**
     * Remove the specified allocation.
     */
    public function destroy(ProjectAllocation $projectAllocation)
    {
        $projectAllocation->delete();

        return response()->json(['message' => 'Allocation deleted successfully']);
    }

    /**
     * Check for annual leave conflicts.
     */
    private function checkAnnualLeaveConflicts($userId, $startDate, $endDate)
    {
        $conflicts = AnnualLeave::where('user_id', $userId)
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


