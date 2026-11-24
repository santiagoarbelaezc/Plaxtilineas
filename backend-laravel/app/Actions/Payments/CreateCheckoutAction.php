<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Enums\EstadoPedido;
use App\Exceptions\Domain\CheckoutInvalidoException;
use App\Models\Pedido;
use App\Services\Wompi\SignatureService;
use Illuminate\Support\Facades\Log;

/**
 * CreateCheckoutAction
 *
 * Genera los parámetros firmados para el Web Checkout / Widget oficial de Wompi:
 *   1. Verifica que el pedido esté en estado elegible (draft / pendiente_pago).
 *   2. Recalcula el monto en centavos DESDE LA BD (nunca desde el cliente).
 *   3. Marca el pedido como pendiente_pago.
 *   4. Genera la firma criptográfica SHA-256:
 *      SHA256( referencia + montoEnCentavos + moneda + secretoIntegridad )
 *   5. Retorna exclusivamente datos públicos + firma al frontend (ningún secreto sale del servidor).
 */
final class CreateCheckoutAction
{
    private const WOMPI_WEB_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

    public function __construct(
        private readonly SignatureService $signatureService,
    ) {}

    /**
     * @return array<string, mixed>
     *
     * @throws CheckoutInvalidoException
     */
    public function execute(Pedido $pedido): array
    {
        // ── 1. Guard: el pedido debe estar en estado elegible ──────────────────
        if (! in_array($pedido->estado, [EstadoPedido::DRAFT, EstadoPedido::PENDIENTE_PAGO], true)) {
            throw new CheckoutInvalidoException(
                "El pedido ya fue procesado (estado: {$pedido->estado->value}). Si tienes dudas, escríbenos.",
                409
            );
        }

        // ── 2. Recalcular monto DESDE LA BD (fuente de verdad) ─────────────────
        $pedido->loadMissing('usuario');
        $pedido->refresh();

        $amountCents = (int) round((float) $pedido->total * 100);
        if ($amountCents <= 0) {
            throw new CheckoutInvalidoException('El monto del pedido no es válido para procesar el pago.', 422);
        }

        $currency = 'COP';
        $reference = trim((string) $pedido->wompi_referencia);
        if ($reference === '') {
            $reference = 'PLX-'.$pedido->id.'-'.strtoupper(bin2hex(random_bytes(3)));
            $pedido->wompi_referencia = $reference;
        }

        $redirectUrl = (string) config('wompi.redirect_url');
        $publicKey = trim((string) config('wompi.public_key', ''));

        // ── 3. Marcar pedido como pendiente_pago ───────────────────────────────
        $pedido->update([
            'estado' => EstadoPedido::PENDIENTE_PAGO,
            'wompi_referencia' => $reference,
        ]);

        // ── 4. Generar firma de integridad SHA-256 en el servidor ──────────────
        $signature = $this->signatureService->buildIntegritySignature($reference, $amountCents, $currency);

        // ── 5. Preparar datos opcionales prellenados del cliente ───────────────
        $emailCliente = trim((string) ($pedido->email_cliente ?: $pedido->usuario?->correo ?: ''));
        $nombreCliente = trim((string) ($pedido->nombre_cliente ?: trim(($pedido->usuario?->nombre ?? '').' '.($pedido->usuario?->apellidos ?? ''))));
        $telefonoLimpio = preg_replace('/\D+/', '', (string) ($pedido->telefono_contacto ?: $pedido->usuario?->telefono ?: '')) ?? '';
        if (strlen($telefonoLimpio) === 12 && str_starts_with($telefonoLimpio, '57')) {
            $telefonoLimpio = substr($telefonoLimpio, 2);
        }

        $customerData = array_filter([
            'email' => $emailCliente !== '' ? $emailCliente : null,
            'full_name' => $nombreCliente !== '' ? $nombreCliente : null,
            'phone_number' => strlen($telefonoLimpio) === 10 ? $telefonoLimpio : null,
            'phone_number_prefix' => strlen($telefonoLimpio) === 10 ? '+57' : null,
        ], static fn ($v) => $v !== null);

        Log::info('CreateCheckoutAction — Checkout firmado generado', [
            'pedido_id' => $pedido->id,
            'codigo_pedido' => $pedido->codigo_pedido,
            'reference' => $reference,
            'amount_cents' => $amountCents,
        ]);

        return [
            'public_key' => $publicKey,
            'referencia' => $reference,
            'monto_centavos' => $amountCents,
            'moneda' => $currency,
            'firma_integridad' => $signature,
            'firma' => $signature,
            'redirect_url' => $redirectUrl,
            'checkout_url' => self::WOMPI_WEB_CHECKOUT_URL,
            'pedido_id' => $pedido->id,
            'codigo_pedido' => $pedido->codigo_pedido,
            'customer_data' => $customerData,
        ];
    }
}
