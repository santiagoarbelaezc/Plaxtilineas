import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { WompiService } from '../../services/wompi.service';
import { AuthService } from '../../services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { CartStatus } from '../../models/pedido.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="checkout-page">

      <!-- Header -->
      <div class="checkout-header">
        <button class="back-btn" routerLink="/carrito">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h1 class="header-title">Finalizar Compra</h1>
        <div class="secure-badge">
          <span>🔒 Pago Seguro</span>
        </div>
      </div>

      <!-- Carrito vacío -->
      @if (items().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h2>Tu carrito está vacío</h2>
          <p>Agrega productos antes de finalizar la compra.</p>
          <button class="btn-primary" routerLink="/productos">Ver Productos</button>
        </div>
      } @else {

        <div class="checkout-layout">

          <!-- Columna Izquierda: Formulario de Envío -->
          <div class="form-card fade-in">
            <h2 class="section-title">
              <span class="section-icon">📍</span> Datos de Envío
            </h2>

            <div class="form-grid">
              <div class="field">
                <label for="nombre">Nombre completo *</label>
                <input id="nombre" type="text" [(ngModel)]="form.nombre" placeholder="Tu nombre completo"
                  [class.error]="formErrors['nombre']" (blur)="validateField('nombre')">
                @if (formErrors['nombre']) {
                  <span class="field-error">{{ formErrors['nombre'] }}</span>
                }
              </div>

              <div class="field">
                <label for="telefono">Teléfono *</label>
                <input id="telefono" type="tel" [(ngModel)]="form.telefono" placeholder="Ej: 3001234567"
                  [class.error]="formErrors['telefono']" (blur)="validateField('telefono')">
                @if (formErrors['telefono']) {
                  <span class="field-error">{{ formErrors['telefono'] }}</span>
                }
              </div>

              <div class="field full-width">
                <label for="direccion">Dirección de entrega *</label>
                <input id="direccion" type="text" [(ngModel)]="form.direccion"
                  placeholder="Ej: Cra 19 #19-35, Apto 201"
                  [class.error]="formErrors['direccion']" (blur)="validateField('direccion')">
                @if (formErrors['direccion']) {
                  <span class="field-error">{{ formErrors['direccion'] }}</span>
                }
              </div>

              <div class="field">
                <label for="ciudad">Ciudad *</label>
                <input id="ciudad" type="text" [(ngModel)]="form.ciudad" placeholder="Ej: Armenia"
                  [class.error]="formErrors['ciudad']" (blur)="validateField('ciudad')">
                @if (formErrors['ciudad']) {
                  <span class="field-error">{{ formErrors['ciudad'] }}</span>
                }
              </div>

              <div class="field">
                <label for="departamento">Departamento</label>
                <input id="departamento" type="text" [(ngModel)]="form.departamento" placeholder="Ej: Quindío">
              </div>

              <div class="field full-width">
                <label for="notas">Notas adicionales (opcional)</label>
                <textarea id="notas" [(ngModel)]="form.notas" rows="3"
                  placeholder="Instrucciones especiales de entrega, referencia del lugar..."></textarea>
              </div>
            </div>
          </div>

          <!-- Columna Derecha / Aside: Resumen del Pedido y Botón de Pago -->
          <aside class="order-aside fade-in">
            <h3 class="aside-title">Tu Pedido ({{ totalItems() }} productos)</h3>
            
            <div class="aside-items">
              @for (item of items(); track item.id) {
                <div class="aside-item">
                  <div class="aside-item-info">
                    <span class="aside-qty">{{ item.cantidad }}×</span>
                    <span class="aside-name">{{ item.producto.nombre }}</span>
                  </div>
                  <span class="aside-price">{{ (item.precioUnitario * item.cantidad) | currency:'COP':'symbol':'1.0-0' }}</span>
                </div>
              }
            </div>

            <!-- Desglose de precios -->
            <div class="aside-totals">
              <div class="aside-row">
                <span>Subtotal</span>
                <span>{{ subtotal() | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="aside-row">
                <span>IVA (incluido)</span>
                <span>{{ iva() | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="aside-row">
                <span>Envío</span>
                <span>{{ costoEnvio() | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="aside-row total">
                <span>Total</span>
                <span>{{ total() | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <!-- Error de stock -->
            @if (stockError()) {
              <div class="stock-alert">
                <span>⚠️ {{ stockError() }}</span>
              </div>
            }

            <!-- Botón de pago -->
            <button class="btn-wompi" (click)="iniciarPago()"
              [disabled]="!isFormValid() || (cartStatus() !== 'IDLE' && cartStatus() !== 'ERROR')">
              @if (cartStatus() === 'VALIDATING') {
                <span class="spinner"></span> Validando stock...
              } @else if (cartStatus() === 'READY') {
                <span class="spinner"></span> Abriendo Wompi...
              } @else if (cartStatus() === 'PAYING') {
                <span class="spinner"></span> Procesando pago...
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Pagar con Wompi
              }
            </button>

            <p class="security-note">
              🔒 Transacción procesada de forma segura a través de Wompi.
            </p>
          </aside>
        </div>
      }
    </div>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      * { box-sizing: border-box; }

      .checkout-page {
        min-height: 100vh;
        background: #0f172a;
        font-family: 'Inter', sans-serif;
        padding: 0;
        color: #e2e8f0;
      }

      /* HEADER */
      .checkout-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: rgba(255,255,255,0.03);
        border-bottom: 1px solid rgba(255,255,255,0.07);
        position: sticky;
        top: 0;
        z-index: 10;
        backdrop-filter: blur(10px);
      }
      .back-btn {
        width: 40px; height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.1);
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .2s;
      }
      .back-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .header-title {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin: 0;
      }
      .secure-badge {
        font-size: 13px;
        font-weight: 600;
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
        padding: 6px 12px;
        border-radius: 20px;
      }

      /* LAYOUT */
      .checkout-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 16px 80px;
      }
      @media (min-width: 900px) {
        .checkout-layout { grid-template-columns: 1fr 380px; }
      }

      /* CARDS */
      .form-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px;
        padding: 28px 24px;
      }
      .section-title {
        font-size: 17px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 24px 0;
        display: flex;
        align-items: center;
        gap: 10px;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .section-icon { font-size: 20px; }

      /* FORM */
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
      .field { display: flex; flex-direction: column; gap: 6px; }
      .full-width { grid-column: 1 / -1; }
      label {
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      input, textarea {
        background: rgba(255,255,255,0.05);
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 12px 14px;
        color: #e2e8f0;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        transition: border-color .2s;
        resize: vertical;
      }
      input::placeholder, textarea::placeholder { color: #475569; }
      input:focus, textarea:focus { border-color: #368c44; }
      input.error { border-color: #ef4444; }
      .field-error { font-size: 11px; color: #ef4444; margin-top: 2px; }

      /* ASIDE */
      .order-aside {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px;
        padding: 24px;
        height: fit-content;
      }
      @media (min-width: 900px) {
        .order-aside {
          position: sticky;
          top: 88px;
        }
      }
      .aside-title {
        font-size: 13px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin: 0 0 16px 0;
      }
      .aside-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
        max-height: 240px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .aside-item {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #cbd5e1;
        align-items: center;
        padding: 8px 10px;
        background: rgba(255,255,255,0.02);
        border-radius: 8px;
      }
      .aside-item-info {
        display: flex;
        gap: 8px;
        min-width: 0;
      }
      .aside-qty { font-weight: 700; color: #368c44; flex-shrink: 0; }
      .aside-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .aside-price { font-weight: 600; color: #e2e8f0; flex-shrink: 0; }

      .aside-totals {
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid rgba(255,255,255,0.07);
        padding-top: 16px;
        margin-bottom: 20px;
      }
      .aside-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #94a3b8;
      }
      .aside-row.total {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin-top: 8px;
      }
      .aside-row.total span:last-child { color: #10b981; font-size: 18px; }

      /* ALERT */
      .stock-alert {
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.3);
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 13px;
        color: #fca5a5;
        margin-bottom: 16px;
      }

      /* BUTTONS */
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, #368c44, #25d366);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        padding: 14px 24px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: .06em;
        transition: all .2s;
        text-decoration: none;
      }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(54,140,68,.4); }

      .btn-wompi {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 1.5px solid rgba(255,255,255,0.12);
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        padding: 16px 24px;
        border-radius: 14px;
        cursor: pointer;
        transition: all .25s;
        text-transform: uppercase;
        letter-spacing: .06em;
        font-family: inherit;
      }
      .btn-wompi:hover:not(:disabled) {
        background: linear-gradient(135deg, #25d366, #368c44);
        border-color: transparent;
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(37,211,102,.3);
      }
      .btn-wompi:disabled { opacity: .5; cursor: not-allowed; }

      .security-note {
        text-align: center;
        font-size: 11px;
        color: #475569;
        margin-top: 12px;
      }

      /* EMPTY STATE */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 24px;
        text-align: center;
      }
      .empty-icon { font-size: 64px; margin-bottom: 20px; }
      .empty-state h2 { color: #fff; font-size: 22px; margin: 0 0 8px 0; }
      .empty-state p { color: #64748b; font-size: 14px; margin: 0 0 24px 0; }

      /* SPINNER */
      .spinner {
        width: 18px; height: 18px;
        border: 2px solid rgba(255,255,255,0.2);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin .7s linear infinite;
        display: inline-block;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* FADE IN */
      .fade-in { animation: fadeIn .3s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    </style>
  `
})
export class CheckoutComponent implements OnInit {
  private cartService  = inject(CartService);
  private pedidoSvc    = inject(PedidoService);
  private wompiSvc     = inject(WompiService);
  private authService  = inject(AuthService);
  private router       = inject(Router);

  // ── Señales ──────────────────────────────────────────────────────────────
  items      = toSignal(this.cartService.items$, { initialValue: [] });
  cartStatus = signal<CartStatus>('IDLE');
  stockError = signal<string>('');

  form = {
    nombre:      '',
    telefono:    '',
    direccion:   '',
    ciudad:      '',
    departamento:'',
    notas:       '',
  };
  formErrors: Record<string, string> = {};

  // ── Cómputos de precio ────────────────────────────────────────────────────
  subtotal   = computed(() => this.cartService.getSubtotal());
  iva        = computed(() => this.cartService.getIVA());
  costoEnvio = computed(() => this.cartService.getCostoEnvio());
  total      = computed(() => this.cartService.getTotalFinal());
  totalItems = computed(() => this.cartService.getTotalItems());

  ngOnInit(): void {
    // Pre-llenar nombre y teléfono desde el usuario autenticado
    const user = this.authService.currentUser.getValue();
    if (user) {
      this.form.nombre    = user.nombre   || '';
      this.form.telefono  = user.telefono || user.telefono_contacto || '';
    }

    // Suscribir a errores de stock para mostrarlos
    this.cartService.stockError$.subscribe(msg => this.stockError.set(msg));
  }

  // ── Validación del formulario ─────────────────────────────────────────────
  validateField(field: string): void {
    switch (field) {
      case 'nombre':
        this.formErrors['nombre'] = this.form.nombre.trim().length < 3
          ? 'El nombre debe tener al menos 3 caracteres.' : '';
        break;
      case 'telefono':
        this.formErrors['telefono'] = !/^[0-9]{7,15}$/.test(this.form.telefono.replace(/\s/g, ''))
          ? 'Teléfono inválido.' : '';
        break;
      case 'direccion':
        this.formErrors['direccion'] = this.form.direccion.trim().length < 5
          ? 'La dirección es muy corta.' : '';
        break;
      case 'ciudad':
        this.formErrors['ciudad'] = this.form.ciudad.trim().length < 2
          ? 'Ingresa una ciudad válida.' : '';
        break;
    }
    // Limpiar errores vacíos
    Object.keys(this.formErrors).forEach(k => {
      if (!this.formErrors[k]) delete this.formErrors[k];
    });
  }

  isFormValid(): boolean {
    return (
      this.form.nombre.trim().length >= 3 &&
      /^[0-9]{7,15}$/.test(this.form.telefono.replace(/\s/g, '')) &&
      this.form.direccion.trim().length >= 5 &&
      this.form.ciudad.trim().length >= 2
    );
  }

  // ── Flujo de pago ─────────────────────────────────────────────────────────
  async iniciarPago(): Promise<void> {
    if (this.cartStatus() !== 'IDLE' && this.cartStatus() !== 'ERROR') return;

    this.stockError.set('');
    this.cartStatus.set('VALIDATING');

    const itemsPayload = (this.items() as any[]).map(item => ({
      producto_id: item.producto.id,
      variante_id: item.variante?.id ?? undefined,
      cantidad:    item.cantidad,
    }));

    // Paso 1: re-validar stock en tiempo real
    this.cartService.verificarStockEnBackend(itemsPayload).subscribe({
      next: (res) => {
        if (!res.valido) {
          const nombres = res.items_con_error.map((i: any) => i.nombre_producto || i.producto_id).join(', ');
          this.stockError.set(`Stock insuficiente para: ${nombres}. Ajusta las cantidades.`);
          this.cartStatus.set('ERROR');
          return;
        }
        this.crearDraftYPagar(itemsPayload);
      },
      error: () => {
        // Si falla la validación de stock, intentar continuar igualmente
        // (el backend lo valida también en crearDraft)
        this.crearDraftYPagar(itemsPayload);
      }
    });
  }

  private crearDraftYPagar(itemsPayload: any[]): void {
    this.cartStatus.set('READY');

    const draftPayload = {
      items:              itemsPayload,
      direccion_envio:    this.form.direccion,
      ciudad:             this.form.ciudad,
      departamento:       this.form.departamento || undefined,
      telefono_contacto:  this.form.telefono,
      notas:              this.form.notas || undefined,
    };

    // Paso 2: crear el draft en el backend
    this.pedidoSvc.crearDraft(draftPayload).subscribe({
      next: (draft) => {
        // Paso 3: obtener firma de Wompi del backend
        this.wompiSvc.obtenerDatosPago(draft.pedido_id).subscribe({
          next: (datos) => {
            this.cartStatus.set('PAYING');
            try {
              this.wompiSvc.abrirWidget(datos);
            } catch (err) {
              console.error('[Wompi] Error al abrir widget:', err);
              Swal.fire({
                icon: 'warning',
                title: 'Widget no disponible',
                text: 'Hubo un problema al cargar la pasarela de pago. Intenta de nuevo.',
                background: '#1e293b',
                color: '#e2e8f0',
                confirmButtonColor: '#368c44',
              });
              this.cartStatus.set('ERROR');
            }
          },
          error: (err) => {
            this.cartStatus.set('ERROR');
            this.stockError.set('Error al conectar con la pasarela de pago. Intenta de nuevo.');
          }
        });
      },
      error: (err) => {
        this.cartStatus.set('ERROR');
        const msg = err?.error?.error || 'Error al crear el pedido. Intenta de nuevo.';
        this.stockError.set(msg);
      }
    });
  }
}
