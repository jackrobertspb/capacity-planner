<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('calendar');
    }
    return redirect()->route('login');
});

// Invitation routes (guest accessible)
Route::get('/invitation/{token}', [InvitationController::class, 'show'])->name('invitation.show');
Route::post('/invitation/complete', [InvitationController::class, 'complete'])->name('invitation.complete');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route('calendar');
    })->name('dashboard');

    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');
    
    Route::get('/projects', function () {
        $projects = \App\Models\Project::orderBy('name')->get()->map(function ($project) {
            return [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'color' => $project->color,
                'status' => $project->status,
                'is_visible' => $project->is_visible,
            ];
        });
        
        return Inertia::render('Projects', [
            'projects' => $projects,
        ]);
    })->name('projects');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/password', [ProfileController::class, 'updatePassword'])->name('password.update');

    // User Management Page
    Route::get('/users', function () {
        // Only admins can access user management
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        $users = \App\Models\User::orderBy('name')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'work_days' => $user->work_days,
                'annual_leave_default' => $user->annual_leave_default,
                'is_visible' => $user->is_visible,
            ];
        });

        return Inertia::render('Users', [
            'users' => $users,
        ]);
    })->name('users.index');

    // Users API
    Route::post('/api/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store');
    Route::put('/api/users/{user}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update');
    Route::delete('/api/users/{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy');

    // Invitations API (admin only)
    Route::post('/api/invitations', [InvitationController::class, 'store'])->name('invitations.store');

    // Employees API
    Route::post('/api/employees', [\App\Http\Controllers\EmployeeController::class, 'store'])->name('employees.store');
    Route::match(['put', 'patch'], '/api/employees/{employee}', [\App\Http\Controllers\EmployeeController::class, 'update'])->name('employees.update');
    Route::delete('/api/employees/{employee}', [\App\Http\Controllers\EmployeeController::class, 'destroy'])->name('employees.destroy');

    // Projects API
    Route::apiResource('projects', \App\Http\Controllers\ProjectController::class)->only(['store', 'update', 'destroy']);

    // Project Allocations API
    Route::apiResource('allocations', \App\Http\Controllers\ProjectAllocationController::class);

    // Project Assignments API (links projects to employees without creating allocations)
    Route::post('/api/assignments', [\App\Http\Controllers\ProjectAssignmentController::class, 'store'])->name('assignments.store');
    Route::delete('/api/assignments/{assignment}', [\App\Http\Controllers\ProjectAssignmentController::class, 'destroy'])->name('assignments.destroy');
    Route::delete('/api/assignments', [\App\Http\Controllers\ProjectAssignmentController::class, 'destroyByIds'])->name('assignments.destroyByIds');

    // Annual Leave API
    Route::delete('/annual-leave/clear-all', [\App\Http\Controllers\AnnualLeaveController::class, 'clearAll'])->name('annual-leave.clear-all');
    Route::apiResource('annual-leave', \App\Http\Controllers\AnnualLeaveController::class)->only(['store', 'update', 'destroy']);

    // Calendar Markers API
    Route::apiResource('markers', \App\Http\Controllers\CalendarMarkerController::class);
});
