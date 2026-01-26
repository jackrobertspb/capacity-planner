<?php

namespace App\Http\Controllers;

use App\Models\AnnualLeave;
use Illuminate\Http\Request;

class AnnualLeaveController extends Controller
{
    public function store(Request $request)
    {
        \Log::info('=== ANNUAL LEAVE STORE DEBUG ===');
        \Log::info('Request data:', $request->all());
        \Log::info('Headers:', $request->headers->all());

        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'days_count' => 'required|integer|min:1',
                'status' => 'sometimes|in:pending,approved,rejected',
            ]);

            \Log::info('Validated data:', $validated);

            $leave = AnnualLeave::create($validated);

            \Log::info('Leave created successfully:', $leave->toArray());

            return response()->json($leave, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed:', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Failed to create annual leave:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
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

