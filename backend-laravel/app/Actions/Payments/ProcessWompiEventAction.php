<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Pedidos\ConfirmarPedidoAction;
use App\Actions\Pedidos\LiberarStockReservaAction;
use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\WompiWebhookEvent;
use App\Services\Wompi\SignatureService;
use App\Services\Wompi\WompiClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * ProcessWompiEventAction
 *
 * Orquesta el procesamiento seguro de los eventos webhook enviados por Wompi:
 *   • Integridad:    valida primero X-Event-Checksum / signature.checksum en tiempo constante.
 *   • Ambiente:      verifica que environment coincida con el entorno configurado (sandbox vs prod).
 *   • Tolerancia:    responde 200 ante eventos distintos de transaction.updated.
 *   • Idempotencia:  deduplica por wompi_event_id (o transaction.id:status si no viene id raíz).
 *   • Doble check:   consulta GET /v1/transactions/{id} directo contra la API de Wompi.
 *   • Anti-fraude:   verifica monto exacto en centavos, moneda COP y referencia/link contra BD.
 *   • Reintentos:    DECLINED mantiene pendiente_pago para permitir reintento en ventana Wompi;
 *                    VOIDED / ERROR cancelan y liberan reserva; PAGADO jamás retrocede.
 */
final class ProcessWompiEventAction
{
    public function __construct(
        private readonly SignatureService $signatureService,
        private readonly WompiClient $wompiClient,
        private readonly ConfirmarPedidoAction $confirmarAction,
        private readonly LiberarStockReservaAction $liberarAction,
    ) {}

