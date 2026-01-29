<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class InvitationController extends Controller
{
    /**
     * Create a new invitation and return the invitation URL.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', 'in:user,admin'],
        ]);

        $user = User::create([
            'name' => trim($validated['first_name'] . ' ' . $validated['last_name']),
            'email' => $validated['email'],
            'password' => Hash::make(bin2hex(random_bytes(16))), // Random password, will be set on completion
            'role' => $validated['role'],
            'status' => 'invited',
            'invited_at' => now(),
            'invited_by' => Auth::id(),
            'work_days' => [1, 2, 3, 4, 5],
            'annual_leave_default' => 25,
            'is_visible' => true,
        ]);

        $user->generateInvitationToken();

        return response()->json([
            'success' => true,
            'invitation_url' => $user->getInvitationUrl(),
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    }

    /**
     * Show the complete registration form for an invitation.
     */
    public function show(string $token)
    {
        $user = User::where('invitation_token', $token)->first();

        if (!$user) {
            return Inertia::render('Auth/InvitationExpired', [
                'message' => 'This invitation link is invalid.',
            ]);
        }

        if (!$user->hasValidInvitation()) {
            return Inertia::render('Auth/InvitationExpired', [
                'message' => 'This invitation has expired. Please contact your administrator for a new invitation.',
            ]);
        }

        return Inertia::render('Auth/CompleteRegistration', [
            'token' => $token,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Complete the registration by setting the password.
     */
    public function complete(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::where('invitation_token', $validated['token'])->first();

        if (!$user || !$user->hasValidInvitation()) {
            return back()->withErrors([
                'token' => 'This invitation is invalid or has expired.',
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'status' => 'active',
            'invitation_token' => null,
            'invitation_expires_at' => null,
            'email_verified_at' => now(),
        ]);

        Auth::login($user);

        return redirect()->intended('/calendar');
    }
}
