import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

      <!-- HEADER DE SEGURIDAD -->
      <header class="pago-header">
        <div class="header-accent"></div>
        <div class="header-inner">
          <a routerLink="/carrito" class="back-btn">
            <span class="back-circle">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </span>
            <span class="back-label">Volver al carrito</span>
          </a>
          <div class="header-brand">
            <span class="brand-shield">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <span class="brand-name">Plaxtilineas</span>
            <span class="brand-sep">/</span>
            <span class="brand-secure">Pago Seguro</span>
          </div>
          <div class="ssl-badge">
            <span class="ssl-dot"></span>
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            SSL
          </div>
        </div>
      </header>

      <!-- CONTENIDO PRINCIPAL -->
      @if (cargando()) {
        <div class="loading-state">
          <div class="spinner-ring"></div>
          <p class="loading-text">Preparando tu pago seguro...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <div class="error-icon">
            <svg width="34" height="34" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 class="error-title">Error al cargar el pago</h2>
          <p class="error-desc">{{ error() }}</p>
          <a routerLink="/carrito" class="btn-back-cart">Volver al carrito</a>
        </div>
      } @else {
        <div class="pago-grid">
 
          <!-- COLUMNA IZQUIERDA: Resumen del pedido y Envío compactos -->
          <div class="resumen-col">

            <!-- Stepper -->
            <div class="steps-bar-compact">
              <div class="step done"><span class="step-dot">✓</span><span class="step-text">Carrito de Compras</span></div>
              <span class="step-line done"></span>
              <div class="step active"><span class="step-dot">2</span><span class="step-text">Finalizar y Pagar</span></div>
            </div>

            <!-- Tarjeta Unificada: Compra y Entrega -->
            <div class="compra-card">
              <!-- Encabezado Resumen -->
              <div class="compra-section-head">
                <div class="head-icon-compact">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div class="head-titles">
                  <span class="kicker"><span class="kicker-line"></span><span>TU COMPRA</span></span>
                  <h3 class="compra-subtitle">Resumen de Productos</h3>
                </div>
                <span class="items-count-pill">{{ itemsCarrito().length }} {{ itemsCarrito().length === 1 ? 'producto' : 'productos' }}</span>
              </div>

              <!-- Lista de productos compacta con scroll interno si hay muchos -->
              <div class="items-list-compact">
                @for (item of itemsCarrito(); track item.id) {
                  <div class="item-row-compact">
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
                      <p class="item-variant-compact">{{ item.variante?.nombre || item.producto.subcategoria || 'Genérico' }}</p>
                    </div>
                    <div class="item-price-compact">{{ formatPrice(item.precioUnitario * item.cantidad) }}</div>
                  </div>
                }
              </div>

              <!-- Fila de totales compacta -->
              <div class="totales-compact">
                <div class="total-row-compact">
                  <span>Subtotal</span>
                  <span>{{ formatPrice(totalPrice()) }}</span>
                </div>
                <div class="total-row-compact">
                  <span>Costo de envío (Armenia)</span>
                  <span class="text-free-or-price">{{ formatPrice(10000) }}</span>
                </div>
                <div class="total-row-highlight">
                  <div class="total-highlight-left">
                    <span class="total-highlight-title">Total a pagar</span>
                    <span class="total-highlight-note">IVA Incluido</span>
                  </div>
                  <span class="total-price-large">{{ formatPrice(totalConEnvio()) }}</span>
                </div>
              </div>

              <!-- Divisor sutil -->
              <div class="inner-divider"></div>

              <!-- Encabezado Destino de Entrega -->
              <div class="compra-section-head">
                <div class="head-icon-compact">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div class="head-titles">
                  <span class="kicker"><span class="kicker-line"></span><span>DESTINO</span></span>
                  <h3 class="compra-subtitle">Dirección de Entrega</h3>
                </div>
                <button type="button" class="btn-toggle-envio-compact" (click)="toggleEditEnvio()">
                  {{ editandoEnvio() ? 'Guardar' : 'Modificar' }}
                </button>
              </div>

              <!-- Datos de entrega compacto -->
              <div class="envio-body-compact">
                @if (!editandoEnvio()) {
                  <div class="envio-preview-card">
                    <div class="envio-card-main-row">
                      <div class="envio-pin-icon-wrap" title="Dirección de Entrega">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div class="envio-address-content">
                        <p class="envio-dir-text">{{ datosEnvioForm.direccion || 'Sin dirección registrada' }}</p>
                        
                        <div class="envio-meta-row">
                          <span class="envio-meta-item">
                            <span class="envio-meta-icon" title="Ciudad y departamento">
                              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
                            </span>
                            <span>{{ datosEnvioForm.ciudad || 'Armenia' }}, {{ datosEnvioForm.departamento || 'Quindío' }}</span>
                          </span>

                          <span class="envio-meta-sep">·</span>

                          <span class="envio-meta-item">
                            <span class="envio-meta-icon phone" title="Teléfono de contacto">
                              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </span>
                            <span>{{ datosEnvioForm.telefono || 'Sin teléfono' }}</span>
                          </span>
                        </div>

                        <div *ngIf="datosEnvioForm.notas" class="envio-nota-row">
                          <span class="envio-meta-icon note" title="Instrucciones especiales">
                            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          </span>
                          <span class="envio-nota-text">{{ datosEnvioForm.notas }}</span>
                        </div>
                      </div>
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
                      <label>Notas de entrega</label>
                      <input type="text" [(ngModel)]="datosEnvioForm.notas" placeholder="Ej: Timbre 2B" class="input-compact">
                    </div>
                  </div>
                }
              </div>

            </div>

          </div>

          <!-- COLUMNA DERECHA: Métodos de Pago y Acción Directa -->
          <div class="pago-col">
            <div class="pago-card-compact">
              <div class="pago-card-accent"></div>

              <!-- Encabezado compacto del pago -->
              <div class="pago-header-compact">
                <div class="pago-header-left">
                  <span class="kicker"><span class="kicker-line"></span><span>PASARELA OFICIAL</span></span>
                  <h2 class="pago-title-compact">Elige tu método de pago</h2>
                </div>
                <div class="pago-total-badge">
                  <span class="pago-total-label">Total a pagar:</span>
                  <span class="pago-total-value">{{ formatPrice(totalConEnvio()) }}</span>
                </div>
              </div>

              <!-- SELECTOR DE MÉTODOS DE PAGO (Con Wompi destacado y grande) -->
              <div class="payment-methods-stack">
                
                <!-- 1. PAGO ONLINE SEGURO (WOMPI - GRANDE, DESTACADO Y PROMINENTE) -->
                <div class="method-card-wompi-prominent" 
                     [class.selected]="metodoSeleccionado() === 'wompi'" 
                     (click)="setMetodo('wompi')">
                  
                  <div class="wompi-selection-row">
                    <div class="method-radio-large">
                      <span class="radio-dot-large"></span>
                    </div>

                    <div class="wompi-title-block">
                      <div class="wompi-headline-line">
                        <strong class="wompi-main-name">Pago Online Seguro</strong>
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

                <!-- 2. Transferencia Bancaria -->
                <div class="method-card-secondary" 
                     [class.selected]="metodoSeleccionado() === 'transferencia'" 
                     (click)="setMetodo('transferencia')">
                  <div class="method-radio-small">
                    <span class="radio-dot-small"></span>
                  </div>
                  <div class="method-sec-info">
                    <strong class="method-sec-title">Transferencia Bancaria</strong>
                    <span class="method-sec-sub">Pago asistido por nuestro equipo</span>
                  </div>
                  <span class="bank-tag">Bancolombia</span>
                </div>

                <!-- 3. Hablar con un asesor -->
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
                        {{ metodoSeleccionado() === 'wompi' ? 'Pagar con Wompi' : (metodoSeleccionado() === 'transferencia' ? 'Confirmar Transferencia' : 'Finalizar con Asesor') }}
                      </span>
                      <span class="wompi-btn-amount">
                        Total: {{ formatPrice(totalConEnvio()) }} COP
                      </span>
                    </div>

                    <span class="wompi-btn-arrow-pill">
                      <span>Pagar</span>
                      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                  </div>
                }
              </button>

              <!-- Footer integrado compacto (Seguridad + Logos + Legales en 2 filas compactas) -->
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

            </div>
          </div>
        </div>
      }
    </div>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&display=swap');

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .pago-wrapper {
        min-height: 100vh;
        background: #f4f5f7;
        font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        letter-spacing: -0.012em;
        color: #09090b;
        position: relative;
      }

      /* ── KICKER (idéntico al footer/carrito) ── */
      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.14em;
        color: #16a34a;
        text-transform: uppercase;
      }
      .kicker-line { width: 14px; height: 2px; background: #16a34a; border-radius: 2px; flex-shrink: 0; }

      /* ── HEADER ── */
      .pago-header {
        background: #ffffff;
        border-bottom: 1.5px solid #e4e4e7;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .header-accent {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, rgba(22,163,74,0.25) 20%, #16a34a 50%, rgba(22,163,74,0.25) 80%, transparent 100%);
      }
      .header-inner {
        max-width: 1400px;
        width: 94%;
        margin: 0 auto;
        padding: 18px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .back-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #52525b;
        text-decoration: none;
        font-size: 14.5px;
        font-weight: 750;
        transition: color 0.2s;
      }
      .back-circle {
        width: 36px; height: 36px;
        border-radius: 50%;
        background: #ffffff;
        border: 1.5px solid #e4e4e7;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .back-btn:hover { color: #09090b; }
      .back-btn:hover .back-circle { background: #09090b; color: #ffffff; border-color: #09090b; transform: translateX(-2px); }

      .header-brand { display: flex; align-items: center; gap: 10px; font-size: 15.5px; font-weight: 850; }
      .brand-shield {
        width: 32px; height: 32px;
        border-radius: 10px;
        background: #0a0a0a;
        color: #22c55e;
        display: flex; align-items: center; justify-content: center;
      }
      .brand-name { color: #09090b; letter-spacing: -0.02em; }
      .brand-sep { color: #d4d4d8; font-weight: 500; }
      .brand-secure { color: #16a34a; font-weight: 700; }

      .ssl-badge {
        display: flex; align-items: center; gap: 7px;
        background: #f0fdf4;
        border: 1.5px solid rgba(22,163,74,0.3);
        color: #16a34a;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.05em;
      }
      .ssl-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 7px #22c55e; animation: pulseDot 2s infinite; }
      @keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.85); } }

      /* ── LOADING / ERROR ── */
      .loading-state, .error-state {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 60vh; gap: 20px; text-align: center; padding: 48px 24px;
      }
      .spinner-ring {
        width: 52px; height: 52px;
        border: 3px solid #e4e4e7;
        border-top-color: #16a34a;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .loading-text { color: #71717a; font-size: 16px; font-weight: 600; }
      .error-icon { width: 72px; height: 72px; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
      .error-title { font-size: 24px; font-weight: 850; color: #09090b; letter-spacing: -0.03em; }
      .error-desc { color: #71717a; font-size: 15px; max-width: 440px; line-height: 1.5; }
      .btn-back-cart { padding: 14px 30px; background: #09090b; border-radius: 14px; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; transition: all 0.2s; }
      .btn-back-cart:hover { background: #16a34a; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(22,163,74,0.3); }

      /* ── GRID PRINCIPAL AMPLIO (Aprovecha el ancho de la pantalla) ── */
      .pago-grid {
        max-width: 1400px;
        width: 94%;
        margin: 0 auto;
        padding: 28px 0 70px;
        display: grid;
        grid-template-columns: 1.12fr 1fr;
        gap: 36px;
        align-items: start;
      }

      .resumen-col {
        width: 100%;
      }

      .pago-col {
        width: 100%;
      }

      @media (max-width: 1100px) {
        .pago-grid { grid-template-columns: 1fr; gap: 28px; padding: 20px 0 60px; }
        .pago-col { order: -1; }
      }

      @media (max-width: 768px) {
        .pago-grid { width: 92%; padding: 16px 0 70px; gap: 20px; }
        .header-inner { width: 92%; padding: 14px 0; }
        .back-label, .brand-secure, .brand-sep { display: none; }
        .compra-card, .pago-card-compact { padding: 20px 18px !important; border-radius: 18px !important; }
        .wompi-selection-row { flex-direction: column; align-items: flex-start; gap: 14px; }
        .wompi-brand-container { align-self: flex-start; }
      }

      /* ── STEPPER ── */
      .steps-bar-compact {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 4px 18px;
      }
      .step { display: flex; align-items: center; gap: 8px; }
      .step-dot {
        width: 26px; height: 26px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 850;
        background: #ffffff; border: 2px solid #d4d4d8; color: #a1a1aa;
      }
      .step-text { font-size: 13.5px; font-weight: 750; color: #a1a1aa; }
      .step.done .step-dot { background: #16a34a; border-color: #16a34a; color: #ffffff; }
      .step.done .step-text { color: #27272a; }
      .step.active .step-dot { background: #09090b; border-color: #09090b; color: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,0.18); }
      .step.active .step-text { color: #09090b; }
      .step-line { flex: 0 0 36px; height: 2.5px; background: #e4e4e7; border-radius: 2px; }
      .step-line.done { background: #16a34a; }

      /* ── TARJETA IZQUIERDA: RESUMEN Y ENTREGA ── */
      .compra-card {
        background: #ffffff;
        border: 1.5px solid #e4e4e7;
        border-radius: 22px;
        padding: 26px 30px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      }

      .compra-section-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .head-icon-compact {
        width: 36px; height: 36px; border-radius: 10px;
        background: #0a0a0a; color: #22c55e;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .head-titles { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .compra-subtitle { font-size: 17px; font-weight: 850; color: #09090b; letter-spacing: -0.02em; }
      .items-count-pill {
        padding: 4px 12px; border-radius: 9999px;
        background: #f0fdf4; border: 1px solid rgba(22,163,74,0.25);
        color: #16a34a; font-size: 12px; font-weight: 800; white-space: nowrap;
      }

      /* Lista de productos amplia */
      .items-list-compact {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 280px;
        overflow-y: auto;
        padding-right: 6px;
        margin-bottom: 16px;
      }
      .items-list-compact::-webkit-scrollbar { width: 5px; }
      .items-list-compact::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 4px; }

      .item-row-compact {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        background: #fafafa;
        border: 1px solid #f1f5f9;
        border-radius: 14px;
        transition: border-color 0.18s;
      }
      .item-row-compact:hover { border-color: #e4e4e7; }
      .item-img-compact {
        width: 48px; height: 48px;
        background: #ffffff;
        border: 1px solid #e4e4e7;
        border-radius: 10px;
        position: relative;
        flex-shrink: 0;
      }
      .item-img-compact img { width: 100%; height: 100%; object-fit: contain; padding: 2px; border-radius: 10px; }
      .item-qty-compact {
        position: absolute; top: -6px; right: -6px;
        background: #09090b; color: #22c55e;
        font-size: 11px; font-weight: 850;
        min-width: 20px; height: 20px; padding: 0 5px;
        border-radius: 9999px; border: 1.5px solid #ffffff;
        display: flex; align-items: center; justify-content: center;
      }
      .item-info-compact { flex: 1; min-width: 0; }
      .item-name-compact {
        font-size: 15px; font-weight: 800; color: #09090b;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .item-variant-compact { font-size: 12.5px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
      .item-price-compact { font-size: 16px; font-weight: 850; color: #09090b; margin-left: auto; white-space: nowrap; }

      /* Totales legibles y elegantes */
      .totales-compact {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 6px;
      }
      .total-row-compact {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #64748b;
        font-weight: 500;
      }
      .total-row-compact span:last-child { font-weight: 750; color: #09090b; }
      .total-row-highlight {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0a0a0a;
        border-radius: 14px;
        padding: 14px 20px;
        margin-top: 8px;
        position: relative;
        overflow: hidden;
      }
      .total-row-highlight::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, #22c55e, transparent);
      }
      .total-highlight-left { display: flex; flex-direction: column; gap: 2px; }
      .total-highlight-title { font-size: 11px; font-weight: 850; letter-spacing: 0.12em; color: #22c55e; }
      .total-highlight-note { font-size: 11.5px; color: #a1a1aa; }
      .total-price-large { font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em; }

      .inner-divider { height: 1px; background: #f1f5f9; margin: 20px 0; }

      /* Datos de entrega */
      .btn-toggle-envio-compact {
        background: transparent;
        border: 1.5px solid #e4e4e7;
        border-radius: 9999px;
        padding: 5px 14px;
        font-size: 12.5px;
        font-weight: 750;
        color: #16a34a;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s;
      }
      .btn-toggle-envio-compact:hover { background: #f0fdf4; border-color: #16a34a; }
      .envio-body-compact { margin-top: 6px; }

      .envio-preview-card {
        background: #fafafa;
        border: 1.5px solid #f1f5f9;
        border-radius: 16px;
        padding: 16px 20px;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .envio-preview-card:hover {
        border-color: #e4e4e7;
        box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      }
      .envio-card-main-row {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }
      .envio-pin-icon-wrap {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        background: #0a0a0a;
        color: #22c55e;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-top: 2px;
      }
      .envio-address-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .envio-dir-text {
        font-size: 16px;
        font-weight: 850;
        color: #09090b;
        letter-spacing: -0.01em;
        line-height: 1.35;
      }
      .envio-meta-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .envio-meta-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 600;
        color: #52525b;
      }
      .envio-meta-icon {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: #f0fdf4;
        color: #16a34a;
        border: 1px solid rgba(22,163,74,0.22);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .envio-meta-icon.phone {
        background: #f4f4f5;
        color: #27272a;
        border-color: #e4e4e7;
      }
      .envio-meta-icon.note {
        background: #ecfdf5;
        color: #059669;
        border-color: rgba(5,150,105,0.2);
      }
      .envio-meta-sep {
        color: #d4d4d8;
        font-size: 14px;
        font-weight: bold;
      }
      .envio-nota-row {
        margin-top: 4px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: #f0fdf4;
        border: 1px dashed rgba(22,163,74,0.3);
        border-radius: 9px;
        align-self: flex-start;
      }
      .envio-nota-text {
        font-size: 12.5px;
        color: #15803d;
        font-weight: 600;
      }

      /* Formulario de entrega inline */
      .envio-form-compact { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
      .input-compact-group { display: flex; flex-direction: column; gap: 4px; }
      .input-compact-group label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
      .input-compact {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid #e4e4e7;
        border-radius: 10px;
        font-size: 14px;
        color: #09090b;
        background: #fafafa;
        font-family: inherit;
        outline: none;
        transition: all 0.2s;
      }
      .input-compact:focus { background: #ffffff; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
      .input-compact-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      /* ── COLUMNA DERECHA: PAGO Y MÉTODOS ── */
      .pago-card-compact {
        background: #ffffff;
        border: 1.5px solid #e4e4e7;
        border-radius: 22px;
        padding: 26px 30px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        position: relative;
        overflow: hidden;
      }
      .pago-card-accent {
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #16a34a, #22c55e);
      }

      .pago-header-compact {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding-bottom: 16px;
        margin-bottom: 18px;
        border-bottom: 1px solid #f1f5f9;
      }
      .pago-header-left { display: flex; flex-direction: column; gap: 3px; }
      .pago-title-compact { font-size: 19px; font-weight: 850; color: #09090b; letter-spacing: -0.02em; }
      .pago-total-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        background: #f0fdf4;
        border: 1.5px solid rgba(22,163,74,0.25);
        border-radius: 11px;
        padding: 6px 14px;
      }
      .pago-total-label { font-size: 10px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; }
      .pago-total-value { font-size: 17px; font-weight: 900; color: #16a34a; }

      /* ── SELECTOR DE MÉTODOS DE PAGO ── */
      .payment-methods-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 18px;
      }

      /* 1. WOMPI: PROMINENTE, GRANDE, CLARO Y DESTACADO */
      .method-card-wompi-prominent {
        background: #ffffff;
        border: 2.5px solid #e4e4e7;
        border-radius: 18px;
        padding: 18px 22px;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
      }
      .method-card-wompi-prominent:hover {
        border-color: #16a34a;
        background: #fbfdfc;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(22, 163, 74, 0.12);
      }
      .method-card-wompi-prominent.selected {
        border-color: #16a34a;
        background: #f0fdf4;
        box-shadow: 0 8px 24px rgba(22, 163, 74, 0.16);
      }
      .wompi-selection-row {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
      }
      .method-radio-large {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2.5px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
        background: #ffffff;
      }
      .method-card-wompi-prominent.selected .method-radio-large {
        border-color: #16a34a;
        background: #16a34a;
        box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.2);
      }
      .radio-dot-large {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ffffff;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .method-card-wompi-prominent.selected .radio-dot-large {
        opacity: 1;
      }
      .wompi-title-block {
        flex: 1;
        min-width: 0;
      }
      .wompi-headline-line {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .wompi-main-name {
        font-size: 18px;
        font-weight: 850;
        color: #09090b;
        letter-spacing: -0.01em;
      }
      .wompi-badge-pill {
        background: #16a34a;
        color: #ffffff;
        font-size: 11px;
        font-weight: 850;
        padding: 3px 9px;
        border-radius: 9999px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .wompi-description {
        display: block;
        font-size: 14px;
        color: #52525b;
        margin-top: 3px;
        font-weight: 500;
        line-height: 1.4;
      }
      .wompi-brand-container {
        background: #ffffff;
        padding: 6px 14px;
        border-radius: 12px;
        border: 1.5px solid #e4e4e7;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        transition: all 0.2s;
      }
      .method-card-wompi-prominent.selected .wompi-brand-container {
        border-color: rgba(22,163,74,0.4);
      }
      .wompi-brand-logo-large {
        height: 42px;
        max-width: 150px;
        object-fit: contain;
        display: block;
      }

      /* 2 y 3. MÉTODOS SECUNDARIOS */
      .method-card-secondary {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 13px 18px;
        border: 1.5px solid #e4e4e7;
        border-radius: 14px;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;
      }
      .method-card-secondary:hover {
        border-color: #a1a1aa;
        background: #fafafa;
      }
      .method-card-secondary.selected {
        border-color: #16a34a;
        background: #f0fdf4;
      }
      .method-radio-small {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .method-card-secondary.selected .method-radio-small {
        border-color: #16a34a;
        background: #16a34a;
      }
      .radio-dot-small {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ffffff;
        opacity: 0;
      }
      .method-card-secondary.selected .radio-dot-small { opacity: 1; }
      .method-sec-info { flex: 1; min-width: 0; }
      .method-sec-title { display: block; font-size: 15.5px; font-weight: 800; color: #09090b; }
      .method-sec-sub { display: block; font-size: 13px; color: #64748b; margin-top: 1px; }
      .bank-tag {
        font-size: 11px; font-weight: 800; background: #09090b; color: #ffffff;
        padding: 4px 10px; border-radius: 6px;
      }
      .whatsapp-tag {
        font-size: 11px; font-weight: 800; background: #16a34a; color: #ffffff;
        padding: 4px 10px; border-radius: 6px; display: flex; align-items: center; gap: 5px;
      }

      /* Alerta */
      .form-alert-error-compact {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 13.5px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
      }

      /* BOTÓN PRINCIPAL DE PAGO PROMINENTE Y GRANDE */
      .btn-wompi-prominent {
        width: 100%;
        min-height: 70px;
        padding: 14px 22px;
        background: #09090b;
        border: 1.5px solid #27272a;
        border-radius: 18px;
        cursor: pointer;
        transition: all 0.22s ease;
        font-family: inherit;
        color: #ffffff;
        box-shadow: 0 8px 24px rgba(9,9,11,0.2);
        position: relative;
        overflow: hidden;
        margin-bottom: 16px;
      }
      .btn-wompi-prominent::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, #22c55e, transparent);
      }
      .btn-wompi-prominent:hover:not(:disabled) {
        background: #16a34a;
        border-color: #16a34a;
        transform: translateY(-1px);
        box-shadow: 0 10px 30px rgba(22,163,74,0.35);
      }
      .btn-wompi-prominent:disabled { opacity: 0.6; cursor: not-allowed; }
      .wompi-btn-inner { display: flex; align-items: center; gap: 14px; width: 100%; }
      .wompi-btn-logo-white-box {
        background: #ffffff;
        padding: 6px 12px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .wompi-btn-img-large { height: 28px; max-width: 105px; object-fit: contain; display: block; }
      .wompi-icon-large {
        width: 42px; height: 42px; border-radius: 10px;
        background: rgba(255,255,255,0.1); color: #22c55e;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .btn-wompi-prominent:hover:not(:disabled) .wompi-icon-large { color: #ffffff; background: rgba(255,255,255,0.2); }
      .wompi-btn-labels { flex: 1; text-align: left; }
      .wompi-btn-title { display: block; font-size: 18px; font-weight: 850; letter-spacing: -0.01em; }
      .wompi-btn-amount { display: block; font-size: 13.5px; color: #d4d4d8; font-weight: 600; margin-top: 2px; }
      .btn-wompi-prominent:hover:not(:disabled) .wompi-btn-amount { color: #f0fdf4; }
      .wompi-btn-arrow-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: rgba(255,255,255,0.12);
        border-radius: 9999px;
        font-size: 13.5px;
        font-weight: 850;
        letter-spacing: 0.03em;
        flex-shrink: 0;
        transition: all 0.2s;
      }
      .btn-wompi-prominent:hover:not(:disabled) .wompi-btn-arrow-pill {
        background: #ffffff;
        color: #16a34a;
        transform: translateX(2px);
      }
      .btn-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }

      /* FOOTER INTEGRADO */
      .pago-card-footer-compact {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 14px;
        border-top: 1px solid #f1f5f9;
      }
      .trust-inline-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12.5px;
        color: #71717a;
        font-weight: 600;
        flex-wrap: wrap;
      }
      .trust-badge-item { display: inline-flex; align-items: center; gap: 4px; }
      .trust-badge-item svg { color: #16a34a; }
      .trust-sep, .legal-sep-sm { color: #d4d4d8; font-size: 10px; }
      .trust-link-info {
        background: transparent; border: none; color: #16a34a;
        font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer;
        text-decoration: underline; text-underline-offset: 2px;
      }
      .legal-inline-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .chips-row-compact { display: flex; gap: 5px; }
      .chip-sm {
        padding: 3px 8px; background: #fafafa; border: 1px solid #e4e4e7;
        border-radius: 6px; font-size: 11px; font-weight: 800; color: #52525b;
      }
      .links-row-compact { display: flex; align-items: center; gap: 6px; }
      .legal-link-sm {
        background: transparent; border: none; color: #71717a;
        font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: none;
      }
      .legal-link-sm:hover { color: #16a34a; }

      /* ── MODAL ANTIROBOT (ACCESIBLE PARA ADULTOS MAYORES) ── */
      .antirobot-modal-card {
        max-width: 480px;
        padding: 34px 28px 26px;
      }
      .antirobot-badge {
        background: #0a0a0a !important;
        color: #22c55e !important;
        box-shadow: 0 0 0 5px rgba(34,197,94,0.14), 0 8px 20px rgba(0,0,0,0.18) !important;
      }
      .antirobot-modal-desc {
        font-size: 14px !important;
        color: #52525b !important;
        line-height: 1.6;
        margin-bottom: 20px !important;
      }
      .antirobot-modal-box {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        background: #f8fafc;
        border: 2.5px dashed #cbd5e1;
        border-radius: 18px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: all 0.25s ease;
        margin-bottom: 22px;
      }
      .antirobot-modal-box:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
        transform: translateY(-1px);
      }
      .antirobot-modal-box.verified {
        border-style: solid;
        border-color: #16a34a;
        background: #f0fdf4;
        box-shadow: 0 6px 20px rgba(22, 163, 74, 0.16);
      }
      .antirobot-modal-check {
        width: 36px;
        height: 36px;
        border: 2.5px solid #94a3b8;
        border-radius: 10px;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }
      .antirobot-modal-check.checked {
        border-color: #16a34a;
        background: #16a34a;
        box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.25);
      }
      .antirobot-modal-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .antirobot-modal-primary {
        font-size: 16px;
        font-weight: 850;
        color: #09090b;
        letter-spacing: -0.01em;
      }
      .antirobot-modal-box.verified .antirobot-modal-primary {
        color: #15803d;
      }
      .antirobot-modal-secondary {
        font-size: 12.5px;
        color: #64748b;
        font-weight: 500;
        line-height: 1.35;
      }
      .antirobot-modal-shield {
        color: #94a3b8;
        display: flex;
        align-items: center;
        transition: color 0.2s;
        flex-shrink: 0;
      }
      .antirobot-modal-box.verified .antirobot-modal-shield {
        color: #16a34a;
      }
      .antirobot-modal-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .btn-antirobot-confirm {
        width: 100%;
        padding: 16px 20px;
        background: #16a34a;
        color: #ffffff;
        border: none;
        border-radius: 15px;
        font-size: 15px;
        font-weight: 850;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-family: inherit;
        box-shadow: 0 6px 18px rgba(22, 163, 74, 0.28);
        transition: all 0.2s;
      }
      .btn-antirobot-confirm:hover:not(:disabled) {
        background: #15803d;
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35);
      }
      .btn-antirobot-confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
        background: #a1a1aa;
      }
      .btn-antirobot-cancel {
        background: transparent;
        border: none;
        color: #71717a;
        font-size: 13px;
        font-weight: 700;
        padding: 8px;
        cursor: pointer;
        font-family: inherit;
        transition: color 0.2s;
      }
      .btn-antirobot-cancel:hover {
        color: #09090b;
      }

      /* ── MODALES ── */
      .modal-overlay {
        position: fixed; inset: 0;
        background: rgba(9, 9, 11, 0.62);
        backdrop-filter: blur(6px);
        z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .modal-card {
        background: #ffffff;
        border: 1.5px solid #e4e4e7;
        border-radius: 22px;
        padding: 36px 32px 30px;
        width: 100%; max-width: 540px; max-height: 88vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 25px 60px rgba(9,9,11,0.25);
        animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideUp { from { transform: translateY(24px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      .modal-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 22px 22px 0 0; }
      .modal-close {
        position: absolute; top: 16px; right: 16px;
        background: #f4f4f5; border: 1px solid #e4e4e7;
        width: 32px; height: 32px; border-radius: 50%;
        color: #71717a; font-size: 13px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .modal-close:hover { background: #09090b; color: #ffffff; border-color: #09090b; }
      .modal-icon-badge {
        width: 52px; height: 52px;
        background: #0a0a0a; color: #22c55e;
        border-radius: 15px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 18px;
        box-shadow: 0 0 0 5px rgba(34,197,94,0.12), 0 8px 22px rgba(0,0,0,0.15);
      }
      .modal-card .kicker { margin-bottom: 6px; }
      .modal-title { font-size: 22px; font-weight: 850; color: #09090b; margin-bottom: 16px; letter-spacing: -0.03em; }
      .modal-body p { font-size: 14px; color: #52525b; line-height: 1.65; margin-bottom: 16px; }
      .modal-body strong { color: #09090b; }
      .modal-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
      .modal-list li { font-size: 13.5px; color: #52525b; padding-left: 22px; position: relative; line-height: 1.55; }
      .modal-list li::before { content: ''; position: absolute; left: 2px; top: 8px; width: 7px; height: 7px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.15); }
      .modal-note { font-size: 12.5px !important; color: #52525b !important; background: #fafafa; border: 1px solid #e4e4e7; border-left: 3px solid #16a34a; border-radius: 10px; padding: 12px 14px; margin-bottom: 0 !important; }
      .modal-link { color: #16a34a; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
      .cert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
      .cert-item { display: flex; align-items: center; gap: 9px; padding: 11px 13px; background: #f0fdf4; border: 1px solid rgba(22,163,74,0.2); border-radius: 11px; font-size: 12px; font-weight: 700; color: #09090b; }
      .cert-dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }

      /* ── AJUSTE VISUAL: PAGO ALINEADO CON EL CARRITO ── */
      .pago-wrapper { background: #ffffff; color: #09090b; }
      .pago-header { box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03); }
      .header-inner,
      .pago-grid {
        max-width: 1420px;
        width: auto;
        margin-left: auto;
        margin-right: auto;
      }
      .header-inner { padding: 18px 2rem; }
      .pago-grid {
        padding: 32px 2rem 72px;
        grid-template-columns: minmax(0, 1fr) 440px;
        gap: 2.75rem;
      }
      .steps-bar-compact { padding: 0 4px 18px; }
      .step-text,
      .total-row-compact,
      .envio-city-text,
      .envio-nota-text { font-size: 0.82rem; }
      .compra-card,
      .pago-card-compact {
        border: 1px solid #e4e4e7;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
      }
      .compra-card { padding: 1.4rem; }
      .pago-card-compact {
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        top: 0;
      }
      .pago-card-accent {
        height: 3px;
        background: linear-gradient(90deg, #16a34a, #22c55e);
      }
      .compra-subtitle,
      .pago-title-compact { font-size: 1.05rem; line-height: 1.25; }
      .item-name-compact { font-size: 0.95rem; }
      .item-price-compact { font-size: 0.98rem; }
      .total-price-large { font-size: 1.5rem; }
      .pago-header-compact {
        align-items: flex-start;
        gap: 18px;
        margin-bottom: 1.25rem;
      }
      .pago-total-badge {
        border-radius: 12px;
        padding: 9px 12px;
        background: #f8fafc;
        border: 1px solid #f1f5f9;
      }
      .pago-total-label { font-size: 0.72rem; }
      .pago-total-value { font-size: 1.05rem; }
      .payment-methods-stack { gap: 10px; }
      .method-card-wompi-prominent {
        border: 2px solid #16a34a;
        border-radius: 16px;
        padding: 18px;
        background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 72%);
        box-shadow: 0 8px 22px rgba(22, 163, 74, 0.12);
      }
      .method-card-wompi-prominent:hover,
      .method-card-wompi-prominent.selected {
        border-color: #15803d;
        box-shadow: 0 12px 28px rgba(22, 163, 74, 0.18);
        transform: translateY(-1px);
      }
      .wompi-selection-row { gap: 14px; }
      .wompi-main-name { font-size: 1rem; }
      .wompi-description { font-size: 0.78rem; line-height: 1.4; }
      .wompi-brand-logo-large { max-width: 118px; }
      .method-card-secondary {
        min-height: 62px;
        border-radius: 12px;
        padding: 12px 14px;
      }
      .method-sec-title { font-size: 0.9rem; }
      .method-sec-sub,
      .bank-tag,
      .whatsapp-tag { font-size: 0.75rem; }
      .btn-wompi-prominent {
        min-height: 78px;
        border-radius: 14px;
        padding: 16px 18px;
        margin-top: 16px;
        box-shadow: 0 10px 24px rgba(9, 9, 11, 0.16);
      }
      .btn-wompi-prominent:hover:not(:disabled) {
        box-shadow: 0 14px 30px rgba(22, 163, 74, 0.28);
        transform: translateY(-2px);
      }
      .wompi-btn-title { font-size: 1.05rem; }
      .wompi-btn-amount,
      .wompi-btn-arrow-pill { font-size: 0.82rem; }
      .pago-card-footer-compact { margin-top: 16px; }

      @media (max-width: 1080px) {
        .pago-grid {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        .pago-col { order: -1; }
      }

      @media (max-width: 640px) {
        .header-inner,
        .pago-grid {
          width: 100%;
          padding-left: 1.25rem;
          padding-right: 1.25rem;
        }
        .pago-grid {
          padding-top: 20px;
          padding-bottom: 60px;
        }
        .compra-card,
        .pago-card-compact {
          padding: 1.1rem;
          border-radius: 14px;
        }
        .pago-header-compact { flex-direction: column; }
        .pago-total-badge {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .method-card-wompi-prominent { padding: 15px; }
        .wompi-selection-row {
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .wompi-title-block {
          min-width: 0;
          flex: 1;
        }
        .wompi-brand-container {
          width: 100%;
          padding-left: 46px;
        }
        .btn-wompi-prominent {
          min-height: 74px;
          padding: 14px;
        }
        .wompi-btn-arrow-pill { padding: 7px 10px; }
      }
    </style>
  `
})
export class PagoComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
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

    // 4. Cargar datos de envío precargados del usuario
    const user = this.authSvc.currentUser.getValue();
    if (user) {
      let ciudad = user.ciudad ? user.ciudad.trim() : '';
      let depto = '';
      if (ciudad.includes(',')) {
        const parts = ciudad.split(',');
        ciudad = parts[0].trim();
        depto = parts[1].trim();
      }
      this.datosEnvioForm.direccion = user.direccion || '';
      this.datosEnvioForm.ciudad = ciudad || 'Armenia';
      this.datosEnvioForm.departamento = depto || 'Quindío';
      this.datosEnvioForm.telefono = user.telefono || '';

      // Si falta dirección o teléfono, activar modo edición
      if (!this.datosEnvioForm.direccion || !this.datosEnvioForm.telefono) {
        this.editandoEnvio.set(true);
      }
    } else {
      this.editandoEnvio.set(true);
    }
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
    this.editandoEnvio.update(v => !v);
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
