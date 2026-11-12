<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $admin_id
 * @property int|null $token_id
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property Carbon $inicio_sesion_at
 * @property Carbon|null $ultima_actividad_at
 * @property Carbon|null $fin_sesion_at
 * @property int $duracion_segundos
 * @property bool $activa
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Usuario|null $admin
 */
class AdminSesion extends Model
{
    protected $table = 'admin_sesiones';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'admin_id',
        'token_id',
        'ip_address',
        'user_agent',
        'inicio_sesion_at',
        'ultima_actividad_at',
        'fin_sesion_at',
        'duracion_segundos',
        'activa',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'admin_id' => 'integer',
            'token_id' => 'integer',
            'inicio_sesion_at' => 'datetime',
            'ultima_actividad_at' => 'datetime',
            'fin_sesion_at' => 'datetime',
            'duracion_segundos' => 'integer',
            'activa' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Usuario, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'admin_id');
    }

    /**
     * @return HasMany<AdminAuditoriaLog, $this>
     */
    public function logs(): HasMany
    {
        return $this->hasMany(AdminAuditoriaLog::class, 'sesion_id');
    }

    /**
     * Calcula los segundos transcurridos entre el inicio de sesión y el fin (o última actividad / ahora).
     */
    public function calcularSegundosEfectivos(): int
    {
        if ($this->duracion_segundos > 0 && ! $this->activa) {
            return (int) $this->duracion_segundos;
        }

        $inicio = $this->inicio_sesion_at;
        if (! $inicio) {
            return (int) $this->duracion_segundos;
        }

        $fin = $this->fin_sesion_at ?? $this->ultima_actividad_at ?? now();
        $diff = (int) abs($fin->diffInSeconds($inicio));

        return max((int) $this->duracion_segundos, $diff);
    }

    /**
     * Formatea una cantidad de segundos en formato legible (ej. "1h 24m 15s").
     */
    public static function formatearSegundos(int $segundos): string
    {
        if ($segundos <= 0) {
            return '0s';
        }

        $horas = intdiv($segundos, 3600);
        $minutos = intdiv($segundos % 3600, 60);
        $segs = $segundos % 60;

        $partes = [];
        if ($horas > 0) {
            $partes[] = "{$horas}h";
        }
        if ($minutos > 0 || $horas > 0) {
            $partes[] = "{$minutos}m";
        }
        $partes[] = "{$segs}s";

        return implode(' ', $partes);
    }
}
