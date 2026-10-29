<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EstadisticaProducto extends Model
{
    protected $table = 'estadisticas_productos';

    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'producto_id',
        'session_id',
    ];
}
