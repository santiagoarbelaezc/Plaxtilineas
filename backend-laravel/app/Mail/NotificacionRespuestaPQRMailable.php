<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotificacionRespuestaPQRMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreCompleto,
        public string $numeroTicket,
        public string $mensaje,
        public string $nuevoEstado
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Respuesta a tu PQR {$this->numeroTicket} - Plaxtilineas",
        );
    }

    public function content(): Content
    {
        $mensajeSafe = nl2br(htmlspecialchars($this->mensaje, ENT_QUOTES, 'UTF-8'));
        $html = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
            <h2 style='color: #1e293b;'>Hola, {$this->nombreCompleto}</h2>
            <p>El equipo de atención al cliente ha respondido a tu solicitud <strong>{$this->numeroTicket}</strong>:</p>
            <div style='background: #f8fafc; padding: 15px; border-left: 4px solid #16a34a; border-radius: 4px; margin: 15px 0;'>
                {$mensajeSafe}
            </div>
            <p><strong>Estado actual de la PQR:</strong> <span style='font-weight: bold; color: #2563eb;'>{$this->nuevoEstado}</span></p>
            <p style='color: #64748b; font-size: 13px; margin-top: 25px;'>Gracias por contactarte con Plaxtilineas.</p>
        </div>";

        return new Content(
            htmlString: $html,
        );
    }
}
