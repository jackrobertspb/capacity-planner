<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'work_days',
        'is_visible',
        'annual_leave_default',
        'supabase_id',
        'status',
        'invited_at',
        'invited_by',
        'invitation_token',
        'invitation_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'work_days' => 'array',
            'is_visible' => 'boolean',
            'annual_leave_default' => 'integer',
            'invited_at' => 'datetime',
            'invitation_expires_at' => 'datetime',
        ];
    }

    /**
     * Determine if the user can access the Filament panel.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        return $this->isAdmin();
    }

    /**
     * Get the project allocations for the user.
     */
    public function projectAllocations(): HasMany
    {
        return $this->hasMany(ProjectAllocation::class);
    }

    /**
     * Get the annual leave records for the user.
     */
    public function annualLeave(): HasMany
    {
        return $this->hasMany(AnnualLeave::class);
    }

    /**
     * Get the calendar markers created by the user.
     */
    public function calendarMarkers(): HasMany
    {
        return $this->hasMany(CalendarMarker::class);
    }

    /**
     * Check if the user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if the user is a regular user.
     */
    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    /**
     * Check if the user is a guest.
     */
    public function isGuest(): bool
    {
        return $this->role === 'guest';
    }

    /**
     * Check if the user has a pending invitation.
     */
    public function hasValidInvitation(): bool
    {
        return $this->status === 'invited'
            && $this->invitation_token
            && $this->invitation_expires_at
            && $this->invitation_expires_at->isFuture();
    }

    /**
     * Generate a new invitation token.
     */
    public function generateInvitationToken(): string
    {
        $token = bin2hex(random_bytes(32));
        $this->invitation_token = $token;
        $this->invitation_expires_at = now()->addDays(7);
        $this->save();

        return $token;
    }

    /**
     * Get the invitation URL.
     */
    public function getInvitationUrl(): string
    {
        return url('/invitation/' . $this->invitation_token);
    }
}
