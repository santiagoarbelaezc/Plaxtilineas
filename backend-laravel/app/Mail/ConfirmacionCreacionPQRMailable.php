<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConfirmacionCreacionPQRMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreCompleto,
        public string $numeroTicket,
        public string $tipo,
        public string $descripcion
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Confirmación de PQR {$this->numeroTicket} - Plaxtilineas",
        );
    }

    public function content(): Content
    {
        $descSafe = nl2br(htmlspecialchars($this->descripcion, ENT_QUOTES, 'UTF-8'));
        $html = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
            <h2 style='color: #1e293b;'>Hola, {$this->nombreCompleto}</h2>
            <p>Hemos recibido tu solicitud de tipo <strong>{$this->tipo}</strong> con número de radicado:</p>
            <div style='background: #f1f5f9; padding: 15px; border-radius: 6px; text-align: center; margin: 15px 0;'>
                <span style='font-size: 20px; font-weight: bold; color: #2563eb;'>{$this->numeroTicket}</span>
            </div>
            <p><strong>Detalle de la solicitud:</strong></p>
            <blockquote style='background: #f8fafc; padding: 10px; border-left: 3px solid #cbd5e1; margin: 10px 0;'>{$descSafe}</blockquote>
            <p style='color: #64748b; font-size: 13px; margin-top: 20px;'>Puedes consultar el estado de tu solicitud en cualquier momento ingresando tu número de radicado en nuestro portal web.</p>
        </div>";

        return new Content(
            htmlString: $html,
        );
    }
}