    /**
     * @param  array<string, mixed>  $evento
     * @return array{status: string, message: string, http_code: int}
     */
    public function execute(array $evento, ?string $receivedChecksum): array
    {
        // ── 1. Extraer metadatos básicos del payload ───────────────────────────
        $rawEventId = trim((string) ($evento['id'] ?? ''));
        $eventType = trim((string) ($evento['event'] ?? ''));

        /** @var array<string, mixed> $dataTx */
        $dataTx = is_array($evento['data']['transaction'] ?? null) ? $evento['data']['transaction'] : [];
        $txStatus = strtoupper(trim((string) ($dataTx['status'] ?? '')));
        $reference = trim((string) ($dataTx['reference'] ?? ''));
        $transId = trim((string) ($dataTx['id'] ?? ''));
        $montoCents = (int) ($dataTx['amount_in_cents'] ?? 0);
        $currency = strtoupper(trim((string) ($dataTx['currency'] ?? 'COP')));
        $linkId = trim((string) ($dataTx['payment_link_id'] ?? ''));

        // Clave determinística de idempotencia (el JSON oficial de Wompi no trae `id` en la raíz)
        $eventoKey = $rawEventId !== ''
            ? $rawEventId
            : ($transId !== '' && $txStatus !== ''
                ? "{$transId}:{$txStatus}"
                : substr(hash('sha256', json_encode($evento) ?: uniqid('wmp_', true)), 0, 48));

        // ── 2. Validar checksum SHA-256 ANTES de cualquier lógica ──────────────
        if (! $this->signatureService->validateWebhookChecksum($evento, $receivedChecksum)) {
            Log::warning('ProcessWompiEventAction — Firma inválida', [
                'evento_key' => $eventoKey,
                'checksum_recibido' => $receivedChecksum ? substr($receivedChecksum, 0, 8).'...' : null,
            ]);

            $this->audit($eventoKey, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_invalid_signature');

            return ['status' => 'error', 'message' => 'Firma de evento inválida', 'http_code' => 401];
        }

        // ── 3. Validar correspondencia de ambiente (sandbox/test vs prod) ──────
        $eventEnv = strtolower(trim((string) ($evento['environment'] ?? '')));
        if ($eventEnv !== '' && ! $this->matchesConfiguredEnvironment($eventEnv)) {
            Log::warning('ProcessWompiEventAction — Ambiente del evento no coincide con el configurado', [
                'evento_env' => $eventEnv,
                'configured_env' => config('wompi.env'),
            ]);

            $this->audit($eventoKey, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_invalid_signature');

            return ['status' => 'ignored', 'message' => 'Ambiente ignorado', 'http_code' => 200];
        }

        // ── 4. Manejo tolerante de tipos de evento no transaccionales ──────────
        if ($eventType !== 'transaction.updated') {
            return ['status' => 'ignored', 'message' => "Evento ignorado: {$eventType}", 'http_code' => 200];
        }

        // ── 5. Idempotencia: rechazar evento ya procesado exitosamente ─────────
        if (WompiWebhookEvent::where('wompi_event_id', $eventoKey)->where('result', 'processed')->exists()) {
            Log::info('ProcessWompiEventAction — Evento duplicado, ignorado', ['evento_key' => $eventoKey]);

            return ['status' => 'duplicate', 'message' => 'Evento ya procesado', 'http_code' => 200];
        }

        // ── 6. Resolver el pedido por referencia (o wompi_link_id legacy) ──────
        $pedido = null;
        if ($reference !== '') {
            $pedido = Pedido::where('wompi_referencia', $reference)->first();
        }
        if (! $pedido && $linkId !== '') {
            $pedido = Pedido::where('wompi_link_id', $linkId)->first();
        }

        if (! $pedido) {
            Log::warning('ProcessWompiEventAction — Pedido no encontrado', [
                'referencia' => $reference,
                'link_id' => $linkId,
            ]);

            $this->audit($eventoKey, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_order_not_found');

            return ['status' => 'not_found', 'message' => 'Pedido no encontrado', 'http_code' => 200];
        }

        // ── 7. Validar moneda y monto del payload contra la BD ─────────────────
        $montoEsperado = (int) round((float) $pedido->total * 100);
        if ($currency !== 'COP' || $montoCents !== $montoEsperado) {
            Log::error('ProcessWompiEventAction — Monto o moneda del evento no coincide con la orden', [
                'pedido_id' => $pedido->id,
                'monto_esperado' => $montoEsperado,
                'monto_recibido' => $montoCents,
                'moneda_recibida' => $currency,
            ]);

            $this->audit($eventoKey, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_amount_mismatch');

            return ['status' => 'error', 'message' => 'Monto del evento no coincide con la orden', 'http_code' => 422];
        }

        // ── 8. Doble verificación S2S con GET /v1/transactions/{id} ────────────
        try {
            $txData = $this->wompiClient->getTransaction($transId);
            /** @var array<string, mixed> $confirmedTx */
            $confirmedTx = is_array($txData['data'] ?? null) ? $txData['data'] : [];
        } catch (Throwable $e) {
            // Retornar 500 ante falla de red/API para que Wompi ejecute su política oficial de reintentos
            Log::error('ProcessWompiEventAction — Falló doble verificación con API Wompi; se solicitará reintento', [
                'trans_id' => $transId,
                'error' => $e->getMessage(),
            ]);

            return ['status' => 'error', 'message' => 'No fue posible verificar la transacción con Wompi', 'http_code' => 503];
        }

        $confirmedStatus = strtoupper(trim((string) ($confirmedTx['status'] ?? '')));
        $confirmedAmount = (int) ($confirmedTx['amount_in_cents'] ?? 0);
        $confirmedCurrency = strtoupper(trim((string) ($confirmedTx['currency'] ?? 'COP')));
        $confirmedRef = trim((string) ($confirmedTx['reference'] ?? ''));
        $confirmedLink = trim((string) ($confirmedTx['payment_link_id'] ?? ''));

        $refCoincide = ($confirmedRef !== '' && $confirmedRef === (string) $pedido->wompi_referencia)
            || ($confirmedLink !== '' && $confirmedLink === (string) $pedido->wompi_link_id);

        if ($confirmedStatus === '' || $confirmedCurrency !== 'COP' || $confirmedAmount !== $montoEsperado || ! $refCoincide) {
            Log::error('ProcessWompiEventAction — Discrepancia en doble verificación contra API Wompi', [
                'pedido_id' => $pedido->id,
                'confirmed_status' => $confirmedStatus,
                'confirmed_amount' => $confirmedAmount,
                'confirmed_currency' => $confirmedCurrency,
                'confirmed_ref' => $confirmedRef,
            ]);

            $this->audit($eventoKey, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_amount_mismatch');

            return ['status' => 'error', 'message' => 'Discrepancia al verificar la transacción en Wompi', 'http_code' => 422];
        }

        // ── 9. Actualizar pedido bajo bloqueo pesimista ────────────────────────
        try {
            DB::transaction(function () use ($pedido, $confirmedStatus, $transId, $eventoKey, $montoCents) {
                $pedidoLocked = Pedido::where('id', $pedido->id)->lockForUpdate()->first();

                if (! $pedidoLocked) {
                    return;
                }

                switch ($confirmedStatus) {
                    case 'APPROVED':
                        if ($pedidoLocked->estado === EstadoPedido::PAGADO) {
                            Log::info('ProcessWompiEventAction — APPROVED sobre pedido ya pagado (idempotencia)', [
                                'pedido_id' => $pedidoLocked->id,
                            ]);

                            return;
                        }
                        $this->confirmarAction->execute($pedidoLocked->id, $transId, $eventoKey, $montoCents);
                        break;

                    case 'DECLINED':
                        // Regla oficial Wompi (§8 Reintentos): un mismo pedido puede recibir un DECLINED
                        // seguido de un APPROVED con otro medio de pago en la ventana de reintento.
                        // No cancelar ni liberar reserva en el primer DECLINED; solo registrar último intento.
                        if ($pedidoLocked->estado === EstadoPedido::PAGADO) {
                            Log::warning('ProcessWompiEventAction — DECLINED tardío ignorado sobre pedido PAGADO', [
                                'pedido_id' => $pedidoLocked->id,
                            ]);

                            return;
                        }
                        $pedidoLocked->update([
                            'estado' => EstadoPedido::PENDIENTE_PAGO,
                            'wompi_transaction_id' => $transId,
                            'wompi_evento_id' => $eventoKey,
                        ]);
                        break;

                    case 'VOIDED':
                    case 'ERROR':
                        if ($pedidoLocked->estado === EstadoPedido::PAGADO) {
                            Log::warning('ProcessWompiEventAction — Evento tardío ignorado sobre pedido PAGADO', [
                                'pedido_id' => $pedidoLocked->id,
                                'status' => $confirmedStatus,
                            ]);

                            return;
                        }
                        $pedidoLocked->update([
                            'estado' => EstadoPedido::CANCELADO,
                            'wompi_transaction_id' => $transId,
                            'wompi_evento_id' => $eventoKey,
                        ]);
                        $this->liberarAction->execute($pedidoLocked);
                        break;

                    default:
                        Log::info("ProcessWompiEventAction — Estado transitorio sin cambio: {$confirmedStatus}");
                        break;
                }
            });
        } catch (Throwable $e) {
            Log::error('ProcessWompiEventAction — Error procesando transacción en BD', [
                'evento_key' => $eventoKey,
                'error' => $e->getMessage(),
            ]);

            $this->audit($eventoKey, $eventType, $txStatus, $reference, $transId, $evento, 'error');

            return ['status' => 'error', 'message' => 'Error interno procesando el evento', 'http_code' => 500];
        }

        // ── 10. Auditoría de éxito ─────────────────────────────────────────────
        $this->audit($eventoKey, $eventType, $confirmedStatus, $reference, $transId, $evento, 'processed');

        return ['status' => 'ok', 'message' => 'Webhook procesado', 'http_code' => 200];
    }

    private function matchesConfiguredEnvironment(string $eventEnv): bool
    {
        $configured = strtolower(trim((string) config('wompi.env', 'sandbox')));
        $normalizedConfig = in_array($configured, ['production', 'prod'], true) ? 'prod' : 'test';
        $normalizedEvent = in_array($eventEnv, ['production', 'prod'], true) ? 'prod' : 'test';

        return $normalizedConfig === $normalizedEvent;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function audit(
        string $eventoKey,
        string $eventType,
        string $txStatus,
        string $reference,
        string $transId,
        array $payload,
        string $result
    ): void {
        try {
            if ($eventoKey !== '') {
                WompiWebhookEvent::updateOrCreate(
                    ['wompi_event_id' => $eventoKey],
                    [
                        'event_type' => $eventType !== '' ? $eventType : 'unknown',
                        'transaction_status' => $txStatus !== '' ? $txStatus : null,
                        'reference' => $reference !== '' ? $reference : null,
                        'wompi_transaction_id' => $transId !== '' ? $transId : null,
                        'payload' => $payload,
                        'result' => $result,
                        'processed_at' => now(),
                    ]
                );
            }
        } catch (Throwable $e) {
            Log::error('ProcessWompiEventAction::audit — Error guardando auditoría', ['error' => $e->getMessage()]);
        }
    }
}
