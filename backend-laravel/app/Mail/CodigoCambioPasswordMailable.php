<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CodigoCambioPasswordMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombre,
        public string $codigo,
        public int $expiraMinutos = 10
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Código de verificación para cambiar tu contraseña - Plaxtilineas'
        );
    }

    public function content(): Content
    {
        $nombre = htmlspecialchars($this->nombre, ENT_QUOTES, 'UTF-8');
        $codigo = htmlspecialchars($this->codigo, ENT_QUOTES, 'UTF-8');
        $expira = (string) $this->expiraMinutos;

        return new Content(
            htmlString: '
                <div style="margin:0;background:#f4f5f7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#383838;">
                    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1.5px solid #e4e4e7;border-radius:16px;overflow:hidden;">
                        <div style="height:4px;background:#379045;"></div>
                        <div style="padding:36px 36px 30px;">
                            <div style="font-size:12px;font-weight:800;letter-spacing:3px;color:#379045;text-transform:uppercase;">PLAXTILINEAS</div>
                            <h1 style="margin:16px 0 12px;color:#09090b;font-size:24px;line-height:1.25;">Confirma tu cambio de contraseña</h1>
                            <p style="margin:0;color:#5e5e5e;font-size:15px;line-height:1.7;">Hola '.$nombre.', recibimos una solicitud para actualizar la contraseña de tu cuenta. Usa el siguiente código de verificación para confirmar que eres tú:</p>
                            <div style="margin:28px 0;padding:22px;text-align:center;background:#eaf4ec;border:1.5px solid rgba(55,144,69,0.3);border-radius:12px;">
                                <div style="font-size:11px;font-weight:700;color:#2c7337;letter-spacing:2px;text-transform:uppercase;">Código de verificación</div>
                                <div style="margin-top:10px;color:#09090b;font-size:32px;font-weight:800;letter-spacing:8px;">'.$codigo.'</div>
                                <div style="margin-top:8px;font-size:12px;color:#5e5e5e;">Válido por '.$expira.' minutos</div>
                            </div>
                            <div style="padding:14px 16px;background:#f8f9fa;border-left:3px solid #379045;color:#5e5e5e;font-size:13px;line-height:1.6;">Por tu seguridad, nunca compartas este código con nadie. Si no solicitaste este cambio, puedes ignorar este correo.</div>
                        </div>
                        <div style="border-top:1px solid #e4e4e7;padding:20px 36px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">Armenia, Quindío &bull; Eje Cafetero<br><strong style="color:#09090b;">Plaxtilineas SAS</strong></div>
                    </div>
                </div>
            '
        );
    }
}
