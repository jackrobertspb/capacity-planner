<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('calendar');
    }
    return redirect()->route('login');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route('calendar');
    })->name('dashboard');

    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/password', [ProfileController::class, 'updatePassword'])->name('password.update');

    // Projects API
    Route::apiResource('projects', \App\Http\Controllers\ProjectController::class)->only(['store', 'update', 'destroy']);

    // Project Allocations API
    Route::apiResource('allocations', \App\Http\Controllers\ProjectAllocationController::class);

    // Annual Leave API
    Route::delete('/annual-leave/clear-all', [\App\Http\Controllers\AnnualLeaveController::class, 'clearAll'])->name('annual-leave.clear-all');
    Route::apiResource('annual-leave', \App\Http\Controllers\AnnualLeaveController::class)->only(['store', 'update', 'destroy']);

    // Calendar Markers API
    Route::apiResource('markers', \App\Http\Controllers\CalendarMarkerController::class);
});
