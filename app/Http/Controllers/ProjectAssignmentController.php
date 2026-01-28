<?php

namespace App\Http\Controllers;

use App\Models\ProjectAssignment;
use Illuminate\Http\Request;

class ProjectAssignmentController extends Controller
{
    /**
     * Store a new project assignment.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'project_id' => ['required', 'exists:projects,id'],
        ]);

        // Check if assignment already exists
        $existing = ProjectAssignment::where('employee_id', $validated['employee_id'])
            ->where('project_id', $validated['project_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Project is already assigned to this employee',
                'assignment' => $existing,
            ], 200);
        }

        $assignment = ProjectAssignment::create($validated);

        return response()->json([
            'message' => 'Project assigned successfully',
            'assignment' => $assignment->load(['employee', 'project']),
        ], 201);
    }

    /**
     * Remove a project assignment.
     */
    public function destroy(ProjectAssignment $assignment)
    {
        $assignment->delete();

        return response()->json([
            'message' => 'Assignment removed successfully',
        ]);
    }

    /**
     * Remove assignment by employee and project IDs.
     */
    public function destroyByIds(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'project_id' => ['required', 'exists:projects,id'],
        ]);

        $deleted = ProjectAssignment::where('employee_id', $validated['employee_id'])
            ->where('project_id', $validated['project_id'])
            ->delete();

        return response()->json([
            'message' => $deleted ? 'Assignment removed successfully' : 'Assignment not found',
        ]);
    }
}
