<?php

declare(strict_types=1);

use App\Enums\EstadoPqr;
use App\Enums\TipoPqr;
use App\Models\Pqr;
use App\Models\PqrArchivo;
use App\Models\PqrRespuesta;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('pqr castea tipo y estado a enums y maneja archivos y respuestas', function () {
    $pqr = Pqr::factory()->create([
        'tipo' => TipoPqr::RECLAMO,
        'estado' => EstadoPqr::PENDIENTE,
    ]);

    PqrArchivo::query()->create([
        'pqr_id' => $pqr->id,
        'nombre_archivo' => 'evidencia.png',
        'url_archivo' => 'https://res.cloudinary.com/test/image.png',
        'tipo_archivo' => 'image',
    ]);

    PqrRespuesta::query()->create([
        'pqr_id' => $pqr->id,
        'mensaje' => 'Estamos revisando su caso.',
        'tipo' => 'ADMINISTRACION',
    ]);

    expect($pqr->tipo)->toBe(TipoPqr::RECLAMO)
        ->and($pqr->estado)->toBe(EstadoPqr::PENDIENTE)
        ->and($pqr->archivos)->toHaveCount(1)
        ->and($pqr->respuestas)->toHaveCount(1);
});
