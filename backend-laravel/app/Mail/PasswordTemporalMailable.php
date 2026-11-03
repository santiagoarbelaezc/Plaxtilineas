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
        $nombre = htmlspecialchars($this->nombre, ENT_QUOTES, 'UTF-8');
        $password = htmlspecialchars($this->tempPassword, ENT_QUOTES, 'UTF-8');

        return new Content(
            htmlString: '
                <div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#334155;">
                    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                        <div style="height:3px;background:#16a34a;"></div>
                        <div style="padding:34px 36px 30px;">
                            <div style="font-size:13px;font-weight:800;letter-spacing:3px;color:#16a34a;text-transform:uppercase;">PLAXTILINEAS</div>
                            <h1 style="margin:18px 0 12px;color:#0f172a;font-size:26px;line-height:1.25;">Recupera tu acceso</h1>
                            <p style="margin:0;color:#64748b;font-size:16px;line-height:1.7;">Hola '.$nombre.', generamos una contraseña temporal para que puedas volver a ingresar a tu cuenta.</p>
                            <div style="margin:28px 0;padding:20px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                                <div style="font-size:12px;color:#64748b;letter-spacing:2px;text-transform:uppercase;">Contraseña temporal</div>
                                <div style="margin-top:10px;color:#0f172a;font-size:23px;font-weight:800;letter-spacing:2px;">'.$password.'</div>
                            </div>
                            <div style="padding:14px 16px;background:#fffbeb;border-left:3px solid #f59e0b;color:#92400e;font-size:13px;line-height:1.6;">Por seguridad, cambia esta contraseña inmediatamente después de iniciar sesión.</div>
                        </div>
                        <div style="border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">Si no solicitaste este cambio, contacta a nuestro equipo.<br><strong style="color:#0f172a;">Plaxtilineas SAS</strong></div>
                    </div>
                </div>
            '
        );
    }
}
