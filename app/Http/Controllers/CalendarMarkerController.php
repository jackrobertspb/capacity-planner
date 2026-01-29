<?php

namespace App\Http\Controllers;

use App\Models\CalendarMarker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CalendarMarkerController extends Controller
{
    /**
     * Display a listing of markers for a date range.
     */
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $markers = CalendarMarker::with('user')
            ->whereBetween('date', [$request->start_date, $request->end_date])
            ->get()
            ->map(function ($marker) {
                return [
                    'id' => $marker->id,
                    'user_id' => $marker->user_id,
                    'date' => $marker->date ? $marker->date->toDateString() : null,
                    'title' => $marker->title,
                    'description' => $marker->description,
                    'color' => $marker->color,
                    'type' => $marker->type,
                    'user' => $marker->user ? [
                        'id' => $marker->user->id,
                        'name' => $marker->user->name,
                    ] : null,
                ];
            });

        return response()->json($markers);
    }

    /**
     * Store a newly created marker.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'type' => 'nullable|in:custom,project_end,milestone',
        ]);

        // Set user_id to current user if not provided
        if (!isset($validated['user_id'])) {
            $validated['user_id'] = Auth::id();
        }

        // Set defaults
        $validated['color'] = $validated['color'] ?? '#ef4444';
        $validated['type'] = $validated['type'] ?? 'custom';

        $marker = CalendarMarker::create($validated);
        $marker->load('user');

        return response()->json([
            'marker' => [
                'id' => $marker->id,
                'user_id' => $marker->user_id,
                'date' => $marker->date ? $marker->date->toDateString() : null,
                'title' => $marker->title,
                'description' => $marker->description,
                'color' => $marker->color,
                'type' => $marker->type,
                'user' => $marker->user ? [
                    'id' => $marker->user->id,
                    'name' => $marker->user->name,
                ] : null,
            ],
        ], 201);
    }

    /**
     * Update the specified marker.
     */
    public function update(Request $request, CalendarMarker $calendarMarker)
    {
        // Check if user can edit this marker (must be creator or admin)
        if ($calendarMarker->user_id && $calendarMarker->user_id !== Auth::id() && !Auth::user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date' => 'sometimes|required|date',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'type' => 'nullable|in:custom,project_end,milestone',
        ]);

        $calendarMarker->update($validated);
        $calendarMarker->refresh();
        $calendarMarker->load('user');

        return response()->json([
            'marker' => [
                'id' => $calendarMarker->id,
                'user_id' => $calendarMarker->user_id,
                'date' => $calendarMarker->date ? $calendarMarker->date->toDateString() : null,
                'title' => $calendarMarker->title,
                'description' => $calendarMarker->description,
                'color' => $calendarMarker->color,
                'type' => $calendarMarker->type,
                'user' => $calendarMarker->user ? [
                    'id' => $calendarMarker->user->id,
                    'name' => $calendarMarker->user->name,
                ] : null,
            ],
        ]);
    }

    /**
     * Remove the specified marker.
     */
    public function destroy(CalendarMarker $calendarMarker)
    {
        // Check if user can delete this marker (must be creator or admin)
        if ($calendarMarker->user_id && $calendarMarker->user_id !== Auth::id() && !Auth::user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $calendarMarker->delete();

        return response()->json(['message' => 'Marker deleted successfully']);
    }
}


