<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarMarker extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'title',
        'description',
        'color',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    /**
     * Get the user that created the marker.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
