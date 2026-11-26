<?php

declare(strict_types=1);

use App\Services\Catalogo\CatalogoApiService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;

test('CatalogoApiService reintenta con la MISMA X-Idempotency-Key ante timeout cURL 28 evitando doble descuento', function () {
    $capturedKeys = [];
    $callCount = 0;

    Http::fake(function (HttpRequest $request) use (&$capturedKeys, &$callCount) {
        $callCount++;
        $capturedKeys[] = $request->header('X-Idempotency-Key')[0] ?? null;

        if ($callCount === 1) {
            throw new ConnectionException('cURL error 28: Operation timed out after 25001 milliseconds with 0 bytes received');
        }

        return Http::response([
            'success' => true,
            'idempotent_replay' => true,
            'data' => [
                'product_id' => 195,
                'stock_antes' => 20,
                'stock' => 19,
                'delta' => -1,
            ],
        ], 200);
    });

    $service = app(CatalogoApiService::class);
    $ok = $service->ajustarStockViaHttp(195, -1);

    expect($ok)->toBeTrue()
        ->and($callCount)->toBe(2)
        ->and($capturedKeys[0])->not->toBeEmpty()
        ->and($capturedKeys[0])->toBe($capturedKeys[1]);
});

test('CatalogoApiService bloquea fallback en BD si ambos intentos hacen timeout cURL 28', function () {
    $callCount = 0;

    Http::fake(function () use (&$callCount) {
        $callCount++;
        throw new ConnectionException('cURL error 28: Operation timed out after 25001 milliseconds');
    });

    $service = app(CatalogoApiService::class);
    $ok = $service->ajustarStockViaHttp(195, -1);

    expect($ok)->toBeFalse()
        ->and($callCount)->toBe(2);
});

test('CatalogoApiService respeta rechazo 409 Conflict sin reintentar ni ejecutar fallback', function () {
    $callCount = 0;

    Http::fake(function () use (&$callCount) {
        $callCount++;

        return Http::response([
            'success' => false,
            'message' => 'Stock insuficiente para realizar el ajuste',
        ], 409);
    });

    $service = app(CatalogoApiService::class);
    $ok = $service->ajustarStockViaHttp(195, -5);

    expect($ok)->toBeFalse()
        ->and($callCount)->toBe(1);
});
