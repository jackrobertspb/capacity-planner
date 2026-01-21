<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Attempt to send the password reset link
        // We silently ignore whether the email exists to prevent email enumeration attacks
        Password::sendResetLink(
            $request->only('email')
        );

        // Always return success message regardless of whether the email exists
        // This prevents attackers from discovering valid email addresses
        return back()->with('status', 'If an account exists with that email address, a password reset link has been sent.');
    }
}
