<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Pedidos\ConfirmarPedidoAction;
use App\Actions\Pedidos\LiberarStockReservaAction;
use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Services\Wompi\WompiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * ReconcilePendingPaymentsJob
 *
 * Job de reconciliación servidor-a-servidor (S2S): consulta directamente la API
 * de Wompi para órdenes en estado pendiente_pago con antigüedad mayor a N minutos,
 * como respaldo ante cualquier contingencia de red en la entrega de webhooks.
 */
class ReconcilePendingPaymentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        private readonly int $olderThanMinutes = 10,
    ) {}

    public function handle(
        WompiClient $wompiClient,
        ConfirmarPedidoAction $confirmarAction,
        LiberarStockReservaAction $liberarAction,
    ): void {
        $cutoff = now()->subMinutes($this->olderThanMinutes);

        $pedidosPendientes = Pedido::where('estado', EstadoPedido::PENDIENTE_PAGO)
            ->where('fecha', '<=', $cutoff)
            ->where(function ($query) {
                $query->whereNotNull('wompi_referencia')
                    ->orWhereNotNull('wompi_link_id');
            })
            ->get();

        if ($pedidosPendientes->isEmpty()) {
            Log::info('ReconcilePendingPaymentsJob — Sin pedidos pendientes que reconciliar');

            return;
        }

        Log::info('ReconcilePendingPaymentsJob — Iniciando reconciliación', [
            'pedidos' => $pedidosPendientes->count(),
        ]);

        foreach ($pedidosPendientes as $pedido) {
            try {
                $this->reconcileOrder($pedido, $wompiClient, $confirmarAction, $liberarAction);
            } catch (Throwable $e) {
                Log::error('ReconcilePendingPaymentsJob — Error reconciliando pedido', [
                    'pedido_id' => $pedido->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('ReconcilePendingPaymentsJob — Reconciliación completada');
    }

    private function reconcileOrder(
        Pedido $pedido,
        WompiClient $wompiClient,
        ConfirmarPedidoAction $confirmarAction,
        LiberarStockReservaAction $liberarAction,
    ): void {
        $linkId = trim((string) $pedido->wompi_link_id);
        $reference = trim((string) $pedido->wompi_referencia);

        $txsData = $linkId !== ''
            ? $wompiClient->getPaymentLinkTransactions($linkId)
            : $wompiClient->getTransactionsByReference($reference);

        /** @var list<array<string, mixed>> $transactions */
        $transactions = is_array($txsData['data'] ?? null) ? $txsData['data'] : [];

        if ($transactions === []) {
            Log::info('ReconcilePendingPaymentsJob — Sin transacciones aún para pedido', ['pedido_id' => $pedido->id]);

            return;
        }

        $montoEsperado = (int) round((float) $pedido->total * 100);

        // Priorizar cualquier transacción APPROVED válida sobre intentos previos fallidos (Wompi §8)
        $approvedTx = null;
        foreach ($transactions as $tx) {
            $txStatus = strtoupper((string) ($tx['status'] ?? ''));
            $txAmount = (int) ($tx['amount_in_cents'] ?? 0);
            $txCurrency = strtoupper((string) ($tx['currency'] ?? 'COP'));

            if ($txStatus === 'APPROVED' && $txAmount === $montoEsperado && $txCurrency === 'COP') {
                $approvedTx = $tx;
                break;
            }
        }

        if ($approvedTx !== null) {
            $transId = (string) ($approvedTx['id'] ?? '');
            if ($pedido->estado !== EstadoPedido::PAGADO) {
                $confirmarAction->execute(
                    $pedido->id,
                    $transId,
                    'reconcile-'.$transId,
                    $montoEsperado
                );
            }

            return;
        }

        // Si ya pasó la ventana de reconciliación (> N min) y todas las transacciones están en estado terminal fallido
        $lastTx = end($transactions);
        $status = strtoupper((string) ($lastTx['status'] ?? ''));
        $transId = (string) ($lastTx['id'] ?? '');

        if (in_array($status, ['DECLINED', 'VOIDED', 'ERROR'], true)
            && $pedido->estado !== EstadoPedido::PAGADO
            && $pedido->estado !== EstadoPedido::CANCELADO
        ) {
            $pedido->update([
                'estado' => EstadoPedido::CANCELADO,
                'wompi_transaction_id' => $transId,
                'wompi_evento_id' => 'reconcile-'.$transId,
            ]);
            $liberarAction->execute($pedido);
        }
    }
}
