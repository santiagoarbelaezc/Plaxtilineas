<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordTemporalMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombre,
        public string $tempPassword
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Recuperación de Contraseña - Plaxtilineas'
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                    <h2 style="color: #0a0e17; text-align: center;">Recuperación de Contraseña</h2>
                    <p style="color: #4a5568; font-size: 16px;">Hola '.htmlspecialchars($this->nombre, ENT_QUOTES, 'UTF-8').',</p>
                    <p style="color: #4a5568; font-size: 16px;">Hemos generado una contraseña temporal para que puedas acceder a tu cuenta:</p>
                    <div style="background-color: #f7fafc; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2b6cb0;">'.htmlspecialchars($this->tempPassword, ENT_QUOTES, 'UTF-8').'</span>
                    </div>
                    <p style="color: #e53e3e; font-size: 14px; font-weight: bold;">Por motivos de seguridad, el sistema te solicitará cambiar esta contraseña inmediatamente después de iniciar sesión.</p>
                </div>
            '
        );
    }
}
