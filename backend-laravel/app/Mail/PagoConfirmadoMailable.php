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
                <td style='padding: 12px 8px;border-bottom:1px solid #e2e8f0;color:#334155;'>{$nombre}</td>
                <td style='padding: 12px 8px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;'>{$cant}</td>
                <td style='padding: 12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;'>\${$precio}</td>
                <td style='padding: 12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#334155;font-weight:700;'>\${$sub}</td>
            </tr>";
        }

        $nombreCliente = htmlspecialchars($this->nombreCliente, ENT_QUOTES, 'UTF-8');
        $codigoPedido = htmlspecialchars($this->codigoPedido, ENT_QUOTES, 'UTF-8');
        $html = "
        <div style='margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#334155;'>
          <div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;'>
            <div style='height:3px;background:#16a34a;'></div>
            <div style='padding:34px 36px 30px;'>
              <div style='font-size:13px;font-weight:800;letter-spacing:3px;color:#16a34a;text-transform:uppercase;'>PLAXTILINEAS</div>
              <div style='margin:22px 0 26px;padding:18px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;'>
                <div style='color:#15803d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;'>Pago confirmado</div>
                <h1 style='margin:8px 0 0;color:#0f172a;font-size:26px;line-height:1.25;'>Gracias por tu compra, {$nombreCliente}</h1>
              </div>
              <p style='margin:0 0 22px;color:#64748b;font-size:15px;line-height:1.7;'>Tu pedido <strong style='color:#0f172a;'>{$codigoPedido}</strong> fue confirmado correctamente. Este es el resumen de tu compra:</p>
              <table style='width:100%;border-collapse:collapse;font-size:13px;'>
                <thead>
                  <tr style='background:#f8fafc;color:#64748b;'>
                    <th style='padding:11px 8px;text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;'>Producto</th>
                    <th style='padding:11px 8px;text-align:center;font-size:11px;letter-spacing:.08em;text-transform:uppercase;'>Cant.</th>
                    <th style='padding:11px 8px;text-align:right;font-size:11px;letter-spacing:.08em;text-transform:uppercase;'>Unitario</th>
                    <th style='padding:11px 8px;text-align:right;font-size:11px;letter-spacing:.08em;text-transform:uppercase;'>Subtotal</th>
                  </tr>
                </thead>
                <tbody>{$itemsHtml}</tbody>
              </table>
              <div style='margin-top:22px;border-top:1px solid #e2e8f0;padding-top:16px;text-align:right;color:#64748b;font-size:13px;line-height:1.8;'>
                <div>Subtotal: <strong style='color:#334155;'>\$".number_format($this->subtotal, 2)." COP</strong></div>
                <div>IVA: <strong style='color:#334155;'>\$".number_format($this->iva, 2)." COP</strong></div>
                <div>Envío: <strong style='color:#334155;'>\$".number_format($this->costoEnvio, 2)." COP</strong></div>
                <div style='margin-top:6px;color:#0f172a;font-size:18px;font-weight:800;'>Total: \$".number_format($this->total, 2)." COP</div>
              </div>
              <p style='margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;'>Te notificaremos tan pronto como tu paquete esté en camino.</p>
            </div>
            <div style='border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;'>Plásticos técnicos, espumas industriales y soluciones para tu negocio.<br><strong style='color:#0f172a;'>Plaxtilineas SAS</strong></div>
          </div>
        </div>";

        return new Content(
            htmlString: $html,
        );
    }
}
