<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificacionEmailMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombre,
        public string $codigo
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Código de Verificación - Plaxtilineas'
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                    <h2 style="color: #0a0e17; text-align: center;">¡Bienvenido a Plaxtilineas, '.htmlspecialchars($this->nombre, ENT_QUOTES, 'UTF-8').'!</h2>
                    <p style="color: #4a5568; font-size: 16px;">Para completar tu registro y activar tu cuenta, por favor ingresa el siguiente código de verificación:</p>
                    <div style="background-color: #f7fafc; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2b6cb0;">'.htmlspecialchars($this->codigo, ENT_QUOTES, 'UTF-8').'</span>
                    </div>
                    <p style="color: #718096; font-size: 14px;">Este código expirará en 24 horas. Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
                </div>
            '
        );
    }
}
