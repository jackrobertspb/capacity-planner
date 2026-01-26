<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'work_days' => ['nullable', 'array'],
            'annual_leave_default' => ['nullable', 'integer', 'min:0', 'max:365'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $employee = Employee::create([
            'name' => $validated['name'],
            'work_days' => $validated['work_days'] ?? [1, 2, 3, 4, 5],
            'annual_leave_default' => $validated['annual_leave_default'] ?? 25,
            'is_visible' => $validated['is_visible'] ?? true,
        ]);

        return response()->json([
            'message' => 'Employee created successfully',
            'employee' => $employee,
        ], 201);
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'work_days' => ['nullable', 'array'],
            'annual_leave_default' => ['nullable', 'integer', 'min:0', 'max:365'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['name'])) {
            $employee->name = $validated['name'];
        }
        if (isset($validated['work_days'])) {
            $employee->work_days = $validated['work_days'];
        }
        if (isset($validated['annual_leave_default'])) {
            $employee->annual_leave_default = $validated['annual_leave_default'];
        }
        if (isset($validated['is_visible'])) {
            $employee->is_visible = $validated['is_visible'];
        }
        $employee->save();

        return response()->json([
            'message' => 'Employee updated successfully',
            'employee' => $employee,
        ]);
    }

    public function destroy(Employee $employee)
    {
        // Delete related records first
        $employee->allocations()->delete();
        $employee->annualLeave()->delete();

        $employee->delete();

        return response()->json([
            'message' => 'Employee deleted successfully',
        ]);
    }
}
