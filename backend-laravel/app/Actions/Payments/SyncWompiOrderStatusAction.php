<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Pedidos\ConfirmarPedidoAction;
use App\Actions\Pedidos\LiberarStockReservaAction;
use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\WompiWebhookEvent;
use App\Services\Wompi\WompiClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * SyncWompiOrderStatusAction
 *
 * Conciliación servidor-a-servidor (S2S) bajo demanda para confirmar un pedido
 * tan pronto el cliente finaliza el flujo en Wompi, sin esperar la latencia
 * del webhook o del cron de 10 minutos.
 *
 * Seguridad (Regla de Oro Wompi):
 *   • Jamás confía en estados enviados por el navegador.
 *   • Consulta directamente la API oficial de Wompi desde el backend.
 *   • Valida los 5 puntos obligatorios: pertenencia de referencia, monto exacto
 *     en centavos, moneda COP, estado oficial en Wompi e idempotencia con bloqueo pesimista.
 */
final class SyncWompiOrderStatusAction
{
    public function __construct(
        private readonly WompiClient $wompiClient,
        private readonly ConfirmarPedidoAction $confirmarAction,
        private readonly LiberarStockReservaAction $liberarAction,
    ) {}

    /**
     * @return array{
     *   estado: string,
     *   sincronizado: bool,
     *   wompi_status: string|null,
     *   codigo_pedido: string,
     *   wompi_referencia: string|null,
     *   wompi_transaction_id: string|null,
     *   wompi_pagado_at: string|null,
     *   total: float
     * }
     */
    public function execute(Pedido $pedido, ?string $transactionId = null): array
    {
        if ($pedido->estado !== EstadoPedido::PENDIENTE_PAGO) {
            return $this->formatResponse($pedido, false, $pedido->estado === EstadoPedido::PAGADO ? 'APPROVED' : null);
        }

        $txIdInput = trim((string) $transactionId);
        $reference = trim((string) $pedido->wompi_referencia);
        $linkId = trim((string) $pedido->wompi_link_id);
        $montoEsperado = (int) round((float) $pedido->total * 100);

        /** @var list<array<string, mixed>> $candidates */
        $candidates = [];

        // 1. Si el cliente conoce el ID de la transacción (callback del Widget o redirect ?id=), consultarlo S2S
        if ($txIdInput !== '') {
            try {
                $singleTx = $this->wompiClient->getTransaction($txIdInput);
                if (is_array($singleTx['data'] ?? null) && $singleTx['data'] !== []) {
                    /** @var array<string, mixed> $txRow */
                    $txRow = $singleTx['data'];
                    $candidates[] = $txRow;
                }
            } catch (Throwable $e) {
                Log::warning('SyncWompiOrderStatusAction — No se pudo consultar transacción individual en Wompi', [
                    'pedido_id' => $pedido->id,
                    'transaction_id' => $txIdInput,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // 2. Si no se encontró un APPROVED válido aún, consultar todas las transacciones de la referencia en Wompi
        if (! $this->hasValidApprovedCandidate($candidates, $pedido, $montoEsperado)) {
            try {
                if ($reference !== '') {
                    $byRef = $this->wompiClient->getTransactionsByReference($reference);
                    if (is_array($byRef['data'] ?? null)) {
                        foreach ($byRef['data'] as $item) {
                            if (is_array($item)) {
                                /** @var array<string, mixed> $item */
                                $candidates[] = $item;
                            }
                        }
                    }
                } elseif ($linkId !== '') {
                    $byLink = $this->wompiClient->getPaymentLinkTransactions($linkId);
                    if (is_array($byLink['data'] ?? null)) {
                        foreach ($byLink['data'] as $item) {
                            if (is_array($item)) {
                                /** @var array<string, mixed> $item */
                                $candidates[] = $item;
                            }
                        }
                    }
                }
            } catch (Throwable $e) {
                Log::warning('SyncWompiOrderStatusAction — Error consultando transacciones por referencia en Wompi', [
                    'pedido_id' => $pedido->id,
                    'referencia' => $reference,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($candidates === []) {
            return $this->formatResponse($pedido, false, null);
        }

        // 3. Filtrar y validar los 5 puntos de seguridad contra la orden en BD
        /** @var list<array<string, mixed>> $validTransactions */
        $validTransactions = [];

        foreach ($candidates as $tx) {
            $candId = trim((string) ($tx['id'] ?? ''));
            $candStatus = strtoupper(trim((string) ($tx['status'] ?? '')));
            $candRef = trim((string) ($tx['reference'] ?? ''));
            $candLink = trim((string) ($tx['payment_link_id'] ?? ''));
            $candCurrency = strtoupper(trim((string) ($tx['currency'] ?? 'COP')));
            $candAmount = (int) ($tx['amount_in_cents'] ?? 0);

            if ($candId === '' || $candStatus === '') {
                continue;
            }

            $refMatches = ($candRef !== '' && $candRef === $reference)
                || ($candLink !== '' && $candLink === $linkId);

            if (! $refMatches) {
                Log::error('SyncWompiOrderStatusAction — Referencia de transacción en Wompi no coincide con el pedido', [
                    'pedido_id' => $pedido->id,
                    'expected_ref' => $reference,
                    'received_ref' => $candRef,
                    'transaction_id' => $candId,
                ]);
                $this->audit("{$candId}:{$candStatus}", $candStatus, $candRef, $candId, $tx, 'rejected_order_not_found');

                continue;
            }

            if ($candCurrency !== 'COP' || $candAmount !== $montoEsperado) {
                Log::error('SyncWompiOrderStatusAction — Monto o moneda en Wompi no coincide con el pedido', [
                    'pedido_id' => $pedido->id,
                    'expected_amount' => $montoEsperado,
                    'received_amount' => $candAmount,
                    'received_currency' => $candCurrency,
                    'transaction_id' => $candId,
                ]);
                $this->audit("{$candId}:{$candStatus}", $candStatus, $candRef, $candId, $tx, 'rejected_amount_mismatch');

                continue;
            }

            $validTransactions[] = $tx;
        }

        if ($validTransactions === []) {
            return $this->formatResponse($pedido, false, null);
        }

        // 4. Priorizar cualquier transacción APPROVED sobre intentos previos fallidos (Wompi §8 Reintentos)
        $selectedTx = null;
        foreach ($validTransactions as $tx) {
            if (strtoupper(trim((string) ($tx['status'] ?? ''))) === 'APPROVED') {
                $selectedTx = $tx;
                break;
            }
        }

        if ($selectedTx === null) {
            $selectedTx = end($validTransactions);
        }

        $confirmedId = trim((string) ($selectedTx['id'] ?? ''));
        $confirmedStatus = strtoupper(trim((string) ($selectedTx['status'] ?? '')));
        $eventoKey = "{$confirmedId}:{$confirmedStatus}";
        $changed = false;

        // 5. Aplicar transición bajo bloqueo pesimista e idempotencia
        DB::transaction(function () use ($pedido, $confirmedId, $confirmedStatus, $eventoKey, $montoEsperado, &$changed) {
            /** @var Pedido|null $pedidoLocked */
            $pedidoLocked = Pedido::where('id', $pedido->id)->lockForUpdate()->first();
            if (! $pedidoLocked || $pedidoLocked->estado !== EstadoPedido::PENDIENTE_PAGO) {
                return;
            }

            switch ($confirmedStatus) {
                case 'APPROVED':
                    $this->confirmarAction->execute($pedidoLocked->id, $confirmedId, $eventoKey, $montoEsperado);
                    $changed = true;
                    break;

                case 'DECLINED':
                    // Mantener pendiente_pago para permitir reintento en ventana Wompi (§8)
                    $pedidoLocked->update([
                        'wompi_transaction_id' => $confirmedId,
                        'wompi_evento_id' => $eventoKey,
                    ]);
                    break;

                case 'VOIDED':
                case 'ERROR':
                    $pedidoLocked->update([
                        'estado' => EstadoPedido::CANCELADO,
                        'wompi_transaction_id' => $confirmedId,
                        'wompi_evento_id' => $eventoKey,
                    ]);
                    $this->liberarAction->execute($pedidoLocked);
                    $changed = true;
                    break;

                default:
                    if ($pedidoLocked->wompi_transaction_id === null && $confirmedId !== '') {
                        $pedidoLocked->update([
                            'wompi_transaction_id' => $confirmedId,
                        ]);
                    }
                    break;
            }
        });

        if (in_array($confirmedStatus, ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR'], true)) {
            $this->audit($eventoKey, $confirmedStatus, $reference, $confirmedId, $selectedTx, 'processed');
        }

        $pedidoActualizado = $pedido->fresh() ?? $pedido;

        return $this->formatResponse($pedidoActualizado, $changed, $confirmedStatus);
    }

    /**
     * @param  list<array<string, mixed>>  $candidates
     */
    private function hasValidApprovedCandidate(array $candidates, Pedido $pedido, int $montoEsperado): bool
    {
        $reference = trim((string) $pedido->wompi_referencia);
        $linkId = trim((string) $pedido->wompi_link_id);

        foreach ($candidates as $tx) {
            $status = strtoupper(trim((string) ($tx['status'] ?? '')));
            $txRef = trim((string) ($tx['reference'] ?? ''));
            $txLink = trim((string) ($tx['payment_link_id'] ?? ''));
            $currency = strtoupper(trim((string) ($tx['currency'] ?? 'COP')));
            $amount = (int) ($tx['amount_in_cents'] ?? 0);

            $refMatches = ($txRef !== '' && $txRef === $reference)
                || ($txLink !== '' && $txLink === $linkId);

            if ($status === 'APPROVED' && $refMatches && $currency === 'COP' && $amount === $montoEsperado) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{
     *   estado: string,
     *   sincronizado: bool,
     *   wompi_status: string|null,
     *   codigo_pedido: string,
     *   wompi_referencia: string|null,
     *   wompi_transaction_id: string|null,
     *   wompi_pagado_at: string|null,
     *   total: float
     * }
     */
    private function formatResponse(Pedido $pedido, bool $sincronizado, ?string $wompiStatus): array
    {
        return [
            'estado' => $pedido->estado->value,
            'sincronizado' => $sincronizado,
            'wompi_status' => $wompiStatus,
            'codigo_pedido' => (string) $pedido->codigo_pedido,
            'wompi_referencia' => $pedido->wompi_referencia,
            'wompi_transaction_id' => $pedido->wompi_transaction_id,
            'wompi_pagado_at' => $pedido->wompi_pagado_at?->toIso8601String(),
            'total' => (float) $pedido->total,
        ];
    }

    /**
     * @param  array<string, mixed>  $txPayload
     */
    private function audit(
        string $eventoKey,
        string $txStatus,
        string $reference,
        string $transId,
        array $txPayload,
        string $result
    ): void {
        try {
            if ($eventoKey !== '') {
                WompiWebhookEvent::updateOrCreate(
                    ['wompi_event_id' => $eventoKey],
                    [
                        'event_type' => 's2s.sync',
                        'transaction_status' => $txStatus !== '' ? $txStatus : null,
                        'reference' => $reference !== '' ? $reference : null,
                        'wompi_transaction_id' => $transId !== '' ? $transId : null,
                        'payload' => ['data' => ['transaction' => $txPayload]],
                        'result' => $result,
                        'processed_at' => now(),
                    ]
                );
            }
        } catch (Throwable $e) {
            Log::error('SyncWompiOrderStatusAction::audit — Error guardando auditoría', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
