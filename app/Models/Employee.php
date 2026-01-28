<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'work_days',
        'is_visible',
        'annual_leave_default',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'work_days' => 'array',
            'is_visible' => 'boolean',
            'annual_leave_default' => 'integer',
        ];
    }

    /**
     * Get the user account linked to this employee (if any).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the project allocations for the employee.
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(ProjectAllocation::class);
    }

    /**
     * Get the annual leave records for the employee.
     */
    public function annualLeave(): HasMany
    {
        return $this->hasMany(AnnualLeave::class);
    }
}
