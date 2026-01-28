<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function store(Request $request)
    {
        // Only admins can create employees
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'numeric', 'min:0', 'max:7'],
            'can_access_workspace' => ['nullable', 'boolean'],
            'email' => ['nullable', 'required_if:can_access_workspace,true', 'string', 'email', 'max:255', 'unique:users'],
            'role' => ['nullable', Rule::in(['guest', 'user', 'admin'])],
        ]);

        try {
            DB::beginTransaction();

            // Create employee
            $employee = Employee::create([
                'name' => trim($validated['first_name'] . ' ' . $validated['last_name']),
                'work_days' => $this->capacityToWorkDays($validated['capacity']),
                'is_visible' => true,
                'annual_leave_default' => 25,
            ]);

            // If "Can access workspace" is enabled, create a user account
            if ($validated['can_access_workspace'] ?? false) {
                $user = User::create([
                    'name' => $employee->name,
                    'email' => $validated['email'],
                    'password' => Hash::make(bin2hex(random_bytes(16))), // Generate random password
                    'role' => $validated['role'] ?? 'user',
                    'work_days' => $employee->work_days,
                    'annual_leave_default' => $employee->annual_leave_default,
                    'is_visible' => true,
                    'status' => 'invited',
                    'invited_at' => now(),
                    'invited_by' => $request->user()->id,
                ]);

                // Generate invitation token
                $user->generateInvitationToken();

                // Link employee to user
                $employee->user_id = $user->id;
                $employee->save();

                // TODO: Send invitation email
                // Mail::to($user->email)->send(new InvitationMail($user));
            }

            DB::commit();

            return response()->json([
                'message' => 'Employee created successfully',
                'employee' => $employee->fresh()->load('user'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create employee',
                'error' => $e->getMessage()
            ], 500);
        }
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

    /**
     * Convert capacity (days per week) to work_days array.
     * For simplicity, we'll assume Mon-Fri for capacities <= 5, and add Sat/Sun for higher values.
     */
    private function capacityToWorkDays(float $capacity): array
    {
        if ($capacity >= 7) {
            return [1, 2, 3, 4, 5, 6, 7]; // Mon-Sun
        } elseif ($capacity >= 6) {
            return [1, 2, 3, 4, 5, 6]; // Mon-Sat
        } elseif ($capacity >= 5) {
            return [1, 2, 3, 4, 5]; // Mon-Fri
        } elseif ($capacity >= 4) {
            return [1, 2, 3, 4]; // Mon-Thu
        } elseif ($capacity >= 3) {
            return [1, 2, 3]; // Mon-Wed
        } elseif ($capacity >= 2) {
            return [1, 2]; // Mon-Tue
        } elseif ($capacity >= 1) {
            return [1]; // Mon only
        } else {
            return [];
        }
    }
}
