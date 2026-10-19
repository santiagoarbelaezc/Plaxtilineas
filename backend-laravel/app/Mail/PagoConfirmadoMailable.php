<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PagoConfirmadoMailable extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, array<string, mixed>>  $detalles
     */
    public function __construct(
        public string $nombreCliente,
        public string $codigoPedido,
        public array $detalles,
        public float $subtotal,
        public float $iva,
        public float $costoEnvio,
        public float $total
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "¡Tu pedido {$this->codigoPedido} ha sido confirmado! - Plaxtilineas",
        );
    }

    public function content(): Content
    {
        $itemsHtml = '';
        foreach ($this->detalles as $det) {
            $nombre = htmlspecialchars((string) ($det['nombre_producto'] ?? 'Producto'), ENT_QUOTES, 'UTF-8');
            $cant = (int) ($det['cantidad'] ?? 1);
            $precio = number_format((float) ($det['precio_unitario'] ?? 0), 2);
            $sub = number_format((float) ($det['subtotal'] ?? ($cant * (float) ($det['precio_unitario'] ?? 0))), 2);

            $itemsHtml .= "<tr>
                <td style='padding: 8px; border-bottom: 1px solid #ddd;'>{$nombre}</td>
                <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: center;'>{$cant}</td>
                <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>\${$precio} COP</td>
                <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>\${$sub} COP</td>
            </tr>";
        }

        $html = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
            <h2 style='color: #166534;'>¡Gracias por tu compra, {$this->nombreCliente}!</h2>
            <p>Hemos confirmado tu pedido con el código <strong>{$this->codigoPedido}</strong>.</p>
            <table style='width: 100%; border-collapse: collapse; margin-top: 15px;'>
                <thead>
                    <tr style='background: #f1f5f9;'>
                        <th style='padding: 8px; text-align: left;'>Producto</th>
                        <th style='padding: 8px; text-align: center;'>Cant.</th>
                        <th style='padding: 8px; text-align: right;'>Precio Unit.</th>
                        <th style='padding: 8px; text-align: right;'>Subtotal</th>
                    </tr>
                </thead>
                <tbody>{$itemsHtml}</tbody>
            </table>
            <div style='margin-top: 20px; text-align: right;'>
                <p><strong>Subtotal:</strong> \$".number_format($this->subtotal, 2)." COP</p>
                <p><strong>IVA:</strong> \$".number_format($this->iva, 2)." COP</p>
                <p><strong>Costo de Envío:</strong> \$".number_format($this->costoEnvio, 2)." COP</p>
                <h3 style='color: #1e293b;'>Total: \$".number_format($this->total, 2)." COP</h3>
            </div>
            <p style='color: #64748b; font-size: 13px; margin-top: 20px;'>Te notificaremos tan pronto como tu paquete esté en camino.</p>
        </div>";

        return new Content(
            htmlString: $html,
        );
    }
}
