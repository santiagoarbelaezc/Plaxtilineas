import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WompiService } from '../../services/wompi.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { PedidoService } from '../../services/pedido.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import { WompiDatosPago } from '../../models/pedido.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  styleUrls: ['./pago.component.css'],
  template: `
    <div class="pago-wrapper">

      <!-- MODAL: Verificación Antirobot (Accesible para Adultos Mayores) -->
      <div *ngIf="modalAntirobot()" class="modal-overlay" (click)="closeModal('antirobot')">
        <div class="modal-card antirobot-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-accent"></div>
          <button class="modal-close" (click)="closeModal('antirobot')" aria-label="Cerrar">✕</button>
          
          <div class="modal-icon-badge antirobot-badge">
            <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          
          <div class="kicker"><span class="kicker-line"></span><span>COMPRA PROTEGIDA</span></div>
          <h2 class="modal-title">Confirmación de Seguridad</h2>
          
          <div class="modal-body">
            <p class="antirobot-modal-desc">
              Para garantizar tu tranquilidad y proteger tu compra con total seguridad, por favor pulsa la casilla a continuación:
            </p>

            <!-- Campo trampa invisible para bots -->
            <input type="text" name="hp_token" [(ngModel)]="honeypotValue" style="display:none !important;" tabindex="-1" autocomplete="off">

            <!-- Casilla Senior-Friendly Interactiva -->
            <button type="button" 
                    class="antirobot-modal-box" 
                    [class.verified]="isHumanVerified()" 
                    (click)="verificarHumanoYProcesar()"
                    id="btn-verificar-humano">
              <div class="antirobot-modal-check" [class.checked]="isHumanVerified()">
                <svg *ngIf="isHumanVerified()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div class="antirobot-modal-info">
                <span class="antirobot-modal-primary">
                  {{ isHumanVerified() ? '✓ Confirmado: Eres una persona real' : 'Soy una persona real' }}
                </span>
                <span class="antirobot-modal-secondary">
                  {{ isHumanVerified() ? 'Verificación exitosa. Iniciando proceso de pago...' : 'Toca aquí para validar tu compra con un solo clic' }}
                </span>
              </div>
              <div class="antirobot-modal-shield">
                <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
            </button>

            <!-- Acciones del Modal -->
            <div class="antirobot-modal-actions">
              <button 
                type="button" 
                class="btn-antirobot-confirm"
                [disabled]="!isHumanVerified() || procesando()"
                (click)="confirmarDesdeModal()"
                id="btn-confirmar-modal">
                @if (procesando()) {
                  <span class="btn-spinner"></span>
                  <span>Conectando con la pasarela...</span>
                } @else {
                  <span>Continuar con el Pago Seguro</span>
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                }
              </button>
              <button type="button" class="btn-antirobot-cancel" (click)="closeModal('antirobot')">
                Volver a revisar mi pedido
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- MODAL: ¿Qué es Wompi? -->
      <div *ngIf="modalWompi()" class="modal-overlay" (click)="closeModal('wompi')">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-accent"></div>
          <button class="modal-close" (click)="closeModal('wompi')" aria-label="Cerrar">✕</button>
          <div class="modal-icon-badge">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
          </div>
          <div class="kicker"><span class="kicker-line"></span><span>PASARELA DE PAGOS</span></div>
          <h2 class="modal-title">¿Qué es Wompi?</h2>
          <div class="modal-body">
            <p><strong>Wompi</strong> es la pasarela de pagos oficial de <strong>Bancolombia</strong>, líder en Colombia con más de 10 millones de transacciones procesadas. Tus datos bancarios nunca llegan a nuestros servidores.</p>
            <div class="cert-grid">
              <div class="cert-item"><span class="cert-dot"></span>Certificada por Bancolombia</div>
              <div class="cert-item"><span class="cert-dot"></span>Encriptación SSL 256-bit</div>
              <div class="cert-item"><span class="cert-dot"></span>PCI DSS Nivel 1</div>
              <div class="cert-item"><span class="cert-dot"></span>Protección antifraude</div>
            </div>
            <p class="modal-note">Aceptamos: Tarjetas Visa, Mastercard, American Express, PSE, Nequi, Daviplata y más.</p>
          </div>
        </div>
      </div>

      <!-- MODAL: Política de Devoluciones -->
      <div *ngIf="modalDevol()" class="modal-overlay" (click)="closeModal('devol')">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-accent"></div>
          <button class="modal-close" (click)="closeModal('devol')" aria-label="Cerrar">✕</button>
          <div class="modal-icon-badge">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </div>
          <div class="kicker"><span class="kicker-line"></span><span>GARANTÍA PLAXTILINEAS</span></div>
          <h2 class="modal-title">Política de Devoluciones</h2>
          <div class="modal-body">
            <p><strong>Plaxtilineas SAS</strong> garantiza la calidad de todos sus productos. En caso de inconvenientes:</p>
            <ul class="modal-list">
              <li><strong>Producto defectuoso:</strong> Devolución o cambio sin costo dentro de los 5 días hábiles siguientes a la entrega.</li>
              <li><strong>Error en el pedido:</strong> Cambio garantizado dentro de los 3 días hábiles si el error es nuestro.</li>
              <li><strong>Desistimiento:</strong> El cliente puede cancelar dentro de los 5 días hábiles antes del despacho sin penalización.</li>
              <li><strong>Reembolso:</strong> Se procesa dentro de 5–10 días hábiles al método de pago original.</li>
            </ul>
            <p class="modal-note">Para iniciar una devolución: plaxtilineas.sas&#64;gmail.com o WhatsApp +57 300 668 0125</p>
          </div>
        </div>
      </div>

      <!-- MODAL: Términos de la Transacción -->
      <div *ngIf="modalTerminos()" class="modal-overlay" (click)="closeModal('terminos')">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-accent"></div>
          <button class="modal-close" (click)="closeModal('terminos')" aria-label="Cerrar">✕</button>
          <div class="modal-icon-badge">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="kicker"><span class="kicker-line"></span><span>CONDICIONES</span></div>
          <h2 class="modal-title">Términos de la Transacción</h2>
          <div class="modal-body">
            <ul class="modal-list">
              <li>Al confirmar el pago, aceptas los <a routerLink="/terminos" class="modal-link">Términos y Condiciones</a> de Plaxtilineas SAS.</li>
              <li>Los precios incluyen IVA según corresponda a la categoría del producto.</li>
              <li>El despacho se realiza dentro de 1–3 días hábiles tras la confirmación del pago.</li>
              <li>El costo de envío es de $10.000 COP para despachos dentro de Armenia, Quindío.</li>
              <li>Para despachos fuera del Quindío, el costo se coordinará directamente con el cliente.</li>
              <li>Plaxtilineas SAS se reserva el derecho de cancelar pedidos por razones de stock o fuerza mayor.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- MODAL: Política de Datos -->
      <div *ngIf="modalDatos()" class="modal-overlay" (click)="closeModal('datos')">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-accent"></div>
          <button class="modal-close" (click)="closeModal('datos')" aria-label="Cerrar">✕</button>
          <div class="modal-icon-badge">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div class="kicker"><span class="kicker-line"></span><span>PRIVACIDAD</span></div>
          <h2 class="modal-title">Política de Datos</h2>
          <div class="modal-body">
            <p>Plaxtilineas SAS trata tus datos personales de acuerdo con la <strong>Ley 1581 de 2012</strong> (Habeas Data) de Colombia.</p>
            <ul class="modal-list">
              <li><strong>Datos recopilados:</strong> Nombre, correo, teléfono y dirección de envío.</li>
              <li><strong>Finalidad:</strong> Procesamiento del pedido, confirmación de pago y seguimiento del envío.</li>
              <li><strong>No compartimos</strong> tus datos con terceros, salvo con Wompi (Bancolombia) para el procesamiento del pago.</li>
              <li><strong>Tus datos financieros</strong> son procesados directamente por Wompi. Plaxtilineas nunca almacena información de tarjetas.</li>
              <li>Puedes solicitar rectificación, eliminación o consulta de tus datos a plaxtilineas.sas&#64;gmail.com</li>
            </ul>
            <p class="modal-note">Ver política completa: <a routerLink="/privacidad" class="modal-link">Política de Privacidad</a></p>
          </div>
        </div>
      </div>

      <!-- CONTENIDO PRINCIPAL -->
      @if (cargando()) {
        <div class="loading-state">
          <img src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png" alt="Plaxtilineas" class="loading-logo">
          <div class="spinner-ring"></div>
          <p class="loading-text">Preparando tu pago seguro...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <div class="error-card-dark">
            <div class="error-icon">
              <svg width="34" height="34" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 class="error-title">Error al cargar el pago</h2>
            <p class="error-desc">{{ error() }}</p>
            <a routerLink="/carrito" class="btn-back-cart">Volver al carrito</a>
          </div>
        </div>
      } @else {
        <div class="pago-grid">
 
          <!-- COLUMNA IZQUIERDA (FIJA SIN SCROLL): Marca Plaxtilineas + Resumen Minimalista -->
          <aside class="resumen-col">
            <img
              src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1795130400/logo-solo_r6tfo7.png"
              alt=""
              aria-hidden="true"
              class="pago-isotipo-watermark" />

            <!-- Top Row Marca + Volver al carrito -->
            <div class="resumen-top-row">
              <a routerLink="/" class="pago-brand-logo-link" aria-label="Plaxtilineas Inicio">
                <img
                  src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1770388940/logo-invert_ghucfi.png"
                  alt="Plaxtilineas"
                  class="pago-brand-logo-img" />
              </a>
              <a routerLink="/carrito" class="back-btn">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                <span class="back-label">Carrito</span>
              </a>
            </div>

            <!-- Total Principal Estilo Minimalista -->
            <div class="resumen-hero-total">
              <span class="resumen-eyebrow">Resumen de tu pedido</span>
              <div class="resumen-grand-total">{{ formatPrice(totalConEnvio()) }}</div>
              <div class="resumen-hero-meta">
                <span>{{ itemsCarrito().length }} {{ itemsCarrito().length === 1 ? 'producto' : 'productos' }}</span>
                <span class="meta-dot">·</span>
                <span>IVA incluido</span>
                <span class="meta-dot">·</span>
                <span>Envío en Armenia</span>
              </div>
            </div>

            <!-- Lista de Productos Minimalista (solo scroll interno si hay muchos) -->
            <div class="items-list-minimal">
              @for (item of itemsCarrito(); track item.id) {
                <div class="item-row-minimal">
                  <div class="item-img-compact">
                    @if (item.producto.imagen_url) {
                      <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" loading="lazy">
                    } @else {
                      <div class="item-img-placeholder">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      </div>
                    }
                    <span class="item-qty-compact">{{ item.cantidad }}</span>
                  </div>
                  <div class="item-info-compact">
                    <p class="item-name-compact" [title]="item.producto.nombre">{{ item.producto.nombre }}</p>
                    <p class="item-variant-compact">{{ item.variante?.nombre || item.producto.subcategoria || 'Referencia estándar' }}</p>
                  </div>
                  <div class="item-price-compact">{{ formatPrice(item.precioUnitario * item.cantidad) }}</div>
                </div>
              }
            </div>

            <!-- Desglose + Pie Minimalista -->
            <div class="resumen-footer-block">
              <div class="totales-minimal">
                <div class="total-row-compact">
                  <span>Subtotal</span>
                  <span>{{ formatPrice(totalPrice()) }}</span>
                </div>
                <div class="total-row-compact">
                  <span>Envío (Armenia)</span>
                  <span class="text-free-or-price">{{ formatPrice(10000) }}</span>
                </div>
                <div class="total-row-final">
                  <span>Total COP</span>
                  <strong>{{ formatPrice(totalConEnvio()) }}</strong>
                </div>
              </div>

              <div class="resumen-location-foot">
                <span class="location-dot"></span>
                <span>Armenia &bull; Eje Cafetero &bull; Compra 100% protegida</span>
              </div>
            </div>
          </aside>

          <!-- COLUMNA DERECHA (NEGRO MINIMALISTA): Entrega + Método de Pago + Acción -->
          <main class="pago-col">
            <div class="pago-flow-container">

              <!-- Encabezado Minimalista -->
              <div class="pago-flow-header">
                <div class="pago-flow-top-bar">
                  <button type="button" class="btn-volver-izq" (click)="volverAtras()">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    <span>Volver</span>
                  </button>
                  <div class="steps-inline">
                    <span class="step-chip done">✓ Carrito</span>
                    <span class="step-arrow">›</span>
                    <span class="step-chip active">2. Entrega y Pago</span>
                  </div>
                </div>
                <h1 class="pago-title-compact">Finalizar compra</h1>
              </div>

              <!-- BLOQUE 1: Dirección de Entrega (Compacta y editable inline) -->
              <section class="checkout-section">
                <div class="checkout-section-top">
                  <span class="section-step-label">1. Dirección de entrega</span>
                  <button type="button" class="btn-link-edit" (click)="toggleEditEnvio()">
                    {{ editandoEnvio() ? 'Guardar' : 'Modificar' }}
                  </button>
                </div>

                @if (!editandoEnvio()) {
                  <div class="envio-strip">
                    <div class="envio-strip-icon">
                      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div class="envio-strip-text">
                      <p class="envio-dir-text">{{ datosEnvioForm.direccion || 'Sin dirección registrada' }}</p>
                      <p class="envio-meta-line">
                        {{ datosEnvioForm.ciudad || 'Armenia' }}, {{ datosEnvioForm.departamento || 'Quindío' }}
                        <span>·</span>
                        {{ datosEnvioForm.telefono || 'Sin teléfono' }}
                        <ng-container *ngIf="datosEnvioForm.notas">
                          <span>·</span> {{ datosEnvioForm.notas }}
                        </ng-container>
                      </p>
                    </div>
                  </div>
                } @else {
                  <div class="envio-form-compact">
                    <div class="input-compact-group">
                      <label>Dirección completa *</label>
                      <input type="text" [(ngModel)]="datosEnvioForm.direccion" placeholder="Ej: Cra. 19 #19-35, Apto 302" class="input-compact">
                    </div>
                    <div class="input-compact-row">
                      <div class="input-compact-group">
                        <label>Ciudad *</label>
                        <input type="text" [(ngModel)]="datosEnvioForm.ciudad" placeholder="Armenia" class="input-compact">
                      </div>
                      <div class="input-compact-group">
                        <label>Teléfono *</label>
                        <input type="tel" [(ngModel)]="datosEnvioForm.telefono" placeholder="300 123 4567" class="input-compact">
                      </div>
                    </div>
                    <div class="input-compact-group">
                      <label>Notas de entrega (opcional)</label>
                      <input type="text" [(ngModel)]="datosEnvioForm.notas" placeholder="Ej: Timbre 2B" class="input-compact">
                    </div>
                  </div>
                }
              </section>

              <!-- BLOQUE 2: Método de Pago -->
              <section class="checkout-section">
                <div class="checkout-section-top">
                  <span class="section-step-label">2. Método de pago</span>
                </div>

                <!-- SELECTOR DE MÉTODOS DE PAGO -->
                <div class="payment-methods-stack">
                
                <!-- 1. PAGA EN LÍNEA (WOMPI - GRANDE, DESTACADO Y PROMINENTE) -->
                <div class="method-card-wompi-prominent" 
                     [class.selected]="metodoSeleccionado() === 'wompi'" 
                     (click)="setMetodo('wompi')">
                  
                  <div class="wompi-selection-row">
                    <div class="method-radio-large">
                      <span class="radio-dot-large"></span>
                    </div>

                    <div class="wompi-title-block">
                      <div class="wompi-headline-line">
                        <strong class="wompi-main-name">Paga en línea</strong>
                        <span class="wompi-badge-pill">Recomendado</span>
                      </div>
                      <span class="wompi-description">Tarjeta Débito/Crédito, PSE, Nequi, Daviplata y Bancolombia</span>
                    </div>

                    <div class="wompi-brand-container">
                      <img src="https://res.cloudinary.com/doxdjiyvi/image/upload/v1792874810/Wompi_LogoPrincipal_par3tg.png" 
                           alt="Wompi Bancolombia" 
                           class="wompi-brand-logo-large">
                    </div>
                  </div>

                </div>

                <!-- 2. Hablar con un asesor -->
                <div class="method-card-secondary" 
                     [class.selected]="metodoSeleccionado() === 'asesor'" 
                     (click)="setMetodo('asesor')">
                  <div class="method-radio-small">
                    <span class="radio-dot-small"></span>
                  </div>
                  <div class="method-sec-info">
                    <strong class="method-sec-title">Hablar con un asesor</strong>
                    <span class="method-sec-sub">Te ayudamos a finalizar tu compra</span>
                  </div>
                  <span class="whatsapp-tag">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.179.182-.077.357.101.173.451.745.968 1.205.666.593 1.228.777 1.402.864.173.087.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/></svg>
                    WhatsApp
                  </span>
                </div>

              </div>

              <!-- Alerta de error si aplica -->
              @if (errorEnvio()) {
                <div class="form-alert-error-compact">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{{ errorEnvio() }}</span>
                </div>
              }

              <!-- BOTÓN PRINCIPAL DE PAGO / ACCIÓN (IMPRESIONANTE, GRANDE Y CONTEXTUAL) -->
              <button
                class="btn-wompi-prominent"
                (click)="clickBotonPagar()"
                [disabled]="procesando()"
                id="btn-pagar-principal">
                @if (procesando()) {
                  <span class="btn-spinner"></span>
                  <span>Procesando solicitud...</span>
                } @else {
                  <div class="wompi-btn-inner">
                    @if (metodoSeleccionado() === 'wompi') {
                      <div class="wompi-btn-logo-white-box">
                        <img src="https://res.cloudinary.com/doxdjiyvi/image/upload/v1792874810/Wompi_LogoPrincipal_par3tg.png" 
                             alt="Wompi" 
                             class="wompi-btn-img-large">
                      </div>
                    } @else if (metodoSeleccionado() === 'transferencia') {
                      <span class="wompi-icon-large">
                        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </span>
                    } @else {
                      <span class="wompi-icon-large">
                        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                      </span>
                    }

                    <div class="wompi-btn-labels">
                      <span class="wompi-btn-title">
                        {{ metodoSeleccionado() === 'wompi' ? 'Continuar al pago con Wompi' : (metodoSeleccionado() === 'transferencia' ? 'Confirmar Transferencia' : 'Finalizar con Asesor') }}
                      </span>
                      <span class="wompi-btn-amount">
                        Total: {{ formatPrice(totalConEnvio()) }} COP &bull; Toca aquí para continuar
                      </span>
                    </div>

                    <span class="wompi-btn-arrow-pill">
                      <span>Pagar ahora</span>
                      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                  </div>
                }
              </button>

              <!-- Footer integrado compacto (Seguridad + Logos + Legales) -->
              <div class="pago-card-footer-compact">
                <div class="trust-inline-row">
                  <span class="trust-badge-item">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    SSL 256-bit
                  </span>
                  <span class="trust-sep">·</span>
                  <span class="trust-badge-item">PCI DSS</span>
                  <span class="trust-sep">·</span>
                  <span class="trust-badge-item">Wompi by Bancolombia</span>
                  <span class="trust-sep">·</span>
                  <button type="button" class="trust-link-info" (click)="openModal('wompi')">¿Qué es Wompi?</button>
                </div>

                <div class="legal-inline-row">
                  <div class="chips-row-compact">
                    <span class="chip-sm">VISA</span>
                    <span class="chip-sm">MC</span>
                    <span class="chip-sm">PSE</span>
                    <span class="chip-sm">Nequi</span>
                    <span class="chip-sm">Daviplata</span>
                  </div>
                  <div class="links-row-compact">
                    <button class="legal-link-sm" (click)="openModal('devol')">Devoluciones</button>
                    <span class="legal-sep-sm">·</span>
                    <button class="legal-link-sm" (click)="openModal('terminos')">Términos</button>
                    <span class="legal-sep-sm">·</span>
                    <a routerLink="/privacidad" class="legal-link-sm">Privacidad</a>
                  </div>
                </div>
              </div>

              </section>
            </div>
          </main>
        </div>
      }
    </div>  `
})
export class PagoComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private location   = inject(Location);
  private wompiSvc   = inject(WompiService);
  private cartSvc    = inject(CartService);
  private authSvc    = inject(AuthService);
  private pedidoSvc  = inject(PedidoService);
  private configSvc  = inject(ConfiguracionService);

  cargando       = signal(false);
  error          = signal<string | null>(null);
  procesando     = signal(false);
  itemsCarrito   = signal<any[]>([]);
  wompiEnabled   = signal(true);

  // Método seleccionado (por defecto 'wompi')
  metodoSeleccionado = signal<'wompi' | 'transferencia' | 'asesor'>('wompi');

  // Datos de envío del pedido
  editandoEnvio = signal(false);
  private usuarioEditoEnvioManual = false;
  datosEnvioForm = {
    direccion: '',
    ciudad: 'Armenia',
    departamento: 'Quindío',
    telefono: '',
    notas: ''
  };

  // Verificación antirobot amigable para adultos mayores
  isHumanVerified = signal(false);
  honeypotValue = '';
  errorEnvio = signal<string | null>(null);

  // Modales
  modalAntirobot = signal(false);
  modalWompi    = signal(false);
  modalDevol    = signal(false);
  modalTerminos = signal(false);
  modalDatos    = signal(false);

  ngOnInit(): void {
    // 1. Verificar autenticación
    if (!this.authSvc.isLoggedIn.getValue()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/pago' } });
      return;
    }

    // 2. Suscripción al carrito
    this.cartSvc.items$.subscribe(items => {
      this.itemsCarrito.set(items);
      if ((!items || items.length === 0) && !this.procesando()) {
        this.router.navigate(['/carrito']);
      }
    });

    // 3. Suscripción a estado de Wompi
    this.configSvc.wompiEnabled$.subscribe(val => {
      this.wompiEnabled.set(val);
    });

    // 4. Cargar datos de envío precargados del usuario (reactivo a /auth/perfil)
    this.authSvc.currentUser.subscribe(user => {
      if (!user || this.usuarioEditoEnvioManual) return;

      let ciudad = user.ciudad ? String(user.ciudad).trim() : '';
      let depto = user.departamento ? String(user.departamento).trim() : '';
      if (ciudad.includes(',')) {
        const parts = ciudad.split(',');
        ciudad = parts[0].trim();
        depto = depto || parts[1].trim();
      }
      if (user.direccion) {
        this.datosEnvioForm.direccion = String(user.direccion).trim();
      }
      if (ciudad) {
        this.datosEnvioForm.ciudad = ciudad;
      }
      if (depto) {
        this.datosEnvioForm.departamento = depto;
      }
      if (user.telefono) {
        this.datosEnvioForm.telefono = String(user.telefono).trim();
      }

      // Mostrar siempre la vista resumida rápida si existen datos; solo abrir edición si faltan
      const tieneDatosBasicos = !!(this.datosEnvioForm.direccion && this.datosEnvioForm.telefono);
      this.editandoEnvio.set(!tieneDatosBasicos);
    });
  }

  totalPrice(): number {
    return this.itemsCarrito().reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  }

  totalConEnvio(): number {
    return this.totalPrice() + 10000;
  }

  formatPrice(precio: number): string {
    return `$ ${Math.round(precio).toLocaleString('es-ES')}`;
  }

  setMetodo(m: 'wompi' | 'transferencia' | 'asesor'): void {
    this.metodoSeleccionado.set(m);
    this.errorEnvio.set(null);
  }

  toggleEditEnvio(): void {
    this.usuarioEditoEnvioManual = true;
    this.editandoEnvio.update(v => !v);
  }

  volverAtras(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/carrito']);
    }
  }

  toggleHumanVerification(): void {
    this.isHumanVerified.update(v => !v);
    if (this.isHumanVerified()) {
      this.errorEnvio.set(null);
    }
  }

  openModal(modal: string): void {
    this.modalWompi.set(modal === 'wompi');
    this.modalDevol.set(modal === 'devol');
    this.modalTerminos.set(modal === 'terminos');
    this.modalDatos.set(modal === 'datos');
    this.modalAntirobot.set(modal === 'antirobot');
  }

  closeModal(modal?: string): void {
    this.modalWompi.set(false);
    this.modalDevol.set(false);
    this.modalTerminos.set(false);
    this.modalDatos.set(false);
    this.modalAntirobot.set(false);
  }

  clickBotonPagar(): void {
    if (this.procesando()) return;
    this.errorEnvio.set(null);

    // 1. Validar datos de envío
    if (!this.datosEnvioForm.direccion || !this.datosEnvioForm.direccion.trim()) {
      this.editandoEnvio.set(true);
      this.errorEnvio.set('Por favor ingresa la dirección de entrega.');
      Swal.fire({
        title: 'Dirección requerida',
        text: 'Por favor ingresa tu dirección de entrega para continuar.',
        icon: 'warning',
        confirmButtonColor: '#16a34a'
      });
      return;
    }
    if (!this.datosEnvioForm.telefono || !this.datosEnvioForm.telefono.trim()) {
      this.editandoEnvio.set(true);
      this.errorEnvio.set('Por favor ingresa un teléfono de contacto.');
      Swal.fire({
        title: 'Teléfono requerido',
        text: 'Por favor ingresa un teléfono de contacto para el despacho.',
        icon: 'warning',
        confirmButtonColor: '#16a34a'
      });
      return;
    }

    const items = this.itemsCarrito();
    if (!items || items.length === 0) {
      this.router.navigate(['/carrito']);
      return;
    }

    // 2. Si no ha confirmado ser persona real, abrir el modal de verificación antirobot
    if (!this.isHumanVerified()) {
      this.modalAntirobot.set(true);
      return;
    }

    // 3. Si ya está verificado, procesar orden directamente
    this.procesarOrden();
  }

  verificarHumanoYProcesar(): void {
    if (this.honeypotValue) {
      console.warn('Bot detectado');
      return;
    }
    this.isHumanVerified.set(true);
    this.errorEnvio.set(null);

    // Cierre suave y avance automático tras 450ms para máxima comodidad
    setTimeout(() => {
      this.closeModal('antirobot');
      this.procesarOrden();
    }, 450);
  }

  confirmarDesdeModal(): void {
    if (!this.isHumanVerified()) return;
    this.closeModal('antirobot');
    this.procesarOrden();
  }

  procesarOrden(): void {
    if (this.procesando()) return;
    this.errorEnvio.set(null);

    // 1. Honeypot check
    if (this.honeypotValue) {
      console.warn('Bot activó el honeypot');
      return;
    }

    // 2. Validación antirobot
    if (!this.isHumanVerified()) {
      this.modalAntirobot.set(true);
      return;
    }

    // 3. Validación de datos de envío
    if (!this.datosEnvioForm.direccion || !this.datosEnvioForm.direccion.trim()) {
      this.editandoEnvio.set(true);
      this.errorEnvio.set('Por favor ingresa la dirección de entrega.');
      return;
    }
    if (!this.datosEnvioForm.telefono || !this.datosEnvioForm.telefono.trim()) {
      this.editandoEnvio.set(true);
      this.errorEnvio.set('Por favor ingresa un teléfono de contacto.');
      return;
    }

    const items = this.itemsCarrito();
    if (!items || items.length === 0) {
      this.router.navigate(['/carrito']);
      return;
    }

    this.procesando.set(true);

    const itemsPayload = items.map(i => ({
      producto_id: i.producto.id,
      variante_id: i.variante?.id,
      cantidad: i.cantidad
    }));

    // 4. Verificar inventario en backend
    this.cartSvc.verificarStockEnBackend(itemsPayload).subscribe({
      next: (stockRes) => {
        if (!stockRes.valido) {
          this.procesando.set(false);
          const errores = stockRes.items_con_error.map((err: any) => `${err.nombre || 'Producto'}: ${err.error}`).join(', ');
          this.errorEnvio.set(`Error de inventario: ${errores}`);
          Swal.fire({
            title: 'Inventario insuficiente',
            text: errores,
            icon: 'warning',
            confirmButtonColor: '#16a34a'
          });
          return;
        }

        const draftPayload = {
          items: itemsPayload,
          direccion_envio: this.datosEnvioForm.direccion.trim(),
          ciudad: this.datosEnvioForm.ciudad.trim() || 'Armenia',
          departamento: this.datosEnvioForm.departamento.trim() || 'Quindío',
          telefono_contacto: this.datosEnvioForm.telefono.trim(),
          notas: this.datosEnvioForm.notas ? this.datosEnvioForm.notas.trim() : undefined,
          metodo_pago: this.metodoSeleccionado(),
          wompi_desarrollo: !this.wompiEnabled()
        };

        this.pedidoSvc.crearDraft(draftPayload).subscribe({
          next: (draft) => {
            if (this.metodoSeleccionado() === 'wompi') {
              if (!this.wompiEnabled()) {
                this.procesando.set(false);
                this.cartSvc.clearCart();
                this.router.navigate(['/pago-desarrollo'], { state: { pedido: draft } });
                return;
              }

              this.wompiSvc.obtenerDatosPago(draft.pedido_id).subscribe({
                next: (datos) => {
                  this.procesando.set(false);
                  this.wompiSvc.abrirWidget(datos);
                },
                error: () => {
                  this.procesando.set(false);
                  this.errorEnvio.set('Error al conectar con la pasarela Wompi. Intenta de nuevo.');
                  Swal.fire('Error', 'No pudimos conectar con Wompi. Intenta nuevamente.', 'error');
                }
              });
            } else {
              // Transferencia o Asesor
              this.procesando.set(false);
              this.cartSvc.clearCart();
              this.router.navigate(['/pago-asistido'], {
                state: {
                  pedido: { codigo_pedido: draft.codigo_pedido },
                  metodo: this.metodoSeleccionado()
                }
              });
            }
          },
          error: (err) => {
            this.procesando.set(false);
            const msg = err.error?.error || 'Ocurrió un error al registrar tu pedido.';
            this.errorEnvio.set(msg);
            Swal.fire('Atención', msg, 'error');
          }
        });
      },
      error: () => {
        this.procesando.set(false);
        this.errorEnvio.set('Error al verificar el stock. Por favor intenta de nuevo.');
      }
    });
  }
}
