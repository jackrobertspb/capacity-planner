<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnualLeave extends Model
{
    protected $table = 'annual_leave';

    protected $fillable = [
        'user_id',
        'start_date',
        'end_date',
        'days_count',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'days_count' => 'integer',
        ];
    }

    /**
     * Get the user that owns the leave.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
