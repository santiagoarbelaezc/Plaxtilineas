<?php
require_once __DIR__ . '/../config/config.php';

/**
 * EmailService – Envío de emails vía SMTP usando sockets PHP
 * No requiere PHPMailer. Usa fsockopen con STARTTLS para Gmail.
 *
 * Para producción en Hostinger se recomienda PHPMailer si está disponible,
 * pero este helper funciona sin ninguna dependencia.
 */
class EmailService
{
    /**
     * Enviar email de confirmación de creación de PQR al cliente
     */
    public static function enviarConfirmacionCreacionPQR(array $pqrData): array
    {
        $to      = $pqrData['email'];
        $nombre  = $pqrData['nombre_completo'];
        $ticket  = $pqrData['numero_ticket'];
        $tipo    = ucfirst(strtolower($pqrData['tipo']));
        $fecha   = $pqrData['fecha_creacion'];

        $subject = "[" . COMPANY_NAME . "] Confirmación de {$tipo} - Ticket #{$ticket}";

        $html = self::templateConfirmacion($nombre, $ticket, $tipo, $fecha, $pqrData['descripcion'] ?? '');

        return self::send($to, $subject, $html);
    }

    /**
     * Enviar notificación de respuesta de administración al cliente
     */
    public static function enviarNotificacionRespuestaPQR(array $pqrData, array $respuestaData): array
    {
        $to      = $pqrData['email'];
        $nombre  = $pqrData['nombre_completo'];
        $ticket  = $pqrData['numero_ticket'];
        $mensaje = $respuestaData['mensaje'];
        $estado  = $respuestaData['estado_nuevo'] ?? $pqrData['estado'];

        $subject = "[" . COMPANY_NAME . "] Respuesta a tu solicitud - Ticket #{$ticket}";

        $html = self::templateRespuesta($nombre, $ticket, $mensaje, $estado, $respuestaData['fecha'] ?? date('d/m/Y'));

        return self::send($to, $subject, $html);
    }

    // ─── Envío real vía SMTP ─────────────────────────────────────────────────

