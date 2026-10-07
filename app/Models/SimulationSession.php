<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SimulationSession extends Model
{
    protected $fillable = [
        'user_id',
        'student_name',
        'experiment',
        'sample_name',
        'status',
        'result',
        'unit',
        'payload',
    ];

    protected function casts(): array
    {
        return ['payload' => 'array', 'result' => 'decimal:2'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}