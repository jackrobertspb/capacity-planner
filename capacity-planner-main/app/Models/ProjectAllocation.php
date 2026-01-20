<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAllocation extends Model
{
    protected $fillable = [
        'user_id',
        'project_id',
        'type',
        'title',
        'start_date',
        'end_date',
        'days_per_week',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'days_per_week' => 'decimal:1',
        ];
    }

    /**
     * Get the user that owns the allocation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the project for the allocation.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
