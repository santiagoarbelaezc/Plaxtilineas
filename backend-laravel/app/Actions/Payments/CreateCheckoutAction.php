<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Enums\EstadoPedido;
use App\Exceptions\Domain\DomainException;
use App\Models\Pedido;
use App\Services\Wompi\SignatureService;
use App\Services\Wompi\WompiClient;
use Illuminate\Support\Facades\Log;

/**
 * CreateCheckoutAction
 *
 * Encapsula toda la lógica de negocio para generar un checkout de Wompi:
 *   1. Recalcula el total DESDE LA BD (nunca confía en el frontend).
 *   2. Actualiza el estado del pedido a pendiente_pago.
 *   3. Genera la firma de integridad.
 *   4. Crea un Payment Link en Wompi y guarda el link_id en el pedido.
 *   5. Devuelve todos los datos que el frontend necesita para abrir el widget.
 *
 * @return array<string, mixed>
 */
final class CreateCheckoutAction
{
    public function __construct(
        private readonly WompiClient    $wompiClient,
        private readonly SignatureService $signatureService,
    ) {}

    /**
     * @return array<string, mixed>
     *
     * @throws DomainException
     */
    public function execute(Pedido $pedido): array
    {
        // ── 1. Guard: el pedido debe estar en estado elegible ──────────────────
        if (! in_array($pedido->estado, [EstadoPedido::DRAFT, EstadoPedido::PENDIENTE_PAGO], true)) {
            throw new DomainException(
                "El pedido ya fue procesado (estado: {$pedido->estado->value}). Si tienes dudas, escríbenos.",
                409
            );
        }

        // ── 2. Recalcular monto DESDE LA BD (la fuente de verdad) ──────────────
        $pedido->refresh(); // asegurar datos frescos
        $amountCents = (int) round((float) $pedido->total * 100);
        $currency    = 'COP';
        $reference   = (string) $pedido->wompi_referencia;
        $redirectUrl = (string) config('wompi.redirect_url');

        // ── 3. Marcar como pendiente_pago ──────────────────────────────────────
        $pedido->update(['estado' => EstadoPedido::PENDIENTE_PAGO]);

        // ── 4. Generar firma de integridad ─────────────────────────────────────
        $signature = $this->signatureService->buildIntegritySignature($reference, $amountCents, $currency);

        // ── 5. Crear Payment Link en Wompi ──────────────────────────────────────
        $linkPayload = [
            'name'             => "Pedido {$reference} — Plaxtilineas",
            'description'      => "Pago de pedido Plaxtilineas #{$pedido->id}",
            'single_use'       => true,
            'collect_shipping' => false,
            'currency'         => $currency,
            'amount_in_cents'  => $amountCents,
            'redirect_url'     => $redirectUrl,
            'sku'              => $reference,
        ];

        $responseData = $this->wompiClient->createPaymentLink($linkPayload);

        /** @var array<string, mixed> $data */
        $data   = $responseData['data'] ?? [];
        $linkId = (string) ($data['id'] ?? '');

        if ($linkId === '') {
            Log::error('CreateCheckoutAction — Wompi no devolvió un link_id', [
                'pedido_id' => $pedido->id,
                'response'  => $responseData,
            ]);
            throw new DomainException('No se pudo crear el enlace de pago. Intenta de nuevo.', 502);
        }

        // ── 6. Persistir link_id en el pedido ──────────────────────────────────
        $pedido->update(['wompi_link_id' => $linkId]);

        $publicKey   = (string) config('wompi.public_key', '');
        $checkoutUrl = "https://checkout.wompi.co/l/{$linkId}";

        Log::info('CreateCheckoutAction — Checkout creado', [
            'pedido_id'   => $pedido->id,
            'reference'   => $reference,
            'link_id'     => $linkId,
            'amount_cents'=> $amountCents,
        ]);

        // ── 7. Devolver datos para el widget del frontend ───────────────────────
        return [
            'public_key'      => $publicKey,
            'referencia'      => $reference,
            'monto_centavos'  => $amountCents,
            'moneda'          => $currency,
            'firma_integridad'=> $signature,
            'redirect_url'    => $redirectUrl,
            'checkout_url'    => $checkoutUrl,
            'link_id'         => $linkId,
            'pedido_id'       => $pedido->id,
        ];
    }
}
