<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CambioEstadoPedidoMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreCliente,
        public string $codigoPedido,
        public string $estadoAnterior,
        public string $nuevoEstado,
        public ?string $guiaNumero = null,
        public ?string $transportadora = null
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Actualización de tu pedido {$this->codigoPedido} - Plaxtilineas",
        );
    }

    public function content(): Content
    {
        $guiaHtml = '';
        if ($this->guiaNumero || $this->transportadora) {
            $guiaHtml = "<div style='margin-top: 15px; padding: 12px; background: #f8fafc; border-left: 4px solid #3b82f6;'>
                <p style='margin: 0;'><strong>Transportadora:</strong> ".($this->transportadora ?? 'N/A').'</p>
                <p style="margin: 0;"><strong>Número de guía:</strong> '.($this->guiaNumero ?? 'N/A').'</p>
            </div>';
        }

        $html = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
            <h2 style='color: #1e293b;'>Hola, {$this->nombreCliente}</h2>
            <p>El estado de tu pedido <strong>{$this->codigoPedido}</strong> ha cambiado:</p>
            <p style='font-size: 16px;'>De <span style='color: #64748b;'>{$this->estadoAnterior}</span> a <strong style='color: #2563eb;'>{$this->nuevoEstado}</strong>.</p>
            {$guiaHtml}
            <p style='margin-top: 25px; color: #64748b; font-size: 13px;'>Si tienes dudas sobre tu pedido, contáctanos a soporte@plaxtilineas.com.</p>
        </div>";

        return new Content(
            htmlString: $html,
        );
    }
}