    private static function send(string $to, string $subject, string $htmlBody): array
    {
        try {
            $host    = SMTP_HOST;
            $port    = SMTP_PORT;
            $user    = SMTP_USER;
            $pass    = SMTP_PASS;
            $from    = SMTP_USER;
            $fromName = EMAIL_FROM_NAME;

            // Conectar
            $socket = @fsockopen($host, $port, $errno, $errstr, 5);
            if (!$socket) {
                throw new RuntimeException("No se pudo conectar al servidor SMTP: $errstr ($errno)");
            }

            // Evitar bloqueos indefinidos en lectura/escritura (5 segundos máx)
            stream_set_timeout($socket, 5);

            self::expect($socket, 220);
            self::cmd($socket, "EHLO " . php_uname('n'));
            $resp = self::readAll($socket);

            // STARTTLS
            self::cmd($socket, "STARTTLS");
            self::expect($socket, 220);

            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

            self::cmd($socket, "EHLO " . php_uname('n'));
            self::readAll($socket);

            // AUTH
            self::cmd($socket, "AUTH LOGIN");
            self::expect($socket, 334);
            self::cmd($socket, base64_encode($user));
            self::expect($socket, 334);
            self::cmd($socket, base64_encode($pass));
            self::expect($socket, 235);

            // Enviar
            self::cmd($socket, "MAIL FROM:<{$from}>");
            self::expect($socket, 250);
            self::cmd($socket, "RCPT TO:<{$to}>");
            self::expect($socket, 250);
            self::cmd($socket, "DATA");
            self::expect($socket, 354);

            $boundary = md5(uniqid());
            $headers  = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>\r\n";
            $headers .= "To: {$to}\r\n";
            $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "Content-Transfer-Encoding: base64\r\n";

            $body = $headers . "\r\n" . chunk_split(base64_encode($htmlBody)) . "\r\n.";
            self::cmd($socket, $body);
            self::expect($socket, 250);

            self::cmd($socket, "QUIT");
            fclose($socket);

            return ['success' => true];
        } catch (Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private static function cmd($socket, string $command): void
    {
        fwrite($socket, $command . "\r\n");
    }

    private static function readAll($socket): string
    {
        $data = '';
        while ($line = fgets($socket, 515)) {
            $data .= $line;
            if ($line[3] === ' ') break;
        }
        return $data;
    }

    private static function expect($socket, int $code): void
    {
        $resp = self::readAll($socket);
        if ((int)substr($resp, 0, 3) !== $code) {
            throw new RuntimeException("SMTP esperaba {$code}, recibió: $resp");
        }
    }

    // ─── Templates HTML ──────────────────────────────────────────────────────

    private static function templateConfirmacion(
        string $nombre, string $ticket, string $tipo,
        string $fecha, string $descripcion
    ): string {
        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:30px">
            <h2 style="color:#2c3e50">✅ {$tipo} Registrada - {COMPANY_NAME}</h2>
            <p>Hola <strong>{$nombre}</strong>,</p>
            <p>Hemos recibido tu {$tipo}. Aquí están los detalles:</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;border:1px solid #ddd"><strong>Número de ticket</strong></td><td style="padding:8px;border:1px solid #ddd">{$ticket}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd"><strong>Tipo</strong></td><td style="padding:8px;border:1px solid #ddd">{$tipo}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd"><strong>Fecha</strong></td><td style="padding:8px;border:1px solid #ddd">{$fecha}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd"><strong>Estado</strong></td><td style="padding:8px;border:1px solid #ddd">PENDIENTE</td></tr>
            </table>
            <p>Puedes consultar el estado de tu solicitud con el número de ticket.</p>
            <p style="color:#888">— Equipo de soporte de <strong>Plaxtilineas SAS</strong></p>
          </div>
        </body>
        </html>
        HTML;
    }

    private static function templateRespuesta(
        string $nombre, string $ticket, string $mensaje,
        string $estado, string $fecha
    ): string {
        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:30px">
            <h2 style="color:#2c3e50">💬 Respuesta a tu solicitud</h2>
            <p>Hola <strong>{$nombre}</strong>,</p>
            <p>Hemos respondido a tu solicitud (Ticket #{$ticket}):</p>
            <div style="background:#f9f9f9;border-left:4px solid #3498db;padding:15px;margin:15px 0">
              {$mensaje}
            </div>
            <p><strong>Estado actual:</strong> {$estado} | <strong>Fecha:</strong> {$fecha}</p>
            <p style="color:#888">— Equipo de soporte de <strong>Plaxtilineas SAS</strong></p>
          </div>
        </body>
        </html>
        HTML;
    }

    /**
     * Enviar email de verificación de cuenta al registrarse
     */
    public static function enviarConfirmacionEmail(string $to, string $nombre, string $codigo): array
    {
        $subject = "[" . COMPANY_NAME . "] Tu código de verificación";
        $html = self::templateVerificacionEmail($nombre, $codigo);

        return self::send($to, $subject, $html);
    }

    private static function templateVerificacionEmail(string $nombre, string $codigo): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificación de Correo - Plaxtilineas</title>
        </head>
        <body style="font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #111827; margin: 0; padding: 0; color: #ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111827; padding: 40px 20px;">
            <tr>
              <td>
                <table align="center" cellpadding="0" cellspacing="0" width="600" style="background-color: #1e293b; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);">
                  <!-- Header/Logo -->
                  <tr>
                    <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">PLAXTILINEAS</h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 40px; color: #e2e8f0;">
                      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px; font-weight: 700;">¡Hola {$nombre}!</h2>
                      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 30px;">
                        Gracias por registrarte en **Plaxtilineas**. Para completar la activación de tu cuenta, por favor introduce el siguiente código de verificación de 6 dígitos en la página de confirmación:
                      </p>
                      
                      <!-- Código de verificación -->
                      <table cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 35px;">
                        <tr>
                          <td style="background-color: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 18px 40px; text-align: center;">
                            <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 0.25em;">{$codigo}</span>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-top: 20px;">
                        Este código es válido por 24 horas y solo se puede utilizar una vez.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0f172a; padding: 25px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                      <p style="margin: 0 0 6px 0;">&copy; 2026 Plaxtilineas SAS. Todos los derechos reservados.</p>
                      <p style="margin: 0;">Cra. 19 #19-35, Armenia, Quindío | Tel: +57 (606) 7390968</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        HTML;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EMAILS DE PEDIDOS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Enviar email de confirmación de pedido al cliente
     */
    public static function enviarConfirmacionPedido(
        string $to, string $nombre, string $codigoPedido,
        array $detalles, float $total
    ): array {
        $subject = "[" . COMPANY_NAME . "] Pedido Confirmado - {$codigoPedido}";
        $html = self::templateConfirmacionPedido($nombre, $codigoPedido, $detalles, $total);
        return self::send($to, $subject, $html);
    }

    /**
     * Enviar notificación de cambio de estado del pedido
     */
    public static function enviarNotificacionEstadoPedido(
        string $to, string $nombre, string $codigoPedido,
        string $estadoAnterior, string $estadoNuevo
    ): array {
        $estadoLabel = self::getEstadoLabel($estadoNuevo);
        $subject = "[" . COMPANY_NAME . "] Tu pedido {$codigoPedido} - {$estadoLabel}";
        $html = self::templateEstadoPedido($nombre, $codigoPedido, $estadoAnterior, $estadoNuevo);
        return self::send($to, $subject, $html);
    }

    private static function getEstadoLabel(string $estado): string
    {
        return match ($estado) {
            'pendiente'       => 'Pendiente',
            'confirmado'      => 'Confirmado',
            'en_preparacion'  => 'En Preparación',
            'en_camino'       => 'En Camino',
            'entregado'       => 'Entregado',
            'cancelado'       => 'Cancelado',
            default           => ucfirst($estado),
        };
    }

    private static function getEstadoEmoji(string $estado): string
    {
        return match ($estado) {
            'pendiente'       => '🕐',
            'confirmado'      => '✅',
            'en_preparacion'  => '📦',
            'en_camino'       => '🚚',
            'entregado'       => '🎉',
            'cancelado'       => '❌',
            default           => '📋',
        };
    }

    private static function templateConfirmacionPedido(
        string $nombre, string $codigoPedido, array $detalles, float $total
    ): string {
        $productRows = '';
        foreach ($detalles as $d) {
            $subtotalItem = number_format($d['precio_unitario'] * $d['cantidad'], 0, ',', '.');
            $precioUnit = number_format($d['precio_unitario'], 0, ',', '.');
            $productRows .= "
                <tr>
                    <td style='padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; font-size: 14px;'>{$d['nombre_producto']}</td>
                    <td style='padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; text-align: center; font-size: 14px;'>{$d['cantidad']}</td>
                    <td style='padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; text-align: right; font-size: 14px;'>$ {$precioUnit}</td>
                    <td style='padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; text-align: right; font-weight: 600; font-size: 14px;'>$ {$subtotalItem}</td>
                </tr>";
        }
        $totalFormateado = number_format($total, 0, ',', '.');
        $fecha = date('d/m/Y H:i');

        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; background-color: #111827; margin: 0; padding: 0; color: #ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111827; padding: 40px 20px;">
            <tr><td>
              <table align="center" cellpadding="0" cellspacing="0" width="600" style="background-color: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <tr><td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">PLAXTILINEAS</h1>
                </td></tr>
                <tr><td style="padding: 40px 40px; color: #e2e8f0;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <span style="font-size: 48px;">🛒</span>
                    <h2 style="color: #ffffff; margin: 15px 0 5px 0; font-size: 22px;">¡Pedido Confirmado!</h2>
                    <p style="color: #94a3b8; margin: 0; font-size: 14px;">Tu pedido ha sido recibido exitosamente.</p>
                  </div>
                  <table cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 25px;">
                    <tr><td style="background-color: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 14px 30px; text-align: center;">
                      <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">N° de Pedido</span><br>
                      <span style="font-family: monospace; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.1em;">{$codigoPedido}</span>
                    </td></tr>
                  </table>
                  <p style="font-size: 15px; color: #cbd5e1;">Hola <strong>{$nombre}</strong>,</p>
                  <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">Gracias por tu compra. Aquí tienes el resumen de tu pedido realizado el <strong style="color: #cbd5e1;">{$fecha}</strong>:</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: rgba(255,255,255,0.05);">
                        <th style="padding: 12px 16px; text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Producto</th>
                        <th style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Cant.</th>
                        <th style="padding: 12px 16px; text-align: right; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Precio</th>
                        <th style="padding: 12px 16px; text-align: right; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>{$productRows}</tbody>
                    <tfoot>
                      <tr style="background-color: rgba(255,255,255,0.03);">
                        <td colspan="3" style="padding: 16px; text-align: right; color: #ffffff; font-weight: 700; font-size: 16px;">TOTAL</td>
                        <td style="padding: 16px; text-align: right; color: #10b981; font-weight: 700; font-size: 18px;">$ {$totalFormateado}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 25px;">Te notificaremos cuando tu pedido cambie de estado.</p>
                </td></tr>
                <tr><td style="background-color: #0f172a; padding: 25px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05);">
                  <p style="margin: 0 0 6px 0;">&copy; 2026 Plaxtilineas SAS. Todos los derechos reservados.</p>
                  <p style="margin: 0;">Cra. 19 #19-35, Armenia, Quindío | Tel: +57 (606) 7390968</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        HTML;
    }

    private static function templateEstadoPedido(
        string $nombre, string $codigoPedido,
        string $estadoAnterior, string $estadoNuevo
    ): string {
        $emoji = self::getEstadoEmoji($estadoNuevo);
        $label = self::getEstadoLabel($estadoNuevo);
        $labelAnterior = self::getEstadoLabel($estadoAnterior);
        $fecha = date('d/m/Y H:i');

        $mensajeEstado = match ($estadoNuevo) {
            'confirmado'     => 'Tu pedido ha sido confirmado y será procesado pronto.',
            'en_preparacion' => 'Estamos preparando tu pedido con mucho cuidado.',
            'en_camino'      => '¡Tu pedido va en camino! Pronto lo recibirás.',
            'entregado'      => '¡Tu pedido ha sido entregado! Esperamos que lo disfrutes.',
            'cancelado'      => 'Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.',
            default          => 'El estado de tu pedido ha sido actualizado.',
        };

        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; background-color: #111827; margin: 0; padding: 0; color: #ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111827; padding: 40px 20px;">
            <tr><td>
              <table align="center" cellpadding="0" cellspacing="0" width="600" style="background-color: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <tr><td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">PLAXTILINEAS</h1>
                </td></tr>
                <tr><td style="padding: 40px 40px; color: #e2e8f0;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <span style="font-size: 48px;">{$emoji}</span>
                    <h2 style="color: #ffffff; margin: 15px 0 5px 0; font-size: 22px;">Actualización de Pedido</h2>
                    <p style="color: #94a3b8; margin: 0; font-size: 14px;">Pedido <strong style="color: #e2e8f0;">{$codigoPedido}</strong></p>
                  </div>
                  <p style="font-size: 15px; color: #cbd5e1;">Hola <strong>{$nombre}</strong>,</p>
                  <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">{$mensajeEstado}</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px; text-align: center; width: 45%; background: rgba(255,255,255,0.03);">
                        <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Estado anterior</span><br>
                        <span style="color: #94a3b8; font-size: 15px; font-weight: 600; margin-top: 6px; display: inline-block;">{$labelAnterior}</span>
                      </td>
                      <td style="padding: 16px; text-align: center; width: 10%; color: #475569;">→</td>
                      <td style="padding: 16px; text-align: center; width: 45%; background: rgba(16,185,129,0.08);">
                        <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Nuevo estado</span><br>
                        <span style="color: #10b981; font-size: 15px; font-weight: 700; margin-top: 6px; display: inline-block;">{$label}</span>
                      </td>
                    </tr>
                  </table>
                  <p style="font-size: 12px; color: #475569; text-align: center;">Actualizado el {$fecha}</p>
                </td></tr>
                <tr><td style="background-color: #0f172a; padding: 25px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05);">
                  <p style="margin: 0 0 6px 0;">&copy; 2026 Plaxtilineas SAS. Todos los derechos reservados.</p>
                  <p style="margin: 0;">Cra. 19 #19-35, Armenia, Quindío | Tel: +57 (606) 7390968</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        HTML;
    }
    // ─── Email especial: Pago CONFIRMADO por Wompi ────────────────────────────────

    /**
     * Enviar email de pago confirmado (llamado SOLO por el webhook de Wompi)
     */
    public static function enviarPagoConfirmado(
        string $to,
        string $nombre,
        string $codigoPedido,
        array  $detalles,
        float  $subtotal,
        float  $iva,
        float  $costoEnvio,
        float  $total
    ): array {
        $subject = "[" . COMPANY_NAME . "] ¡Pago Confirmado! - {$codigoPedido}";
        $html    = self::templatePagoConfirmado($nombre, $codigoPedido, $detalles, $subtotal, $iva, $costoEnvio, $total);
        return self::send($to, $subject, $html);
    }

    private static function templatePagoConfirmado(
        string $nombre,
        string $codigoPedido,
        array  $detalles,
        float  $subtotal,
        float  $iva,
        float  $costoEnvio,
        float  $total
    ): string {
        $productRows = '';
        foreach ($detalles as $d) {
            $sub      = number_format($d['precio_unitario'] * $d['cantidad'], 0, ',', '.');
            $precUnit = number_format($d['precio_unitario'], 0, ',', '.');
            $productRows .= "
                <tr>
                    <td style='padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#e2e8f0;font-size:14px;'>{$d['nombre_producto']}</td>
                    <td style='padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#cbd5e1;text-align:center;font-size:14px;'>{$d['cantidad']}</td>
                    <td style='padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#cbd5e1;text-align:right;font-size:14px;'>$ {$precUnit}</td>
                    <td style='padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#ffffff;text-align:right;font-weight:600;font-size:14px;'>$ {$sub}</td>
                </tr>";
        }
        $fSubtotal  = number_format($subtotal, 0, ',', '.');
        $fIva       = number_format($iva,      0, ',', '.');
        $fEnvio     = number_format($costoEnvio, 0, ',', '.');
        $fTotal     = number_format($total,    0, ',', '.');
        $fecha      = date('d/m/Y H:i');

        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;background-color:#111827;margin:0;padding:0;color:#ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;padding:40px 20px;">
            <tr><td>
              <table align="center" cellpadding="0" cellspacing="0" width="600" style="background-color:#1e293b;border-radius:12px;border:1px solid rgba(255,255,255,0.05);overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);">
                <tr><td style="padding:30px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">PLAXTILINEAS</h1>
                </td></tr>
                <tr><td style="padding:40px 40px;color:#e2e8f0;">
                  <div style="text-align:center;margin-bottom:30px;">
                    <span style="font-size:56px;">✅</span>
                    <h2 style="color:#10b981;margin:15px 0 5px 0;font-size:24px;">¡Pago Confirmado!</h2>
                    <p style="color:#94a3b8;margin:0;font-size:14px;">Tu pago fue procesado exitosamente por Wompi.</p>
                  </div>
                  <table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:25px;">
                    <tr><td style="background-color:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:14px 30px;text-align:center;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">N° de Pedido</span><br>
                      <span style="font-family:monospace;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.1em;">{$codigoPedido}</span>
                    </td></tr>
                  </table>
                  <p style="font-size:15px;color:#cbd5e1;">Hola <strong>{$nombre}</strong>,</p>
                  <p style="font-size:14px;color:#94a3b8;line-height:1.6;">Tu pago fue confirmado el <strong style="color:#cbd5e1;">{$fecha}</strong>. Pronto prepararemos tu pedido.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
                    <thead>
                      <tr style="background-color:rgba(255,255,255,0.05);">
                        <th style="padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;">Producto</th>
                        <th style="padding:12px 16px;text-align:center;color:#94a3b8;font-size:12px;">Cant.</th>
                        <th style="padding:12px 16px;text-align:right;color:#94a3b8;font-size:12px;">Precio</th>
                        <th style="padding:12px 16px;text-align:right;color:#94a3b8;font-size:12px;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>{$productRows}</tbody>
                    <tfoot>
                      <tr><td colspan="3" style="padding:10px 16px;text-align:right;color:#94a3b8;font-size:13px;">Subtotal</td><td style="padding:10px 16px;text-align:right;color:#cbd5e1;">$ {$fSubtotal}</td></tr>
                      <tr><td colspan="3" style="padding:10px 16px;text-align:right;color:#94a3b8;font-size:13px;">IVA (19%)</td><td style="padding:10px 16px;text-align:right;color:#cbd5e1;">$ {$fIva}</td></tr>
                      <tr><td colspan="3" style="padding:10px 16px;text-align:right;color:#94a3b8;font-size:13px;">Envío</td><td style="padding:10px 16px;text-align:right;color:#cbd5e1;">$ {$fEnvio}</td></tr>
                      <tr style="background-color:rgba(255,255,255,0.03);"><td colspan="3" style="padding:16px;text-align:right;color:#ffffff;font-weight:700;font-size:16px;">TOTAL</td><td style="padding:16px;text-align:right;color:#10b981;font-weight:700;font-size:18px;">$ {$fTotal}</td></tr>
                    </tfoot>
                  </table>
                  <p style="font-size:13px;color:#64748b;text-align:center;margin-top:25px;">Te notificaremos cuando tu pedido cambie de estado.</p>
                </td></tr>
                <tr><td style="background-color:#0f172a;padding:25px 40px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,0.05);">
                  <p style="margin:0 0 6px 0;">&copy; 2026 Plaxtilineas SAS. Todos los derechos reservados.</p>
                  <p style="margin:0;">Cra. 19 #19-35, Armenia, Quindío | Tel: +57 (606) 7390968</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        HTML;
    }
}
