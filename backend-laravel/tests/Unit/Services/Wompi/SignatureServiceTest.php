<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Wompi;

use App\Exceptions\Domain\ServicioExternoException;
use App\Services\Wompi\SignatureService;

beforeEach(function () {
    $this->service = new SignatureService;

    config([
        'wompi.integrity_secret' => 'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6',
        'wompi.events_secret' => 'prod_events_SecretDePrueba123',
    ]);
});

test('genera firma SHA-256 exacta con el ejemplo oficial de Wompi (ref + monto + moneda + secreto)', function () {
    $reference = 'sk8-438k4-xmxm392-sn2m';
    $amountCents = 2490000;
    $currency = 'COP';
    $secret = 'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6';

    $esperado = hash('sha256', $reference.$amountCents.$currency.$secret);
    $calculado = $this->service->buildIntegritySignature($reference, $amountCents, $currency);

    expect($calculado)->toBe($esperado)
        ->and(strlen($calculado))->toBe(64)
        ->and(ctype_xdigit($calculado))->toBeTrue();
});

test('incluye expiration-time en el orden oficial cuando se suministra', function () {
    $reference = 'PLX-EXP-001';
    $amountCents = 9500000;
    $currency = 'COP';
    $expiration = '2026-12-01T20:28:50.000Z';
    $secret = 'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6';

    $esperado = hash('sha256', $reference.$amountCents.$currency.$expiration.$secret);
    $calculado = $this->service->buildIntegritySignature($reference, $amountCents, $currency, $expiration);

    expect($calculado)->toBe($esperado);
});

test('lanza excepcion si WOMPI_INTEGRITY_SECRET esta vacio', function () {
    config(['wompi.integrity_secret' => '']);

    expect(fn () => $this->service->buildIntegritySignature('PLX-1', 100000, 'COP'))
        ->toThrow(ServicioExternoException::class);
});

test('valida checksum oficial de webhook leyendo properties dinamicamente desde data + timestamp + events_secret', function () {
    $timestamp = 1530291411;
    $expected = hash('sha256', '1234-1610641025-49201'.'APPROVED'.'4490000'.'1530291411'.'prod_events_SecretDePrueba123');

    $evento = [
        'event' => 'transaction.updated',
        'data' => [
            'transaction' => [
                'id' => '1234-1610641025-49201',
                'status' => 'APPROVED',
                'amount_in_cents' => 4490000,
                'reference' => 'MZQ3X2DE2SMX',
                'currency' => 'COP',
            ],
        ],
        'environment' => 'prod',
        'signature' => [
            'properties' => [
                'transaction.id',
                'transaction.status',
                'transaction.amount_in_cents',
            ],
            'checksum' => strtoupper($expected),
        ],
        'timestamp' => $timestamp,
    ];

    // Header en mayúsculas (Wompi suele enviar hex en mayúsculas)
    expect($this->service->validateWebhookChecksum($evento, strtoupper($expected)))->toBeTrue();
    // Header en minúsculas
    expect($this->service->validateWebhookChecksum($evento, strtolower($expected)))->toBeTrue();
    // Fallback a signature.checksum si el header no llegó
    expect($this->service->validateWebhookChecksum($evento, null))->toBeTrue();
});

test('respeta el orden dinamico de signature.properties sin hardcodear campos', function () {
    $timestamp = 1700000500;
    // Orden distinto al habitual: amount primero, luego reference, luego id
    $expected = hash('sha256', '7500000'.'PLX-ORD-9'.'tx_abc'.'1700000500'.'prod_events_SecretDePrueba123');

    $evento = [
        'event' => 'transaction.updated',
        'data' => [
            'transaction' => [
                'id' => 'tx_abc',
                'reference' => 'PLX-ORD-9',
                'amount_in_cents' => 7500000,
            ],
        ],
        'signature' => [
            'properties' => [
                'transaction.amount_in_cents',
                'transaction.reference',
                'transaction.id',
            ],
            'checksum' => $expected,
        ],
        'timestamp' => $timestamp,
    ];

    expect($this->service->validateWebhookChecksum($evento, $expected))->toBeTrue();
});

test('rechaza webhook si alguna propiedad declarada en signature.properties no existe en data', function () {
    $expected = hash('sha256', 'tx_1'.'1700000500'.'prod_events_SecretDePrueba123');

    $evento = [
        'event' => 'transaction.updated',
        'data' => [
            'transaction' => [
                'id' => 'tx_1',
            ],
        ],
        'signature' => [
            'properties' => [
                'transaction.id',
                'transaction.propiedad_inexistente',
            ],
            'checksum' => $expected,
        ],
        'timestamp' => 1700000500,
    ];

    expect($this->service->validateWebhookChecksum($evento, $expected))->toBeFalse();
});

test('rechaza webhook si events_secret no esta configurado (fail-closed)', function () {
    config(['wompi.events_secret' => '']);

    $evento = [
        'event' => 'transaction.updated',
        'data' => ['transaction' => ['id' => 'tx_1']],
        'signature' => ['properties' => ['transaction.id'], 'checksum' => 'abc'],
        'timestamp' => 1700000500,
    ];

    expect($this->service->validateWebhookChecksum($evento, 'abc'))->toBeFalse();
});

test('rechaza webhook si el payload fue alterado aunque se mantenga el checksum original', function () {
    $timestamp = 1700000500;
    $checksumOriginal = hash('sha256', 'tx_1'.'APPROVED'.'5000000'.'1700000500'.'prod_events_SecretDePrueba123');

    $eventoAlterado = [
        'event' => 'transaction.updated',
        'data' => [
            'transaction' => [
                'id' => 'tx_1',
                'status' => 'APPROVED',
                'amount_in_cents' => 100, // alterado
            ],
        ],
        'signature' => [
            'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
            'checksum' => $checksumOriginal,
        ],
        'timestamp' => $timestamp,
    ];

    expect($this->service->validateWebhookChecksum($eventoAlterado, $checksumOriginal))->toBeFalse();
});
