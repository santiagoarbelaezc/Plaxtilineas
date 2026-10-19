<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $codigo
 * @property Carbon $expires_at
 */
class Captcha extends Model
{
    protected $table = 'captchas';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'codigo',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<Captcha>  $query
     * @return Builder<Captcha>
     */
    public function scopeValidos(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }
}
