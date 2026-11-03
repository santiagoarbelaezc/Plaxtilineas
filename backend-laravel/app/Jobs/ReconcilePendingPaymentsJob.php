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
 * Job de reconciliación: consulta a Wompi las órdenes en estado
 * pendiente_pago más antiguas que N minutos por si el webhook no llegó.
 *
 * Se debe programar cada 10–15 minutos en routes/console.php.
 * En caso de error de comunicación con Wompi, simplemente loguea y continúa.
 */
class ReconcilePendingPaymentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60; // segundos entre reintentos

    /**
     * @param  int  $olderThanMinutes  Solo reconciliar órdenes con más de N minutos en pendiente_pago
     */
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
            ->whereNotNull('wompi_link_id')
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
                // Continuar con el siguiente pedido; no detener el job
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
        $linkId = (string) $pedido->wompi_link_id;

        // Consultar transacciones del payment link
        $txsData = $wompiClient->getPaymentLinkTransactions($linkId);

        /** @var list<array<string, mixed>> $transactions */
        $transactions = $txsData['data'] ?? [];

        if (empty($transactions)) {
            Log::info('ReconcilePendingPaymentsJob — Sin transacciones aún para pedido', ['pedido_id' => $pedido->id]);

            return;
        }

        // Tomar la transacción más reciente
        $lastTx = end($transactions);
        $status = (string) ($lastTx['status'] ?? '');
        $transId = (string) ($lastTx['id'] ?? '');
        $amountCents = (int) ($lastTx['amount_in_cents'] ?? 0);

        Log::info('ReconcilePendingPaymentsJob — Estado encontrado en Wompi', [
            'pedido_id' => $pedido->id,
            'status' => $status,
            'trans_id' => $transId,
        ]);

        if ($status === 'APPROVED' && $pedido->estado !== EstadoPedido::PAGADO) {
            $confirmarAction->execute(
                $pedido->id,
                $transId,
                'reconcile-'.$transId,
                $amountCents
            );
        } elseif (in_array($status, ['DECLINED', 'VOIDED', 'ERROR'], true)
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
