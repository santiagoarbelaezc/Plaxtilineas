import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { WompiService } from '../../services/wompi.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { WompiDatosPago } from '../../models/pedido.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="pago-wrapper">

      <!-- MODAL: ¿Qué es Wompi? -->
      <div *ngIf="modalWompi()" class="modal-overlay" (click)="closeModal('wompi')">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="closeModal('wompi')">✕</button>
          <div class="modal-icon-badge">
            <svg width="28" height="28" fill="none" stroke="#0f172a" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          </div>
          <h2 class="modal-title">¿Qué es Wompi?</h2>
          <div class="modal-body">
            <p><strong>Wompi</strong> es la pasarela de pagos oficial de <strong>Bancolombia</strong>, líder en Colombia con más de 10 millones de transacciones procesadas. Tus datos bancarios nunca llegan a nuestros servidores.</p>
            <div class="cert-grid">
              <div class="cert-item">🏦 Certificada por Bancolombia</div>
              <div class="cert-item">🔒 Encriptación SSL 256-bit</div>
              <div class="cert-item">✅ PCI DSS Nivel 1</div>
              <div class="cert-item">🛡️ Protección antifraude</div>
            </div>
            <p class="modal-note">Aceptamos: Tarjetas Visa, Mastercard, American Express, PSE, Nequi, Daviplata y más.</p>
          </div>
        </div>
      </div>

      <!-- MODAL: Política de Devoluciones -->
      <div *ngIf="modalDevol()" class="modal-overlay" (click)="closeModal('devol')">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="closeModal('devol')">✕</button>
          <div class="modal-icon-badge" style="background: rgba(59,130,246,0.15);">
            <svg width="28" height="28" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
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
          <button class="modal-close" (click)="closeModal('terminos')">✕</button>
          <div class="modal-icon-badge" style="background: rgba(245,158,11,0.15);">
            <svg width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
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
          <button class="modal-close" (click)="closeModal('datos')">✕</button>
          <div class="modal-icon-badge" style="background: rgba(139,92,246,0.15);">
            <svg width="28" height="28" fill="none" stroke="#8b5cf6" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
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
        <div class="header-inner">
          <a routerLink="/carrito" class="back-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Volver al carrito
          </a>
          <div class="header-brand">
            <svg width="16" height="16" fill="none" stroke="#0f172a" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span class="brand-name">Plaxtilineas</span>
            <span class="brand-sep">·</span>
            <span class="brand-secure">Pago Seguro</span>
          </div>
          <div class="ssl-badge">
            <svg width="12" height="12" fill="none" stroke="#0f172a" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
            <svg width="40" height="40" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 class="error-title">Error al cargar el pago</h2>
          <p class="error-desc">{{ error() }}</p>
          <a routerLink="/carrito" class="btn-back-cart">Volver al carrito</a>
        </div>
      } @else {
        <div class="pago-grid">

          <!-- COLUMNA IZQUIERDA: Resumen del pedido -->
          <div class="resumen-col">
            <div class="resumen-card">
              <h2 class="resumen-title">
                <svg width="18" height="18" fill="none" stroke="#0f172a" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Resumen del Pedido
              </h2>

              <div class="items-list">
                @for (item of itemsCarrito(); track item.id) {
                  <div class="item-row">
                    <div class="item-img">
                      @if (item.producto.imagen_url) {
                        <img [src]="item.producto.imagen_url" [alt]="item.producto.nombre" loading="lazy">
                      } @else {
                        <div class="item-img-placeholder">
                          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      }
                      <span class="item-qty">{{ item.cantidad }}</span>
                    </div>
                    <div class="item-info">
                      <p class="item-name">{{ item.producto.nombre }}</p>
                      <p class="item-variant">{{ item.variante?.nombre || item.producto.subcategoria || 'Genérico' }}</p>
                    </div>
                    <div class="item-price">{{ formatPrice(item.precioUnitario * item.cantidad) }}</div>
                  </div>
                }
              </div>

              <div class="totales-section">
                <div class="total-row">
                  <span>Subtotal</span>
                  <span>{{ formatPrice(totalPrice()) }}</span>
                </div>
                <div class="total-row">
                  <span>IVA incluido</span>
                  <span class="text-muted">$0</span>
                </div>
                <div class="total-row">
                  <span>Costo de envío</span>
                  <span>{{ formatPrice(10000) }}</span>
                </div>
                <div class="total-row total-final">
                  <span>Total</span>
                  <span class="total-amount">{{ formatPrice(totalConEnvio()) }}</span>
                </div>
              </div>

              <!-- Referencia del pedido -->
              @if (datosPago()) {
                <div class="ref-box">
                  <span class="ref-label">Referencia del pedido</span>
                  <span class="ref-code">{{ datosPago()!.referencia }}</span>
                </div>
              }
            </div>

            <!-- Datos de envío -->
            @if (datosEnvio()) {
              <div class="envio-card">
                <h3 class="envio-title">
                  <svg width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  Datos de Envío
                </h3>
                <p class="envio-dato">{{ datosEnvio()!.direccion }}</p>
                <p class="envio-dato">{{ datosEnvio()!.ciudad }}{{ datosEnvio()!.departamento ? ', ' + datosEnvio()!.departamento : '' }}</p>
                <p class="envio-dato">📞 {{ datosEnvio()!.telefono }}</p>
              </div>
            }
          </div>

          <!-- COLUMNA DERECHA: Panel de pago -->
          <div class="pago-col">
            <div class="pago-card">

              <!-- Badge de seguridad superior -->
              <div class="secure-top-badge">
                <svg width="14" height="14" fill="none" stroke="#0f172a" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Conexión 100% Segura
              </div>

              <!-- Total grande -->
              <div class="total-hero">
                <span class="total-hero-label">Total a pagar</span>
                <span class="total-hero-amount">{{ formatPrice(totalConEnvio()) }}</span>
                <span class="total-hero-currency">Pesos Colombianos (COP)</span>
              </div>

              <!-- Separador -->
              <div class="divider">
                <span>Elige tu método de pago</span>
              </div>

              <!-- Botón WOMPI -->
              <button
                class="btn-wompi"
                (click)="iniciarPagoWompi()"
                [disabled]="procesandoWompi()"
                id="btn-pagar-wompi">
                @if (procesandoWompi()) {
                  <span class="btn-spinner"></span>
                  <span>Abriendo Wompi...</span>
                } @else {
                  <div class="wompi-btn-content">
                    <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <div class="wompi-btn-text">
                      <span class="wompi-main">Pagar con Wompi</span>
                      <span class="wompi-sub">Tarjeta · PSE · Nequi · Daviplata</span>
                    </div>
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                }
              </button>

              <!-- Info Wompi -->
              <button class="wompi-info-link" (click)="openModal('wompi')">
                ¿Qué es Wompi y cómo funciona?
              </button>

              <!-- Separador -->
              <div class="divider-alt">
                <div class="divider-line"></div>
                <span>o también</span>
                <div class="divider-line"></div>
              </div>

              <!-- Métodos alternativos -->
              <div class="alt-methods">
                <button class="btn-alt" (click)="confirmarMetodoAlt('contraentrega')" id="btn-contraentrega">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  <span>
                    <strong>Contraentrega</strong>
                    <small>Pagas al recibir tu pedido</small>
                  </span>
                </button>
                <button class="btn-alt" (click)="confirmarMetodoAlt('transferencia')" id="btn-transferencia">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>
                    <strong>Transferencia Bancaria</strong>
                    <small>Te enviamos los datos por email</small>
                  </span>
                </button>
              </div>

              <!-- Sellos de seguridad -->
              <div class="security-badges">
                <div class="badge-item">
                  <svg width="16" height="16" fill="none" stroke="#0f172a" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>SSL 256-bit</span>
                </div>
                <div class="badge-item">
                  <svg width="16" height="16" fill="none" stroke="#0f172a" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>PCI DSS</span>
                </div>
                <div class="badge-item">
                  <svg width="16" height="16" fill="none" stroke="#0f172a" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Wompi Certified</span>
                </div>
              </div>

              <!-- Logos de métodos de pago -->
              <div class="payment-logos">
                <div class="logo-chip">VISA</div>
                <div class="logo-chip">MC</div>
                <div class="logo-chip">PSE</div>
                <div class="logo-chip">Nequi</div>
                <div class="logo-chip">Daviplata</div>
              </div>

              <!-- Footer legal -->
              <div class="legal-footer">
                <button class="legal-link" (click)="openModal('devol')">Devoluciones</button>
                <span class="legal-sep">·</span>
                <button class="legal-link" (click)="openModal('terminos')">Términos</button>
                <span class="legal-sep">·</span>
                <button class="legal-link" (click)="openModal('datos')">Datos</button>
                <span class="legal-sep">·</span>
                <a routerLink="/privacidad" class="legal-link">Privacidad</a>
              </div>
            </div>

            <!-- Bancolombia badge -->
            <div class="bancolombia-badge">
              <svg width="14" height="14" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Pagos procesados por <strong>Wompi by Bancolombia</strong>. Tus datos financieros son completamente seguros.
            </div>
          </div>
        </div>
      }
    </div>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .pago-wrapper {
        min-height: 100vh;
        background: #f8fafc;
        font-family: 'Montserrat', sans-serif;
        color: #1e293b;
        position: relative;
      }

      /* ── HEADER ── */
      .pago-header {
        background: #ffffff;
        backdrop-filter: blur(20px);
        border-bottom: 1px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .header-inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .back-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #64748b;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: color 0.2s;
      }
      .back-btn:hover { color: #1e293b; }
      .header-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
      }
      .brand-name { color: #0f172a; }
      .brand-sep { color: #cbd5e1; }
      .brand-secure { color: #64748b; font-weight: 500; }
      .ssl-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(15, 23, 42, 0.2);
        color: #0f172a;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      /* ── LOADING / ERROR ── */
      .loading-state, .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        gap: 20px;
        text-align: center;
        padding: 48px 24px;
      }
      .spinner-ring {
        width: 56px; height: 56px;
        border: 3px solid rgba(15, 23, 42, 0.15);
        border-top-color: #0f172a;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .loading-text { color: #64748b; font-size: 15px; font-weight: 500; }
      .error-icon { width: 72px; height: 72px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
      .error-title { font-size: 22px; font-weight: 800; color: #ef4444; }
      .error-desc { color: #64748b; font-size: 14px; max-width: 400px; }
      .btn-back-cart { padding: 12px 28px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; color: #1e293b; text-decoration: none; font-weight: 700; font-size: 14px; transition: all 0.2s; }
      .btn-back-cart:hover { background: #f8fafc; }

      /* ── GRID PRINCIPAL ── */
      .pago-grid {
        max-width: 1300px;
        margin: 0 auto;
        padding: 40px 32px 80px;
        display: grid;
        grid-template-columns: 1.2fr 480px;
        gap: 40px;
        align-items: start;
      }
      
      @media (max-width: 1024px) {
        .pago-grid {
          grid-template-columns: 1fr 400px;
          gap: 24px;
          padding: 32px 24px;
        }
      }

      @media (max-width: 768px) {
        .pago-wrapper { background: #ffffff; }
        .pago-grid { 
          grid-template-columns: 1fr; 
          padding: 16px 0 100px; 
          gap: 16px;
        }
        .pago-col { order: -1; }
        
        .resumen-card, .envio-card, .pago-card {
          border-radius: 0;
          border-left: none;
          border-right: none;
          box-shadow: none;
          padding: 24px 20px;
          border-top: 1px solid #f1f5f9;
          border-bottom: 8px solid #f8fafc;
        }
        
        .pago-card { border-top: none; }
      }

      /* ── COLUMNA RESUMEN ── */
      .resumen-card, .envio-card, .pago-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02);
      }
      .resumen-title, .envio-title {
        font-size: 13px;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
      }

      /* Items del carrito */
      .items-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 28px; }
      .item-row { display: flex; align-items: center; gap: 14px; }
      .item-img {
        width: 52px; height: 52px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
      }
      .item-img img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
      .item-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; }
      .item-qty {
        position: absolute;
        top: -5px; right: -5px;
        background: #0f172a;
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
        width: 18px; height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .item-info { flex: 1; }
      .item-name { font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.3; }
      .item-variant { font-size: 11px; color: #64748b; margin-top: 2px; }
      .item-price { font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; }

      /* Totales */
      .totales-section { border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; flex-direction: column; gap: 10px; }
      .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; }
      .total-row span:last-child { font-weight: 600; color: #1e293b; }
      .total-final { padding-top: 12px; border-top: 1px solid #e2e8f0; margin-top: 4px; }
      .total-final span:first-child { font-size: 14px; font-weight: 700; color: #1e293b; }
      .total-amount { font-size: 20px !important; font-weight: 800 !important; color: #0f172a !important; }
      .text-muted { color: #cbd5e1 !important; }

      /* Referencia */
      .ref-box { margin-top: 20px; background: rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.15); border-radius: 10px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
      .ref-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
      .ref-code { font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: 0.1em; }

      /* Envío */
      .envio-card { margin-top: 16px; }
      .envio-dato { font-size: 13px; color: #475569; line-height: 1.7; }

      /* ── COLUMNA PAGO ── */
      .pago-card { display: flex; flex-direction: column; gap: 20px; position: sticky; top: 80px; }

      .secure-top-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(15, 23, 42, 0.2);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: 0.05em;
      }

      .total-hero { text-align: center; }
      .total-hero-label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
      .total-hero-amount { display: block; font-size: 38px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1; }
      .total-hero-currency { display: block; font-size: 11px; color: #64748b; margin-top: 4px; }

      .divider { text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; position: relative; }
      .divider::before, .divider::after { content: ''; position: absolute; top: 50%; width: 25%; height: 1px; background: #e2e8f0; }
      .divider::before { left: 0; }
      .divider::after { right: 0; }

      /* Botón Wompi principal */
      .btn-wompi {
        width: 100%;
        padding: 18px 20px;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: none;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
      }
      .btn-wompi:hover:not(:disabled) {
        transform: translateY(-2px);
        background: #020617;
        box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
      }
      .btn-wompi:active:not(:disabled) { transform: scale(0.99); }
      .btn-wompi:disabled { opacity: 0.6; cursor: not-allowed; }
      .wompi-btn-content { display: flex; align-items: center; gap: 12px; width: 100%; }
      .wompi-btn-text { flex: 1; text-align: left; }
      .wompi-main { display: block; font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
      .wompi-sub { display: block; font-size: 11px; font-weight: 500; opacity: 0.8; margin-top: 1px; }
      .btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }

      .wompi-info-link {
        background: transparent;
        border: none;
        color: #0f172a;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        text-decoration: underline;
        font-family: inherit;
        opacity: 0.9;
        transition: opacity 0.2s;
      }
      .wompi-info-link:hover { opacity: 1; }

      /* Separador alternativo */
      .divider-alt { display: flex; align-items: center; gap: 12px; }
      .divider-line { flex: 1; height: 1px; background: #e2e8f0; }
      .divider-alt span { font-size: 11px; color: #94a3b8; font-weight: 600; white-space: nowrap; }

      /* Métodos alternativos */
      .alt-methods { display: flex; flex-direction: column; gap: 10px; }
      .btn-alt {
        width: 100%;
        padding: 14px 16px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #475569;
        text-align: left;
        font-family: inherit;
        transition: all 0.2s;
      }
      .btn-alt:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }
      .btn-alt svg { flex-shrink: 0; }
      .btn-alt span { display: flex; flex-direction: column; gap: 2px; }
      .btn-alt strong { font-size: 13px; font-weight: 700; color: #1e293b; }
      .btn-alt small { font-size: 11px; font-weight: 500; opacity: 0.7; }

      /* Sellos de seguridad */
      .security-badges {
        display: flex;
        justify-content: center;
        gap: 16px;
        padding: 12px 0;
        border-top: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
      }
      .badge-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b; font-weight: 700; }

      /* Logos de pago */
      .payment-logos { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
      .logo-chip { padding: 4px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 0.05em; }

      /* Footer legal */
      .legal-footer { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
      .legal-link { background: transparent; border: none; color: #64748b; font-size: 11px; font-family: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; transition: color 0.2s; padding: 0; }
      .legal-link:hover { color: #1e293b; }
      a.legal-link { text-decoration: underline; }
      .legal-sep { color: #cbd5e1; font-size: 10px; }

      /* Bancolombia badge */
      .bancolombia-badge {
        text-align: center;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .bancolombia-badge strong { color: #475569; }

      /* ── MODALES ── */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .modal-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 36px 32px;
        width: 100%;
        max-width: 520px;
        max-height: 85vh;
        overflow-y: auto;
        position: relative;
        animation: slideUp 0.25s ease;
      }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .modal-close {
        position: absolute;
        top: 16px; right: 16px;
        background: #f1f5f9;
        border: none;
        width: 32px; height: 32px;
        border-radius: 50%;
        color: #64748b;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .modal-close:hover { background: #e2e8f0; color: #1e293b; }
      .modal-icon-badge {
        width: 56px; height: 56px;
        background: rgba(15, 23, 42, 0.1);
        border: 1px solid rgba(15, 23, 42, 0.2);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }
      .modal-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 16px; }
      .modal-body p { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px; }
      .modal-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
      .modal-list li { font-size: 13px; color: #475569; padding-left: 20px; position: relative; line-height: 1.5; }
      .modal-list li::before { content: '›'; position: absolute; left: 0; color: #0f172a; font-weight: 800; }
      .modal-note { font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
      .modal-link { color: #0f172a; text-decoration: underline; }
      .cert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
      .cert-item { padding: 10px 12px; background: rgba(15, 23, 42, 0.06); border: 1px solid rgba(15, 23, 42, 0.15); border-radius: 8px; font-size: 12px; font-weight: 600; color: #0f172a; }
    </style>
  `
})
export class PagoComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private wompiSvc   = inject(WompiService);
  private cartSvc    = inject(CartService);
  private authSvc    = inject(AuthService);

  cargando       = signal(false);
  error          = signal<string | null>(null);
  datosPago      = signal<WompiDatosPago | null>(null);
  procesandoWompi = signal(false);
  itemsCarrito   = signal<any[]>([]);
  datosEnvio     = signal<{ direccion: string; ciudad: string; departamento: string; telefono: string } | null>(null);

  // Modales
  modalWompi   = signal(false);
  modalDevol   = signal(false);
  modalTerminos = signal(false);
  modalDatos   = signal(false);

  ngOnInit(): void {
    // Leer items del carrito
    this.cartSvc.items$.subscribe(items => this.itemsCarrito.set(items));

    // Leer datos de pago pasados por state del router
    const state = window.history.state;

    if (state?.datosPago) {
      this.datosPago.set(state.datosPago);
      sessionStorage.setItem('last_datosPago', JSON.stringify(state.datosPago));
      if (state.datosEnvio) {
        this.datosEnvio.set(state.datosEnvio);
        sessionStorage.setItem('last_datosEnvio', JSON.stringify(state.datosEnvio));
      }
    } else {
      // Intentar recuperar de sessionStorage
      const savedDatosPago = sessionStorage.getItem('last_datosPago');
      const savedDatosEnvio = sessionStorage.getItem('last_datosEnvio');
      if (savedDatosPago) {
        this.datosPago.set(JSON.parse(savedDatosPago));
        if (savedDatosEnvio) {
          this.datosEnvio.set(JSON.parse(savedDatosEnvio));
        }
      } else {
        // Intentar leer de queryParams (fallback)
        const pedidoId = this.route.snapshot.queryParamMap.get('pedido_id');
        if (pedidoId) {
          this.cargarDatosPago(parseInt(pedidoId));
        } else {
          this.router.navigate(['/carrito']);
        }
      }
    }
  }

  private cargarDatosPago(pedidoId: number): void {
    this.cargando.set(true);
    this.wompiSvc.obtenerDatosPago(pedidoId).subscribe({
      next: (datos) => {
        this.datosPago.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener los datos del pago. Por favor vuelve al carrito e intenta nuevamente.');
        this.cargando.set(false);
      }
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

  openModal(modal: string): void {
    this.modalWompi.set(modal === 'wompi');
    this.modalDevol.set(modal === 'devol');
    this.modalTerminos.set(modal === 'terminos');
    this.modalDatos.set(modal === 'datos');
  }

  closeModal(_: string): void {
    this.modalWompi.set(false);
    this.modalDevol.set(false);
    this.modalTerminos.set(false);
    this.modalDatos.set(false);
  }

  iniciarPagoWompi(): void {
    const datos = this.datosPago();
    if (!datos) return;
    this.procesandoWompi.set(true);
    try {
      this.wompiSvc.abrirWidget(datos);
    } catch (err) {
      console.error('[Wompi] Error al abrir widget:', err);
      this.procesandoWompi.set(false);
    }
    // Dejamos el spinner activo — Wompi toma el control de la pantalla
    setTimeout(() => this.procesandoWompi.set(false), 3000);
  }

  confirmarMetodoAlt(metodo: 'contraentrega' | 'transferencia'): void {
    const label = metodo === 'contraentrega' ? 'Contraentrega (Pago al recibir)' : 'Transferencia Bancaria';
    Swal.fire({
      title: '¿Confirmar pedido?',
      html: `<p style="color:#64748b; font-size:14px;">Tu pedido se registrará con método de pago: <strong style="color:#1e293b;">${label}</strong></p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#1e293b',
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#94a3b8',
    }).then(result => {
      if (result.isConfirmed) {
        this.cartSvc.clearCart();
        sessionStorage.removeItem('last_datosPago');
        sessionStorage.removeItem('last_datosEnvio');
        Swal.fire({
          icon: 'success',
          title: '¡Pedido Registrado!',
          text: 'Te contactaremos pronto para coordinar la entrega y el pago.',
          background: '#ffffff',
          color: '#1e293b',
          confirmButtonColor: '#0f172a',
        }).then(() => this.router.navigate(['/pedidos']));
      }
    });
  }
}
