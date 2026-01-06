// utils/email.service.js - VERSIÓN ACTUALIZADA PARA PLAXTILINEAS
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Configuración específica de Plaxtilineas
    this.config = {
      appName: process.env.APP_NAME || 'Sistema de PQRS',
      companyName: process.env.COMPANY_NAME || 'Plaxtilineas SAS',
      supportEmail: process.env.SUPPORT_EMAIL || 'plaxtilineas.sas@gmail.com',
      phone1: process.env.COMPANY_PHONE_1 || '+57 (606) 7390968',
      phone2: process.env.COMPANY_PHONE_2 || '+57 3006680125',
      address: process.env.COMPANY_ADDRESS || 'Cra. 19 #19-35, Armenia, Quindío',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    };
  }

  // Verificar conexión SMTP
  async verificarConexion() {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP configurado correctamente para Plaxtilineas');
      return true;
    } catch (error) {
      console.error('❌ Error SMTP:', error.message);
      return false;
    }
  }

  // Plantilla para creación de PQR - ESTILO PLAXTILINEAS
  generarTemplateCreacionPQR(pqrData) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de PQR - ${pqrData.numero_ticket} | Plaxtilineas</title>
    <style>
        /* Estilos específicos de Plaxtilineas */
        :root {
            --primary-color: #1a365d;
            --secondary-color: #2d3748;
            --accent-color: #3182ce;
            --success-color: #38a169;
            --warning-color: #d69e2e;
            --danger-color: #e53e3e;
            --light-bg: #f7fafc;
            --border-color: #e2e8f0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--secondary-color);
            background-color: var(--light-bg);
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        
        .ticket-box {
            background-color: #ffffff;
            border: 2px solid var(--accent-color);
            border-radius: 8px;
            padding: 25px;
            margin: 30px;
            text-align: center;
        }
        
        .ticket-number {
            font-size: 28px;
            font-weight: bold;
            color: var(--primary-color);
            letter-spacing: 2px;
            margin: 15px 0;
            padding: 10px;
            background-color: #ebf8ff;
            border-radius: 5px;
            border: 1px dashed var(--accent-color);
        }
        
        .status-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin: 10px 0;
            background-color: #fefcbf;
            color: #744210;
            border: 1px solid #f6e05e;
        }
        
        .info-section {
            padding: 0 30px 20px;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .info-label {
            font-weight: 600;
            color: var(--primary-color);
            min-width: 160px;
            flex-shrink: 0;
        }
        
        .info-value {
            color: var(--secondary-color);
        }
        
        .steps-container {
            background-color: #f0fff4;
            border: 1px solid #c6f6d5;
            border-radius: 8px;
            padding: 20px;
            margin: 30px;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .step-number {
            background-color: var(--success-color);
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 15px;
            flex-shrink: 0;
        }
        
        .step-content {
            flex: 1;
        }
        
        .action-button {
            display: inline-block;
            background-color: var(--accent-color);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        
        .action-button:hover {
            background-color: var(--primary-color);
        }
        
        .contact-info {
            background-color: var(--primary-color);
            color: white;
            padding: 25px 30px;
            margin-top: 30px;
        }
        
        .contact-info h3 {
            margin-top: 0;
            color: white;
        }
        
        .contact-item {
            margin-bottom: 8px;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #718096;
            font-size: 12px;
            background-color: #f7fafc;
            border-top: 1px solid var(--border-color);
        }
        
        .company-highlight {
            font-weight: bold;
            color: var(--primary-color);
        }
        
        @media (max-width: 480px) {
            .container {
                border-radius: 0;
            }
            
            .info-row {
                flex-direction: column;
            }
            
            .info-label {
                margin-bottom: 5px;
            }
            
            .ticket-number {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PLAXTILINEAS</div>
            <h1>PQR Registrada Exitosamente</h1>
            <p>Hemos recibido su ${pqrData.tipo.toLowerCase()}</p>
        </div>
        
        <div class="ticket-box">
            <h2 style="margin-top: 0; color: var(--primary-color);">Número de Ticket</h2>
            <div class="ticket-number">${pqrData.numero_ticket}</div>
            <p style="color: #4a5568; margin-bottom: 10px;">
                <strong>¡Conserve este número!</strong> Es su identificador único para consultar el estado de su PQR
            </p>
            <div class="status-badge">Estado: ${pqrData.estado}</div>
        </div>
        
        <div class="info-section">
            <h2 style="color: var(--primary-color); margin-top: 0;">Detalles de su PQR</h2>
            
            <div class="info-row">
                <div class="info-label">Tipo de PQR:</div>
                <div class="info-value" style="text-transform: capitalize;">
                    <strong>${pqrData.tipo.toLowerCase()}</strong>
                </div>
            </div>
            
            <div class="info-row">
                <div class="info-label">Solicitante:</div>
                <div class="info-value">${pqrData.nombre_completo}</div>
            </div>
            
            <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${pqrData.email}</div>
            </div>
            
            <div class="info-row">
                <div class="info-label">Teléfono:</div>
                <div class="info-value">${pqrData.telefono}</div>
            </div>
            
            ${pqrData.producto_relacionado ? `
            <div class="info-row">
                <div class="info-label">Producto relacionado:</div>
                <div class="info-value">${pqrData.producto_relacionado}</div>
            </div>
            ` : ''}
            
            <div class="info-row">
                <div class="info-label">Fecha de creación:</div>
                <div class="info-value">${pqrData.fecha_creacion}</div>
            </div>
        </div>
        
        <div class="steps-container">
            <h3 style="color: var(--success-color); margin-top: 0;">📋 Proceso de atención</h3>
            
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <strong>Recepción y registro</strong>
                    <p>Su ${pqrData.tipo.toLowerCase()} ha sido registrada en nuestro sistema y asignada al área correspondiente.</p>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <strong>Revisión y análisis</strong>
                    <p>Nuestro equipo especializado analizará su caso para brindarle la mejor solución.</p>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <strong>Seguimiento y respuesta</strong>
                    <p>Recibirá actualizaciones por correo electrónico. Nuestro tiempo máximo de respuesta es de <strong>48 horas hábiles</strong>.</p>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; padding: 20px 30px;">
            <h3 style="color: var(--primary-color);">🔍 Consultar estado</h3>
            <p>Puede consultar el estado de su PQR en cualquier momento usando su número de ticket:</p>
            <a href="${this.config.frontendUrl}/consulta-pqr/${pqrData.numero_ticket}" class="action-button">
                📋 Consultar PQR
            </a>
            <p style="margin-top: 15px; font-size: 14px; color: #718096;">
                O ingrese manualmente: <strong>${pqrData.numero_ticket}</strong>
            </p>
        </div>
        
        <div class="contact-info">
            <h3>📞 Contáctenos</h3>
            <div class="contact-item">
                <strong>Teléfono 1:</strong> ${this.config.phone1}
            </div>
            <div class="contact-item">
                <strong>Teléfono 2:</strong> ${this.config.phone2}
            </div>
            <div class="contact-item">
                <strong>Email:</strong> ${this.config.supportEmail}
            </div>
            <div class="contact-item">
                <strong>Dirección:</strong> ${this.config.address}
            </div>
            <div style="margin-top: 15px; font-size: 14px;">
                Horario de atención: Lunes a Viernes 8:00 AM - 6:00 PM
            </div>
        </div>
        
        <div class="footer">
            <p style="margin-bottom: 5px;">
                <span class="company-highlight">${this.config.companyName}</span> - Especialistas en telecomunicaciones
            </p>
            <p style="margin: 5px 0;">
                Este es un correo automático generado por nuestro sistema de PQRS.<br>
                <strong>Por favor no responda a este mensaje.</strong>
            </p>
            <p style="margin: 10px 0 5px; font-size: 11px; color: #a0aec0;">
                Si no reconoce esta actividad, por favor ignore este mensaje.<br>
                ${new Date().getFullYear()} © ${this.config.companyName}. Todos los derechos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Plantilla para respuesta a PQR - ESTILO PLAXTILINEAS
  generarTemplateRespuestaPQR(pqrData, respuestaData) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actualización PQR ${pqrData.numero_ticket} | Plaxtilineas</title>
    <style>
        /* Estilos específicos de Plaxtilineas */
        :root {
            --primary-color: #1a365d;
            --secondary-color: #2d3748;
            --accent-color: #3182ce;
            --success-color: #38a169;
            --warning-color: #d69e2e;
            --info-color: #4299e1;
            --light-bg: #f7fafc;
            --border-color: #e2e8f0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--secondary-color);
            background-color: var(--light-bg);
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            padding: 25px 20px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
        }
        
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        
        .logo {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        
        .ticket-header {
            background-color: #ebf8ff;
            padding: 15px 30px;
            border-bottom: 2px solid var(--accent-color);
        }
        
        .ticket-number {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary-color);
            margin: 0;
        }
        
        .status-container {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 20px 30px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .status-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .status-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-bottom: 8px;
        }
        
        .status-old { background-color: #e2e8f0; color: #4a5568; }
        .status-new { 
            background-color: var(--info-color); 
            color: white;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(66, 153, 225, 0); }
            100% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0); }
        }
        
        .status-label {
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .arrow {
            font-size: 24px;
            color: var(--accent-color);
        }
        
        .response-container {
            padding: 25px 30px;
        }
        
        .response-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--success-color);
        }
        
        .response-icon {
            background-color: var(--success-color);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-right: 15px;
        }
        
        .response-message {
            background-color: #f0fff4;
            border: 1px solid #c6f6d5;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .message-content {
            white-space: pre-line;
            line-height: 1.8;
            color: #2d3748;
        }
        
        .attachment-box {
            background-color: #e6fffa;
            border: 1px solid #81e6d9;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
            display: flex;
            align-items: center;
        }
        
        .attachment-icon {
            font-size: 24px;
            margin-right: 15px;
            color: #319795;
        }
        
        .action-section {
            text-align: center;
            padding: 20px 30px;
            background-color: #f7fafc;
            border-top: 1px solid var(--border-color);
        }
        
        .action-button {
            display: inline-block;
            background-color: var(--accent-color);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 10px 0;
            transition: background-color 0.3s;
        }
        
        .action-button:hover {
            background-color: var(--primary-color);
        }
        
        .contact-info {
            background-color: var(--primary-color);
            color: white;
            padding: 20px 30px;
        }
        
        .contact-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        
        .contact-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        
        .contact-icon {
            margin-right: 10px;
            font-size: 16px;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #718096;
            font-size: 12px;
            background-color: #f7fafc;
            border-top: 1px solid var(--border-color);
        }
        
        .admin-note {
            background-color: #fffaf0;
            border: 1px solid #feebc8;
            border-radius: 6px;
            padding: 12px 15px;
            margin-top: 15px;
            font-size: 13px;
            color: #744210;
        }
        
        @media (max-width: 480px) {
            .container {
                border-radius: 0;
            }
            
            .contact-grid {
                grid-template-columns: 1fr;
            }
            
            .status-container {
                flex-direction: column;
                gap: 10px;
            }
            
            .arrow {
                transform: rotate(90deg);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PLAXTILINEAS</div>
            <h1>Actualización de su PQR</h1>
            <p>Nuevo mensaje del equipo de atención</p>
        </div>
        
        <div class="ticket-header">
            <p class="ticket-number">${pqrData.numero_ticket}</p>
            <p style="color: #4a5568; margin: 5px 0 0;">
                Tipo: ${pqrData.tipo.toLowerCase()} | Solicitante: ${pqrData.nombre_completo}
            </p>
        </div>
        
        <div class="status-container">
            <div class="status-indicator">
                <div class="status-circle status-old">📝</div>
                <div class="status-label">Estado anterior</div>
                <div style="margin-top: 5px; font-weight: 600;">${respuestaData.estado_anterior || 'PENDIENTE'}</div>
            </div>
            
            <div class="arrow">→</div>
            
            <div class="status-indicator">
                <div class="status-circle status-new">✅</div>
                <div class="status-label">Nuevo estado</div>
                <div style="margin-top: 5px; font-weight: 600; color: var(--info-color);">
                    ${pqrData.estado.replace('_', ' ')}
                </div>
            </div>
        </div>
        
        <div class="response-container">
            <div class="response-header">
                <div class="response-icon">💬</div>
                <div>
                    <h2 style="margin: 0; color: var(--primary-color);">Respuesta del equipo</h2>
                    <p style="margin: 5px 0 0; color: #718096;">
                        ${respuestaData.fecha || new Date().toLocaleDateString('es-CO')}
                    </p>
                </div>
            </div>
            
            <div class="response-message">
                <div class="message-content">
                    ${respuestaData.mensaje}
                </div>
                
                ${respuestaData.responsable ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #c6f6d5;">
                    <strong>Atentamente,</strong><br>
                    <span style="color: var(--success-color);">${respuestaData.responsable}</span><br>
                    <em style="color: #718096; font-size: 14px;">
                        ${respuestaData.tipo === 'ADMINISTRACION' ? 'Equipo de atención al cliente' : 'Cliente'}
                    </em>
                </div>
                ` : ''}
            </div>
            
            ${respuestaData.archivo_adjunto ? `
            <div class="attachment-box">
                <div class="attachment-icon">📎</div>
                <div>
                    <strong>Archivo adjunto</strong>
                    <p style="margin: 5px 0 0; color: #2d3748;">
                        Se ha adjuntado un documento a esta respuesta.
                        ${respuestaData.archivo_adjunto.nombre ? `(${respuestaData.archivo_adjunto.nombre})` : ''}
                    </p>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="action-section">
            <h3 style="color: var(--primary-color); margin-top: 0;">¿Necesita más información?</h3>
            <p>Puede consultar toda la información de su PQR o agregar más detalles:</p>
            
            <a href="${this.config.frontendUrl}/consulta-pqr/${pqrData.numero_ticket}" class="action-button">
                👁️ Ver PQR completa
            </a>
            
            <p style="margin-top: 15px; font-size: 14px; color: #718096;">
                O responda directamente a este correo para continuar la conversación.
            </p>
        </div>
        
        ${respuestaData.tipo === 'ADMINISTRACION' ? `
        <div class="admin-note">
            <strong>📋 Información adicional:</strong>
            <p style="margin: 8px 0 0;">
                Esta respuesta ha sido registrada por nuestro equipo de atención. 
                Si necesita aclaraciones adicionales, no dude en contactarnos.
            </p>
        </div>
        ` : ''}
        
        <div class="contact-info">
            <h3 style="color: white; margin-top: 0;">📞 Contacto Plaxtilineas</h3>
            <div class="contact-grid">
                <div class="contact-item">
                    <div class="contact-icon">📱</div>
                    <div>
                        <div><strong>Teléfono 1</strong></div>
                        <div>${this.config.phone1}</div>
                    </div>
                </div>
                
                <div class="contact-item">
                    <div class="contact-icon">📱</div>
                    <div>
                        <div><strong>Teléfono 2</strong></div>
                        <div>${this.config.phone2}</div>
                    </div>
                </div>
                
                <div class="contact-item">
                    <div class="contact-icon">✉️</div>
                    <div>
                        <div><strong>Email</strong></div>
                        <div>${this.config.supportEmail}</div>
                    </div>
                </div>
                
                <div class="contact-item">
                    <div class="contact-icon">📍</div>
                    <div>
                        <div><strong>Dirección</strong></div>
                        <div>${this.config.address}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p style="margin-bottom: 5px;">
                <strong>${this.config.companyName}</strong> - Especialistas en telecomunicaciones
            </p>
            <p style="margin: 5px 0; font-size: 11px; color: #a0aec0;">
                Este es un correo automático del sistema de PQRS.<br>
                <strong>Para consultas adicionales responda a: ${this.config.supportEmail}</strong>
            </p>
            <p style="margin: 10px 0 5px; font-size: 11px; color: #a0aec0;">
                ${new Date().getFullYear()} © ${this.config.companyName}. Todos los derechos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Enviar email de confirmación de creación de PQR
  async enviarConfirmacionCreacionPQR(pqrData) {
    const html = this.generarTemplateCreacionPQR(pqrData);
    
    const mailOptions = {
      from: {
        name: this.config.emailFromName || 'Plaxtilineas SAS',
        address: process.env.SMTP_USER
      },
      to: pqrData.email,
      cc: this.config.supportEmail, // Copia al equipo de soporte
      subject: `✅ PQR ${pqrData.numero_ticket} registrada | Plaxtilineas`,
      html: html,
      text: this.convertirHTMLaTexto(html),
      headers: {
        'X-Company': 'Plaxtilineas SAS',
        'X-PQR-Ticket': pqrData.numero_ticket
      }
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email enviado a ${pqrData.email} - Ticket: ${pqrData.numero_ticket}`);
      return { 
        success: true, 
        messageId: info.messageId,
        ticket: pqrData.numero_ticket 
      };
    } catch (error) {
      console.error(`❌ Error enviando email a ${pqrData.email}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        ticket: pqrData.numero_ticket 
      };
    }
  }

  // Enviar email de respuesta a PQR
  async enviarNotificacionRespuestaPQR(pqrData, respuestaData) {
    const html = this.generarTemplateRespuestaPQR(pqrData, respuestaData);
    
    const mailOptions = {
      from: {
        name: this.config.emailFromName || 'Plaxtilineas SAS',
        address: process.env.SMTP_USER
      },
      to: pqrData.email,
      cc: this.config.supportEmail,
      subject: `💬 Actualización PQR ${pqrData.numero_ticket} - ${pqrData.estado.replace('_', ' ')} | Plaxtilineas`,
      html: html,
      text: this.convertirHTMLaTexto(html),
      replyTo: this.config.supportEmail,
      headers: {
        'X-Company': 'Plaxtilineas SAS',
        'X-PQR-Ticket': pqrData.numero_ticket,
        'X-Update-Type': respuestaData.tipo
      }
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Notificación enviada a ${pqrData.email} - Ticket: ${pqrData.numero_ticket}`);
      return { 
        success: true, 
        messageId: info.messageId,
        ticket: pqrData.numero_ticket,
        updateType: respuestaData.tipo
      };
    } catch (error) {
      console.error(`❌ Error enviando notificación a ${pqrData.email}:`, error.message);
      return { 
        success: false, 
        error: error.message,
        ticket: pqrData.numero_ticket
      };
    }
  }

  // Convertir HTML a texto plano (fallback)
  convertirHTMLaTexto(html) {
    let text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    return `PLAXTILINEAS - Sistema de PQRS\n\n${text}`;
  }
}

module.exports = new EmailService();