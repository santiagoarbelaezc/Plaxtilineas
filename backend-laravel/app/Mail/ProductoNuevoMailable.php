<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProductoNuevoMailable extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $producto
     */
    public function __construct(
        public string $nombre,
        public array $producto,
        public string $tokenBaja,
    ) {}

    public function envelope(): Envelope
    {
        $nombreProducto = (string) ($this->producto['nombre'] ?? 'Nuevo producto');

        return new Envelope(
            subject: 'Nuevo en Plaxtilíneas: '.mb_substr($nombreProducto, 0, 80)
        );
    }

    public function content(): Content
    {
        $e = static fn (mixed $v): string => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

        $nombreCliente = $e($this->nombre);
        $nombreProducto = $e($this->producto['nombre'] ?? '');
        $descripcion = $e($this->producto['descripcion'] ?? '');
        $categoria = $e($this->producto['categoria'] ?? '');
        $imagen = $e($this->producto['imagen_url'] ?? '');

        $unidad = $e($this->producto['unidad'] ?? 'und');
        $precioHtml = '';
        if (isset($this->producto['precio']) && (float) $this->producto['precio'] > 0) {
            $precio = number_format((float) $this->producto['precio'], 0, ',', '.');
            $precioHtml = "<div style='margin:14px 0 4px;color:#0f172a;font-size:28px;font-weight:800;'>\${$precio} <span style='font-size:14px;color:#64748b;font-weight:700;'>{$unidad}</span></div>";
        }

        $imagenHtml = $imagen !== ''
            ? "<div style='margin:22px 0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;text-align:center;'><img src='{$imagen}' alt='{$nombreProducto}' style='max-width:100%;max-height:280px;height:auto;'></div>"
            : '';

        $categoriaHtml = $categoria !== ''
            ? "<div style='font-size:12px;font-weight:800;letter-spacing:.08em;color:#15803d;text-transform:uppercase;'>{$categoria}</div>"
            : '';

        $descripcionHtml = $descripcion !== ''
            ? "<p style='margin:8px 0 0;color:#64748b;font-size:15px;line-height:1.7;'>{$descripcion}</p>"
            : '';

        $frontend = rtrim((string) config('services.catalogo.origin', ''), '/');
        $urlProducto = $e($frontend.'/producto/'.(int) ($this->producto['id'] ?? 0));
        $urlBaja = $e(url('/api/notificaciones/baja/'.$this->tokenBaja));

        $html = "
        <div style='margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#334155;'>
          <div style='max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;'>
            <div style='height:3px;background:#16a34a;'></div>
            <div style='padding:34px 36px 30px;'>
              <div style='font-size:13px;font-weight:800;letter-spacing:3px;color:#16a34a;text-transform:uppercase;'>PLAXTILINEAS</div>
              <h1 style='margin:20px 0 6px;color:#0f172a;font-size:24px;line-height:1.25;'>Hola {$nombreCliente}, tenemos un producto nuevo para ti</h1>
              <p style='margin:0;color:#64748b;font-size:15px;line-height:1.7;'>Acaba de llegar a nuestro catálogo. Entra y consíguelo antes de que se agote.</p>
              {$imagenHtml}
              {$categoriaHtml}
              <h2 style='margin:6px 0 0;color:#0f172a;font-size:22px;line-height:1.3;text-transform:uppercase;'>{$nombreProducto}</h2>
              {$descripcionHtml}
              {$precioHtml}
              <div style='margin-top:26px;'>
                <a href='{$urlProducto}' style='display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:.06em;padding:14px 34px;border-radius:50px;'>VER PRODUCTO Y COMPRAR</a>
              </div>
            </div>
            <div style='border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;'>
              Plásticos técnicos, espumas industriales y soluciones para tu negocio.<br>
              <strong style='color:#0f172a;'>Plaxtilineas SAS</strong><br>
              <a href='{$urlBaja}' style='color:#94a3b8;'>Dejar de recibir novedades</a>
            </div>
          </div>
        </div>";

        return new Content(htmlString: $html);
    }
}

