<?php

namespace App\Http\Controllers;

use App\Models\AnnualLeave;
use Illuminate\Http\Request;

class AnnualLeaveController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'days_count' => 'required|integer|min:1',
            'status' => 'required|in:pending,approved,rejected',
        ]);

        $leave = AnnualLeave::create($validated);

        return response()->json($leave, 201);
    }

    public function update(Request $request, AnnualLeave $annualLeave)
    {
        $validated = $request->validate([
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'days_count' => 'sometimes|integer|min:1',
            'status' => 'sometimes|in:pending,approved,rejected',
        ]);

        $annualLeave->update($validated);

        return response()->json($annualLeave);
    }

    public function destroy(AnnualLeave $annualLeave)
    {
        $annualLeave->delete();

        return response()->json(null, 204);
    }

    public function clearAll()
    {
        AnnualLeave::truncate();

        return response()->json(['message' => 'All leave entries cleared'], 200);
    }
}

