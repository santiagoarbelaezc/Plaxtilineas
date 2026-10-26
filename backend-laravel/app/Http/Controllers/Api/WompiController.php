<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Payments\CreateCheckoutAction;
use App\Actions\Payments\ProcessWompiEventAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Wompi\DatosPagoRequest;
use App\Models\Pedido;
use App\Models\Usuario;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * WompiController
 *
 * Controlador delgado — toda la lógica de negocio vive en los Actions.
 *
 * Endpoints:
 *   POST /api/wompi/datos-pago  → genera el checkout (auth:sanctum)
 *   POST /api/wompi/webhook     → recibe eventos de Wompi (throttle, sin auth)
 */
class WompiController extends Controller
{
    public function __construct(
        private readonly CreateCheckoutAction    $createCheckoutAction,
        private readonly ProcessWompiEventAction $processEventAction,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/wompi/datos-pago
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Genera los datos necesarios para abrir el widget de Wompi o redirigir
     * al Checkout Web. El total siempre se recalcula desde la BD.
     */
    public function datosPago(DatosPagoRequest $request): JsonResponse
    {
        // Verificar que las llaves están configuradas
        $publicKey  = (string) config('wompi.public_key', '');
        $privateKey = (string) config('wompi.private_key', '');

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

        // Policy: solo el dueño puede pagar su pedido
        if ($pedido->usuario_id !== $user->id) {
            return ApiResponse::error('No autorizado.', 403);
        }

        try {
            $checkoutData = $this->createCheckoutAction->execute($pedido);

            return ApiResponse::success($checkoutData);
        } catch (Throwable $e) {
            Log::error('WompiController::datosPago — Error generando checkout', [
                'pedido_id' => $pedidoId,
                'error'     => $e->getMessage(),
            ]);

            $httpCode = method_exists($e, 'httpStatus') ? (int) $e->httpStatus() : 502;

            return ApiResponse::error($e->getMessage() ?: 'Error de conexión con la pasarela de pago.', $httpCode);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/wompi/webhook
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Endpoint público (sin auth) que recibe los eventos de Wompi.
     *
     * Seguridad:
     *   - Excluido de CSRF (ver bootstrap/app.php o VerifyCsrfToken::$except)
     *   - Protegido por throttle:wompi-webhook (ver RouteServiceProvider)
     *   - Validación de checksum HMAC-SHA256 dentro del Action
     */
    public function webhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();

        /** @var array<string, mixed>|null $evento */
        $evento = json_decode($rawBody, true);

        if (! is_array($evento) || empty($evento)) {
            Log::warning('WompiController::webhook — Body inválido o vacío');

            return response()->json(['error' => 'Body inválido'], 400);
        }

        $checksum = $request->header('X-Event-Checksum');

        $result = $this->processEventAction->execute($evento, $checksum);

        return response()->json(
            ['mensaje' => $result['message']],
            $result['http_code']
        );
    }
}
