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
 * Orquesta el procesamiento seguro de un evento webhook de Wompi.
 *
 * Reglas de negocio aplicadas:
 *   • Idempotencia:  el mismo evento no se procesa dos veces.
 *   • Integridad:    el checksum del header debe ser válido.
 *   • Monto:         el monto del evento debe coincidir con la orden en BD.
 *   • Estado:        una orden PAGADA nunca retrocede a CANCELADO por evento tardío.
 *   • Confirmación:  solo APPROVED dispara la confirmación del pedido.
 *   • Liberación:    DECLINED/VOIDED/ERROR liberan stock y marcan como cancelado.
 *   • Concurrencia:  lockForUpdate() dentro de DB::transaction().
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
        // ── 1. Extraer campos del payload ──────────────────────────────────────
        $eventoId = (string) ($evento['id'] ?? '');
        $eventType = (string) ($evento['event'] ?? '');

        /** @var array<string, mixed> $dataTx */
        $dataTx = $evento['data']['transaction'] ?? [];
        $txStatus = (string) ($dataTx['status'] ?? '');
        $reference = (string) ($dataTx['reference'] ?? '');
        $transId = (string) ($dataTx['id'] ?? '');
        $montoCents = (int) ($dataTx['amount_in_cents'] ?? 0);
        $linkId = (string) ($dataTx['payment_link_id'] ?? '');

        // ── 2. Validar checksum HMAC-SHA256 ────────────────────────────────────
        if (! $this->signatureService->validateWebhookChecksum($evento, $receivedChecksum)) {
            Log::warning('ProcessWompiEventAction — Firma inválida', [
                'evento_id' => $eventoId,
                'checksum_recibido' => $receivedChecksum ? substr($receivedChecksum, 0, 8).'...' : null,
            ]);

            $this->audit($eventoId, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_invalid_signature');

            return ['status' => 'error', 'message' => 'Firma de evento inválida', 'http_code' => 401];
        }

        // ── 3. Solo procesar transaction.updated ───────────────────────────────
        if ($eventType !== 'transaction.updated') {
            return ['status' => 'ignored', 'message' => "Evento ignorado: {$eventType}", 'http_code' => 200];
        }

        // ── 4. Idempotencia: rechazar evento duplicado ─────────────────────────
        if ($eventoId !== '' && WompiWebhookEvent::alreadyProcessed($eventoId)) {
            Log::info('ProcessWompiEventAction — Evento duplicado, ignorado', ['evento_id' => $eventoId]);

            return ['status' => 'duplicate', 'message' => 'Evento ya procesado', 'http_code' => 200];
        }

        // ── 5. Resolver el pedido por link_id o referencia ─────────────────────
        $pedido = null;
        if ($linkId !== '') {
            $pedido = Pedido::where('wompi_link_id', $linkId)->first();
        }
        if (! $pedido && $reference !== '') {
            $pedido = Pedido::where('wompi_referencia', $reference)->first();
        }

        if (! $pedido) {
            Log::warning('ProcessWompiEventAction — Pedido no encontrado', [
                'referencia' => $reference,
                'link_id' => $linkId,
            ]);

            $this->audit($eventoId, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_order_not_found');

            return ['status' => 'not_found', 'message' => 'Pedido no encontrado', 'http_code' => 200];
        }

        // ── 6. Confirmar monto con la BD (anti-tampering) ──────────────────────
        $montoEsperado = (int) round((float) $pedido->total * 100);
        if ($montoCents !== $montoEsperado) {
            Log::error('ProcessWompiEventAction — Monto no coincide', [
                'pedido_id' => $pedido->id,
                'monto_esperado' => $montoEsperado,
                'monto_recibido' => $montoCents,
            ]);

            $this->audit($eventoId, $eventType, $txStatus, $reference, $transId, $evento, 'rejected_amount_mismatch');

            return ['status' => 'error', 'message' => 'Monto del evento no coincide con la orden', 'http_code' => 422];
        }

        // ── 7. Consultar la API de Wompi para confirmar el estado real ──────────
        // (nunca confiar solo en el webhook; se confirma contra la fuente de verdad)
        try {
            $txData = $this->wompiClient->getTransaction($transId);
            /** @var array<string, mixed> $confirmedTx */
            $confirmedTx = $txData['data'] ?? [];
            $confirmedStatus = (string) ($confirmedTx['status'] ?? $txStatus);
        } catch (Throwable $e) {
            Log::warning('ProcessWompiEventAction — No se pudo confirmar con API Wompi, usando estado del webhook', [
                'error' => $e->getMessage(),
            ]);
            $confirmedStatus = $txStatus;
        }

        // ── 8. Procesar según estado confirmado ────────────────────────────────
        try {
            DB::transaction(function () use ($pedido, $confirmedStatus, $transId, $eventoId, $montoCents) {
                // lockForUpdate() para evitar race conditions
                $pedidoLocked = Pedido::where('id', $pedido->id)->lockForUpdate()->first();

                if (! $pedidoLocked) {
                    return;
                }

                switch ($confirmedStatus) {
                    case 'APPROVED':
                        // Una orden ya PAGADA nunca retrocede
                        if ($pedidoLocked->estado === EstadoPedido::PAGADO) {
                            Log::info('ProcessWompiEventAction — APPROVED sobre pedido ya pagado (idempotencia)', ['pedido_id' => $pedidoLocked->id]);

                            return;
                        }
                        $this->confirmarAction->execute($pedidoLocked->id, $transId, $eventoId, $montoCents);
                        break;

                    case 'DECLINED':
                    case 'VOIDED':
                    case 'ERROR':
                        // Una orden ya PAGADA nunca retrocede a CANCELADO por evento tardío
                        if ($pedidoLocked->estado === EstadoPedido::PAGADO) {
                            Log::warning('ProcessWompiEventAction — Evento tardío rechazado: no se puede revertir un PAGADO', [
                                'pedido_id' => $pedidoLocked->id,
                                'status' => $confirmedStatus,
                            ]);

                            return;
                        }
                        $pedidoLocked->update([
                            'estado' => EstadoPedido::CANCELADO,
                            'wompi_transaction_id' => $transId,
                            'wompi_evento_id' => $eventoId,
                        ]);
                        $this->liberarAction->execute($pedidoLocked);
                        break;

                    default:
                        Log::info("ProcessWompiEventAction — Estado sin acción: {$confirmedStatus}");
                        break;
                }
            });
        } catch (Throwable $e) {
            Log::error('ProcessWompiEventAction — Error procesando evento', [
                'evento_id' => $eventoId,
                'error' => $e->getMessage(),
            ]);

            $this->audit($eventoId, $eventType, $txStatus, $reference, $transId, $evento, 'error');

            return ['status' => 'error', 'message' => 'Error interno procesando el evento', 'http_code' => 500];
        }

        // ── 9. Auditoría ───────────────────────────────────────────────────────
        $this->audit($eventoId, $eventType, $txStatus, $reference, $transId, $evento, 'processed');

        return ['status' => 'ok', 'message' => 'Webhook procesado', 'http_code' => 200];
    }

    /**
     * Persiste el evento en la tabla de auditoría.
     *
     * @param  array<string, mixed>  $payload
     */
    private function audit(
        string $eventoId,
        string $eventType,
        string $txStatus,
        string $reference,
        string $transId,
        array $payload,
        string $result
    ): void {
        try {
            if ($eventoId !== '') {
                WompiWebhookEvent::updateOrCreate(
                    ['wompi_event_id' => $eventoId],
                    [
                        'event_type' => $eventType,
                        'transaction_status' => $txStatus,
                        'reference' => $reference,
                        'wompi_transaction_id' => $transId,
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
