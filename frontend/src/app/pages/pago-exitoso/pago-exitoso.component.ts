import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

type PagoEstado = 'verificando' | 'pagado' | 'pendiente' | 'cancelado' | 'error';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="pago-page">

      <!-- VERIFICANDO -->
      @if (estado() === 'verificando') {
        <div class="estado-card fade-in">
          <div class="pulse-ring">
            <span class="estado-icon spin-icon">⏳</span>
          </div>
          <h1 class="estado-titulo">Verificando tu pago...</h1>
          <p class="estado-desc">Estamos confirmando la transacción con Wompi.<br>Esto puede tardar unos segundos.</p>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPct()"></div>
          </div>
          <p class="progress-label">{{ intentos() }} / {{ maxIntentos }} verificaciones</p>
        </div>
      }

      <!-- PAGO CONFIRMADO ✅ -->
      @if (estado() === 'pagado') {
        <div class="estado-card fade-in success">
          <div class="check-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 class="estado-titulo success-text">¡Pago Confirmado!</h1>
          <p class="estado-desc">Tu pago fue procesado exitosamente. Recibirás un email de confirmación.</p>

          <div class="order-badge">
            <span class="order-label">N° de Pedido</span>
            <span class="order-code">{{ codigoPedido() }}</span>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-icon">💰</span>
              <div>
                <span class="info-label">Total Pagado</span>
                <span class="info-value">{{ totalPagado() | currency:'COP':'symbol':'1.0-0' }}</span>
              </div>
            </div>
            <div class="info-item">
              <span class="info-icon">📧</span>
              <div>
                <span class="info-label">Confirmación enviada a</span>
                <span class="info-value">{{ emailUsuario() }}</span>
              </div>
            </div>
          </div>

          <div class="action-btns">
            <button class="btn-primary" routerLink="/pedidos">Ver Mis Pedidos</button>
            <button class="btn-secondary" routerLink="/productos">Seguir Comprando</button>
          </div>
        </div>
      }

      <!-- PAGO PENDIENTE / EN PROCESO -->
      @if (estado() === 'pendiente') {
        <div class="estado-card fade-in warning">
          <div class="warning-circle">
            <span style="font-size:48px">🕐</span>
          </div>
          <h1 class="estado-titulo warning-text">Pago en Verificación</h1>
          <p class="estado-desc">
            Tu pago está siendo verificado por Wompi. Este proceso puede demorar
            hasta 5 minutos. <strong>Recibirás un email cuando se confirme.</strong>
          </p>
          <div class="ref-box">
            <span class="ref-label">Referencia de pago</span>
            <span class="ref-code">{{ referencia() }}</span>
          </div>
          <div class="action-btns">
            <button class="btn-primary" routerLink="/pedidos">Ver Mis Pedidos</button>
            <button class="btn-secondary" routerLink="/">Ir al Inicio</button>
          </div>
        </div>
      }

      <!-- PAGO CANCELADO / ERROR -->
      @if (estado() === 'cancelado' || estado() === 'error') {
        <div class="estado-card fade-in danger">
          <div class="error-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 class="estado-titulo danger-text">
            {{ estado() === 'cancelado' ? 'Pago Cancelado' : 'Error en el Pago' }}
          </h1>
          <p class="estado-desc">
            {{ estado() === 'cancelado'
              ? 'Tu transacción fue cancelada o rechazada. No se realizó ningún cobro.'
              : 'Hubo un problema verificando tu pago. Si el dinero fue debitado, contáctanos.'
            }}
          </p>
          <div class="action-btns">
            <button class="btn-primary" routerLink="/carrito">Intentar de Nuevo</button>
            <button class="btn-secondary" routerLink="/contacto">Contactar Soporte</button>
          </div>
        </div>
      }

    </div>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .pago-page {
        min-height: 100vh;
        background: #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family: 'Inter', sans-serif;
      }

      .estado-card {
        max-width: 500px;
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        padding: 48px 32px;
        text-align: center;
        color: #e2e8f0;
      }
      .estado-card.success { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.04); }
      .estado-card.warning { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.04); }
      .estado-card.danger  { border-color: rgba(239,68,68,0.3);  background: rgba(239,68,68,0.04); }

      /* ICONS */
      .pulse-ring {
        width: 96px; height: 96px;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 28px;
        animation: pulse 2s infinite;
      }
      .estado-icon { font-size: 48px; line-height: 1; }
      .spin-icon { display: inline-block; animation: spinSlow 3s linear infinite; }

      .check-circle, .warning-circle, .error-circle {
        width: 96px; height: 96px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 28px;
      }
      .check-circle   { background: rgba(16,185,129,0.12); border: 2px solid rgba(16,185,129,0.3); }
      .warning-circle { background: rgba(245,158,11,0.12); border: 2px solid rgba(245,158,11,0.3); }
      .error-circle   { background: rgba(239,68,68,0.12);  border: 2px solid rgba(239,68,68,0.3); }

      /* TITLES */
      .estado-titulo {
        font-size: 26px;
        font-weight: 800;
        color: #fff;
        margin: 0 0 12px 0;
        letter-spacing: -.01em;
      }
      .success-text { color: #10b981; }
      .warning-text { color: #f59e0b; }
      .danger-text  { color: #ef4444; }

      .estado-desc {
        font-size: 14px;
        color: #94a3b8;
        line-height: 1.7;
        margin: 0 0 28px 0;
      }

      /* PROGRESS */
      .progress-bar {
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.08);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #368c44, #25d366);
        border-radius: 2px;
        transition: width 1s ease;
      }
      .progress-label { font-size: 11px; color: #475569; }

      /* ORDER BADGE */
      .order-badge {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px 32px;
        margin-bottom: 28px;
      }
      .order-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
      .order-code { font-family: monospace; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: .12em; }

      /* INFO GRID */
      .info-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 32px;
      }
      .info-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.06);
        text-align: left;
      }
      .info-icon { font-size: 24px; flex-shrink: 0; }
      .info-item div { display: flex; flex-direction: column; gap: 2px; }
      .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
      .info-value { font-size: 14px; font-weight: 600; color: #e2e8f0; }

      /* REF BOX */
      .ref-box {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: rgba(255,255,255,0.04);
        border-radius: 10px;
        padding: 14px 20px;
        margin-bottom: 28px;
      }
      .ref-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
      .ref-code { font-family: monospace; font-size: 15px; color: #cbd5e1; word-break: break-all; }

      /* BUTTONS */
      .action-btns { display: flex; flex-direction: column; gap: 10px; }
      .btn-primary {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #368c44, #25d366);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: .06em;
        font-family: inherit;
        transition: all .2s;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(54,140,68,.4); }
      .btn-secondary {
        width: 100%;
        padding: 14px;
        background: rgba(255,255,255,0.05);
        color: #94a3b8;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        cursor: pointer;
        font-family: inherit;
        transition: all .2s;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .btn-secondary:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }

      /* ANIMATIONS */
      .fade-in { animation: fadeIn .4s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      @keyframes pulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); } 50% { box-shadow: 0 0 0 16px rgba(255,255,255,0); } }
      @keyframes spinSlow { to { transform: rotate(360deg); } }
    </style>
  `
})
export class PagoExitosoComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private pedidoSvc   = inject(PedidoService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  readonly maxIntentos = 10;
  private pollingInterval: any;

  estado       = signal<PagoEstado>('verificando');
  codigoPedido = signal<string>('');
  totalPagado  = signal<number>(0);
  referencia   = signal<string>('');
  intentos     = signal<number>(0);
  emailUsuario = signal<string>('');

  progressPct = () => Math.round((this.intentos() / this.maxIntentos) * 100);

  ngOnInit(): void {
    const ref = this.route.snapshot.queryParamMap.get('ref') ?? '';
    const id = this.route.snapshot.queryParamMap.get('id') ?? '';
    this.referencia.set(ref || id);

    const user = this.authService.currentUser.getValue();
    if (user?.correo) this.emailUsuario.set(user.correo);

    if (!ref && !id) {
      this.estado.set('error');
      return;
    }

    // Iniciar polling (cada 3 seg, máximo 10 veces = 30 seg)
    this.pollingInterval = setInterval(() => this.verificarEstado(ref, id), 3000);
    // Primera llamada inmediata
    this.verificarEstado(ref, id);
  }

  ngOnDestroy(): void {
    this.limpiarPolling();
  }

  private verificarEstado(ref: string, id: string): void {
    if (this.intentos() >= this.maxIntentos) {
      this.limpiarPolling();
      // Después de 30s sin confirmación, pasar a estado pendiente
      if (this.estado() === 'verificando') {
        this.estado.set('pendiente');
      }
      return;
    }

    this.intentos.update(v => v + 1);

    this.pedidoSvc.verificarEstado(ref, id).subscribe({
      next: (res) => {
        if (res.estado === 'pagado') {
          this.limpiarPolling();
          this.codigoPedido.set(res.codigo_pedido);
          this.totalPagado.set(res.total);
          this.estado.set('pagado');
          // Solo vaciar el carrito cuando el backend confirma 'pagado'
          this.cartService.clearCart();
        } else if (res.estado === 'cancelado') {
          this.limpiarPolling();
          this.estado.set('cancelado');
        } else {
          // draft / pendiente_pago → seguir esperando
        }
      },
      error: () => {
        // Si hay error de red, seguir intentando
      }
    });
  }

  private limpiarPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
