<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function store(Request $request)
    {
        // Only admins can create users
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['guest', 'user', 'admin'])],
            'work_days' => ['nullable', 'array'],
            'annual_leave_default' => ['nullable', 'integer', 'min:0', 'max:365'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'work_days' => $validated['work_days'] ?? [1, 2, 3, 4, 5],
            'annual_leave_default' => $validated['annual_leave_default'] ?? 25,
            'is_visible' => $validated['is_visible'] ?? true,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        // Only admins can update users
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(['guest', 'user', 'admin'])],
            'work_days' => ['nullable', 'array'],
            'annual_leave_default' => ['nullable', 'integer', 'min:0', 'max:365'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->role = $validated['role'];
        $user->work_days = $validated['work_days'] ?? $user->work_days;
        $user->annual_leave_default = $validated['annual_leave_default'] ?? $user->annual_leave_default;
        $user->is_visible = $validated['is_visible'] ?? $user->is_visible;
        $user->save();

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user,
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        // Only admins can delete users
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Prevent deleting yourself
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 400);
        }

        // Delete related records first
        $user->allocations()->delete();
        $user->annualLeave()->delete();
        $user->calendarMarkers()->delete();

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }
}
