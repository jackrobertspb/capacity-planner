<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAssignment extends Model
{
    protected $fillable = [
        'employee_id',
        'project_id',
    ];

    /**
     * Get the employee for the assignment.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the project for the assignment.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
