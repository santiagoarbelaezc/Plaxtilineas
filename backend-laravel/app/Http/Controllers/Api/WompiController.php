<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Pedidos\ConfirmarPedidoAction;
use App\Contracts\WompiClientInterface;
use App\Enums\EstadoPedido;
use App\Http\Controllers\Controller;
use App\Http\Requests\Wompi\DatosPagoRequest;
use App\Models\Pedido;
use App\Models\StockReserva;
use App\Models\Usuario;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class WompiController extends Controller
{
    public function __construct(
        protected WompiClientInterface $wompiService,
        protected ConfirmarPedidoAction $confirmarPedidoAction
    ) {}

    /**
     * POST /api/wompi/datos-pago
     * Genera enlace de pago Wompi para un pedido en estado draft o pendiente_pago.
     */
    public function datosPago(DatosPagoRequest $request): JsonResponse
    {
        $publicKey = (string) config('services.wompi.public_key', '');
        $privateKey = (string) config('services.wompi.private_key', '');

        if ($publicKey === '' || $privateKey === '') {
            return ApiResponse::error('Pasarela de pago no configurada. Contacta al administrador.', 503);
        }

        $pedidoId = $request->getPedidoId();

        /** @var Pedido|null $pedido */
        $pedido = Pedido::find($pedidoId);

        if (! $pedido) {
            return ApiResponse::error('Pedido no encontrado.', 404);
        }

        /** @var Usuario $user */
        $user = $request->user();

        if ($pedido->usuario_id !== $user->id) {
            return ApiResponse::error('No autorizado.', 403);
        }

        if (! in_array($pedido->estado, [EstadoPedido::DRAFT, EstadoPedido::PENDIENTE_PAGO], true)) {
            return ApiResponse::error(
                "El pedido ya fue procesado (estado: {$pedido->estado->value}). Si tienes dudas, escríbenos.",
                409
            );
        }

        $pedido->update(['estado' => EstadoPedido::PENDIENTE_PAGO]);

        $montoCentavos = (int) round((float) $pedido->total * 100);
        $referencia = (string) $pedido->wompi_referencia;
        $moneda = 'COP';
        $redirectUrl = config('services.frontend_url', config('app.url', 'http://localhost:4200')).'/pago-exitoso';

        try {
            $linkPayload = [
                'name' => "Pedido {$referencia}",
                'description' => "Pago de pedido Plaxtilineas #{$pedidoId}",
                'single_use' => true,
                'collect_shipping' => false,
                'currency' => $moneda,
                'amount_in_cents' => $montoCentavos,
                'redirect_url' => $redirectUrl,
                'sku' => $referencia,
            ];

            $responseData = $this->wompiService->crearPaymentLink($linkPayload);
            /** @var array<string, mixed> $data */
            $data = $responseData['data'] ?? [];
            $linkId = (string) ($data['id'] ?? '');

            if ($linkId === '') {
                return ApiResponse::error('No se pudo crear el enlace de pago. Intenta de nuevo.', 502);
            }

            $checkoutUrl = "https://checkout.wompi.co/l/{$linkId}";
            $pedido->update(['wompi_link_id' => $linkId]);

            return ApiResponse::success([
                'public_key' => $publicKey,
                'referencia' => $referencia,
                'monto_centavos' => $montoCentavos,
                'moneda' => $moneda,
                'firma' => '',
                'redirect_url' => $checkoutUrl,
                'pedido_id' => $pedidoId,
                'checkout_url' => $checkoutUrl,
            ]);
        } catch (Throwable $e) {
            Log::error('WompiController::datosPago — Error generando link', [
                'pedido_id' => $pedidoId,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error('Error de conexión con la pasarela de pago.', 502);
        }
    }

    /**
     * POST /api/wompi/webhook
     * Recibe eventos de la pasarela Wompi con validación de checksum HMAC-SHA256 e idempotencia.
     */
    public function webhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        /** @var array<string, mixed>|null $evento */
        $evento = json_decode($rawBody, true);

        if (! is_array($evento) || empty($evento)) {
            return response()->json(['error' => 'Body inválido'], 400);
        }

        $checksum = $request->header('X-Event-Checksum');

        $eventoId = (string) ($evento['id'] ?? '');
        $createdAt = (string) ($evento['created_at'] ?? '');
        /** @var array<string, mixed> $dataTx */
        $dataTx = $evento['data']['transaction'] ?? [];
        $status = (string) ($dataTx['status'] ?? '');
        $monto = (string) ($dataTx['amount_in_cents'] ?? '');

        if (! $this->wompiService->verificarChecksum($eventoId, $createdAt, $status, $monto, $checksum)) {
            Log::error('WompiController::webhook — FIRMA INVÁLIDA', [
                'evento_id' => $eventoId,
                'checksum_recibido' => $checksum,
            ]);

            return response()->json(['error' => 'Firma de evento inválida'], 401);
        }

        $tipoEvento = (string) ($evento['event'] ?? '');
        $referencia = (string) ($dataTx['reference'] ?? '');
        $transId = (string) ($dataTx['id'] ?? '');
        $montoCents = (int) ($dataTx['amount_in_cents'] ?? 0);
        $paymentLinkId = (string) ($dataTx['payment_link_id'] ?? '');

        if ($tipoEvento !== 'transaction.updated') {
            return response()->json(['mensaje' => 'Evento ignorado (no es transaction.updated)'], 200);
        }

        /** @var Pedido|null $pedido */
        $pedido = null;
        if ($paymentLinkId !== '') {
            $pedido = Pedido::where('wompi_link_id', $paymentLinkId)->first();
        }
        if (! $pedido && $referencia !== '') {
            $pedido = Pedido::where('wompi_referencia', $referencia)->first();
        }

        if (! $pedido) {
            Log::warning('WompiController::webhook — Pedido no encontrado', [
                'referencia' => $referencia,
                'link_id' => $paymentLinkId,
            ]);

            return response()->json(['mensaje' => 'Pedido no encontrado'], 200);
        }

        // Idempotencia: verificar si el evento ya fue procesado
        if ($eventoId !== '' && Pedido::where('wompi_evento_id', $eventoId)->exists()) {
            Log::info('WompiController::webhook — Evento duplicado ignorado', ['evento_id' => $eventoId]);

            return response()->json(['mensaje' => 'Evento ya procesado'], 200);
        }

        switch ($status) {
            case 'APPROVED':
                $this->confirmarPedidoAction->execute($pedido->id, $transId, $eventoId, $montoCents);
                break;

            case 'VOIDED':
            case 'DECLINED':
            case 'ERROR':
                $pedido->update([
                    'estado' => EstadoPedido::CANCELADO,
                    'wompi_transaction_id' => $transId,
                    'wompi_evento_id' => $eventoId,
                ]);
                StockReserva::where('pedido_id', $pedido->id)->delete();
                break;

            default:
                Log::info("WompiController::webhook — Estado sin acción: {$status}");
                break;
        }

        return response()->json(['mensaje' => 'Webhook procesado'], 200);
    }
}
