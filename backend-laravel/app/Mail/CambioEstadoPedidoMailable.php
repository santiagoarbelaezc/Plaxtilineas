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
        public ?string $transportadora = null,
        public ?string $evidenciaEnvioUrl = null,
        public ?string $evidenciaEntregaUrl = null
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Actualización de tu pedido {$this->codigoPedido} - Plaxtilineas",
        );
    }

    public function content(): Content
    {
        $estadoAnteriorLabel = $this->formatearEstado($this->estadoAnterior);
        $nuevoEstadoLabel = $this->formatearEstado($this->nuevoEstado);
        $cambioEstado = $this->estadoAnterior !== $this->nuevoEstado;

        $estadoHtml = $cambioEstado
            ? '<p style="margin: 0 0 10px 0; color: #334155;">El estado de tu pedido <strong>'.e($this->codigoPedido).'</strong> ha cambiado:</p>'
              .'<p style="margin: 0 0 14px 0; font-size: 16px;">De <span style="color: #64748b;">'.e($estadoAnteriorLabel).'</span> a <strong style="color: #16a34a;">'.e($nuevoEstadoLabel).'</strong>.</p>'
            : '<p style="margin: 0 0 10px 0; color: #334155;">Se han actualizado los datos de envío de tu pedido <strong>'.e($this->codigoPedido).'</strong>.</p>'
              .'<p style="margin: 0 0 14px 0; font-size: 15px;">Estado actual: <strong style="color: #16a34a;">'.e($nuevoEstadoLabel).'</strong>.</p>';

        $guiaHtml = '';
        if ($this->guiaNumero || $this->transportadora || $this->evidenciaEnvioUrl) {
            $evidenciaLink = $this->evidenciaEnvioUrl
                ? '<p style="margin: 12px 0 0 0;"><a href="'.e($this->evidenciaEnvioUrl).'" target="_blank" style="display:inline-block;padding:9px 16px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Ver foto de evidencia del envío</a></p>'
                : '';

            $guiaHtml = '<div style="margin-top: 15px; padding: 14px; background: #f8fafc; border-left: 4px solid #16a34a; border-radius: 6px;">'
                .'<p style="margin: 0 0 6px 0;"><strong>Transportadora:</strong> '.e($this->transportadora ?? 'N/A').'</p>'
                .'<p style="margin: 0;"><strong>Número de guía:</strong> '.e($this->guiaNumero ?? 'N/A').'</p>'
                .$evidenciaLink
                .'</div>';
        }

        $entregaHtml = '';
        if ($this->evidenciaEntregaUrl) {
            $entregaHtml = '<div style="margin-top: 15px; padding: 14px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;">'
                .'<p style="margin: 0 0 8px 0; color: #166534;"><strong>Entrega confirmada con evidencia fotográfica</strong></p>'
                .'<p style="margin: 0;"><a href="'.e($this->evidenciaEntregaUrl).'" target="_blank" style="display:inline-block;padding:9px 16px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Ver foto de evidencia de la entrega</a></p>'
                .'</div>';
        }

        $html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; color: #09090b;">'
            .'<h2 style="color: #09090b; margin-top: 0;">Hola, '.e($this->nombreCliente).'</h2>'
            .$estadoHtml
            .$guiaHtml
            .$entregaHtml
            .'<p style="margin-top: 25px; color: #64748b; font-size: 13px;">Si tienes dudas sobre tu pedido, contáctanos a soporte@plaxtilineas.com.</p>'
            .'</div>';

        return new Content(
            htmlString: $html,
        );
    }

    private function formatearEstado(string $estado): string
    {
        return match ($estado) {
            'draft' => 'Borrador',
            'pendiente_pago' => 'Pendiente de Pago',
            'pendiente' => 'Pendiente',
            'pagado' => 'Pago Confirmado',
            'confirmado' => 'Confirmado',
            'en_preparacion' => 'En Preparación',
            'en_camino' => 'En Camino',
            'entregado' => 'Entregado',
            'cancelado' => 'Cancelado',
            default => ucfirst(str_replace('_', ' ', $estado)),
        };
    }
}
