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
      <div class="page-background-glow"></div>

      <!-- 1. ESTADO: VERIFICANDO -->
      @if (estado() === 'verificando') {
        <div class="immersive-card fade-in">
          <div class="immersive-logo-container">
            <img src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png" alt="Plaxtilineas" class="immersive-logo">
            <div class="immersive-logo-glow processing"></div>
          </div>

          <div class="loading-animation-wrapper">
            <div class="modern-ring-spinner">
              <div></div><div></div><div></div><div></div>
            </div>
          </div>

          <div class="text-container">
            <h1 class="state-title font-bold">Procesando tu pago</h1>
            <p class="state-subtitle">Estamos confirmando tu transacción de forma segura con Wompi.<br>Por favor no cierres esta ventana.</p>
          </div>

          <div class="progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" [style.width.%]="progressPct()"></div>
            </div>
            <div class="progress-labels">
              <span class="progress-step-text">{{ statusMessage() }}</span>
              <span class="progress-pct-text">{{ progressPct() }}%</span>
            </div>
          </div>
        </div>
      }

      <!-- 2. ESTADO: PAGADO ✅ -->
      @if (estado() === 'pagado') {
        <div class="immersive-card success-card fade-in">
          <div class="immersive-logo-container">
            <img src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png" alt="Plaxtilineas" class="immersive-logo">
            <div class="immersive-logo-glow success"></div>
          </div>

          <!-- Checkmark SVG Animado -->
          <div class="success-checkmark-wrapper">
            <svg class="success-checkmark-svg" viewBox="0 0 52 52">
              <circle class="success-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>

          <div class="text-container">
            <h1 class="state-title success-gradient font-bold">¡Pago Confirmado!</h1>
            <p class="state-subtitle">Tu transacción ha sido procesada de manera exitosa.<br>Pronto iniciaremos el despacho de tu pedido.</p>
          </div>

          <!-- Panel de información del pedido -->
          <div class="details-panel">
            <div class="detail-row header-detail">
              <span class="detail-label">N° de Pedido</span>
              <span class="detail-value monospace highlight">{{ codigoPedido() }}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Total Pagado</span>
              <span class="detail-value highlight-green">{{ totalPagado() | currency:'COP':'symbol':'1.0-0' }}</span>
            </div>

            @if (emailUsuario()) {
              <div class="detail-row">
                <span class="detail-label">Confirmación enviada a</span>
                <span class="detail-value ellipsis" [title]="emailUsuario()">{{ emailUsuario() }}</span>
              </div>
            }

            @if (referencia()) {
              <div class="detail-row no-border">
                <span class="detail-label">Referencia Wompi</span>
                <span class="detail-value monospace small-text ellipsis" [title]="referencia()">{{ referencia() }}</span>
              </div>
            }
          </div>

          <div class="action-buttons-stack">
            <button class="btn-immersive-primary" routerLink="/pedidos">Ver Mis Pedidos</button>
            <button class="btn-immersive-secondary" routerLink="/productos">Seguir Comprando</button>
          </div>
        </div>
      }

      <!-- 3. ESTADO: PENDIENTE 🕐 -->
      @if (estado() === 'pendiente') {
        <div class="immersive-card warning-card fade-in">
          <div class="immersive-logo-container">
            <img src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png" alt="Plaxtilineas" class="immersive-logo">
            <div class="immersive-logo-glow warning"></div>
          </div>

          <div class="warning-icon-wrapper">
            <span class="warning-clock">🕐</span>
          </div>

          <div class="text-container">
            <h1 class="state-title warning-gradient font-bold">Pago en Verificación</h1>
            <p class="state-subtitle">Wompi está procesando tu transacción.<br>Esto puede tomar hasta 5 minutos.</p>
          </div>

          <div class="details-panel">
            @if (referencia()) {
              <div class="detail-row no-border">
                <span class="detail-label">Referencia del pago</span>
                <span class="detail-value monospace ellipsis" [title]="referencia()">{{ referencia() }}</span>
              </div>
            }
          </div>

          <div class="action-buttons-stack">
            <button class="btn-immersive-primary warning-btn" routerLink="/pedidos">Ver Mis Pedidos</button>
            <button class="btn-immersive-secondary" routerLink="/">Volver al Inicio</button>
          </div>
        </div>
      }

      <!-- 4. ESTADO: CANCELADO / ERROR ❌ -->
      @if (estado() === 'cancelado' || estado() === 'error') {
        <div class="immersive-card danger-card fade-in">
          <div class="immersive-logo-container">
            <img src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png" alt="Plaxtilineas" class="immersive-logo">
            <div class="immersive-logo-glow danger"></div>
          </div>

          <div class="danger-icon-wrapper">
            <svg class="danger-cross-svg" viewBox="0 0 52 52">
              <circle class="danger-circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="danger-line1" fill="none" d="M16 16l20 20"/>
              <path class="danger-line2" fill="none" d="M36 16L16 36"/>
            </svg>
          </div>

          <div class="text-container">
            <h1 class="state-title danger-gradient font-bold">
              {{ estado() === 'cancelado' ? 'Pago Cancelado' : 'Error en el Pago' }}
            </h1>
            <p class="state-subtitle">
              {{ estado() === 'cancelado'
                ? 'Tu transacción fue cancelada o rechazada. No se realizó ningún cobro.'
                : 'Hubo un inconveniente validando tu pago con Wompi.'
              }}
            </p>
          </div>

          @if (referencia()) {
            <div class="details-panel">
              <div class="detail-row no-border">
                <span class="detail-label">Referencia</span>
                <span class="detail-value monospace ellipsis" [title]="referencia()">{{ referencia() }}</span>
              </div>
            </div>
          }

          <div class="action-buttons-stack">
            <button class="btn-immersive-primary danger-btn" routerLink="/carrito">Intentar de Nuevo</button>
            <button class="btn-immersive-secondary" routerLink="/contacto">Contactar Soporte</button>
          </div>
        </div>
      }
    </div>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

      .pago-page {
        min-height: 100vh;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family: 'Montserrat', sans-serif;
        position: relative;
        overflow: hidden;
      }

      .page-background-glow {
        position: absolute;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(27,168,82,0.08) 0%, rgba(241,245,249,0) 70%);
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
        pointer-events: none;
      }

      /* TARJETA INMERSIVA */
      .immersive-card {
        max-width: 480px;
        width: 100%;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 28px;
        padding: 48px 36px;
        text-align: center;
        color: #1e293b;
        backdrop-filter: blur(16px);
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        box-sizing: border-box;
      }

      .immersive-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 28px;
        padding: 1px;
        background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(0,0,0,0.03) 100%);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
      }

      /* LOGO E HILOS DE BRILLO */
      .immersive-logo-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
      }

      .immersive-logo {
        height: 64px;
        width: auto;
        position: relative;
        z-index: 2;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
      }

      .immersive-logo-glow {
        position: absolute;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        z-index: 1;
      }
      .immersive-logo-glow.processing {
        background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 70%);
        animation: glowPulse 2s ease-in-out infinite;
      }
      .immersive-logo-glow.success {
        background: radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(0,0,0,0) 70%);
        animation: glowPulse 2.5s ease-in-out infinite;
      }
      .immersive-logo-glow.warning {
        background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(0,0,0,0) 70%);
        animation: glowPulse 2.5s ease-in-out infinite;
      }
      .immersive-logo-glow.danger {
        background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0,0,0,0) 70%);
        animation: glowPulse 2.5s ease-in-out infinite;
      }

      @keyframes glowPulse {
        0%, 100% { transform: scale(0.9); opacity: 0.5; }
        50% { transform: scale(1.15); opacity: 0.8; }
      }

      /* TEXTOS */
      .text-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .state-title {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .success-gradient {
        background: linear-gradient(135deg, #1ba852, #10b981);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .warning-gradient {
        background: linear-gradient(135deg, #d97706, #fbbf24);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .danger-gradient {
        background: linear-gradient(135deg, #dc2626, #f87171);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .state-subtitle {
        font-size: 13px;
        color: #475569;
        line-height: 1.6;
        margin: 0;
      }

      /* PANEL DE DETALLES GLASSMORPHISM */
      .details-panel {
        width: 100%;
        background: rgba(241, 245, 249, 0.7);
        border: 1px solid rgba(0, 0, 0, 0.04);
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        font-size: 13px;
      }

      .detail-row.no-border {
        border-bottom: none;
      }

      .detail-label {
        color: #64748b;
        font-weight: 600;
      }

      .detail-value {
        color: #334155;
        font-weight: 500;
        text-align: right;
        max-width: 60%;
      }

      .detail-value.highlight {
        color: #0f172a;
        font-weight: 700;
      }

      .detail-value.highlight-green {
        color: #16a34a;
        font-weight: 800;
        font-size: 15px;
      }

      .detail-value.monospace {
        font-family: monospace;
        letter-spacing: 0.05em;
      }

      .detail-value.small-text {
        font-size: 11px;
      }

      .ellipsis {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* SECCIÓN PROGRESO (CARGA) */
      .progress-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .progress-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 10px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #1ba852, #10b981);
        border-radius: 10px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .progress-labels {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        font-weight: 600;
      }

      .progress-step-text {
        color: #64748b;
      }

      .progress-pct-text {
        color: #16a34a;
      }

      /* SPINNER MODERNO */
      .loading-animation-wrapper {
        padding: 12px 0;
      }

      .modern-ring-spinner {
        display: inline-block;
        position: relative;
        width: 64px;
        height: 64px;
      }
      .modern-ring-spinner div {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 52px;
        height: 52px;
        margin: 6px;
        border: 4px solid #16a34a;
        border-radius: 50%;
        animation: modernRing 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        border-color: #16a34a transparent transparent transparent;
      }
      .modern-ring-spinner div:nth-child(1) { animation-delay: -0.45s; }
      .modern-ring-spinner div:nth-child(2) { animation-delay: -0.3s; }
      .modern-ring-spinner div:nth-child(3) { animation-delay: -0.15s; }

      @keyframes modernRing {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* ANIMATED CHECKMARK (SUCCESS) */
      .success-checkmark-wrapper {
        width: 72px;
        height: 72px;
        position: relative;
      }

      .success-checkmark-svg {
        width: 72px;
        height: 72px;
        display: block;
      }

      .success-checkmark-circle {
        stroke-dasharray: 166;
        stroke-dashoffset: 166;
        stroke-width: 3;
        stroke-miterlimit: 10;
        stroke: #16a34a;
        fill: none;
        animation: drawCircle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
      }

      .success-checkmark-check {
        transform-origin: 50% 50%;
        stroke-dasharray: 48;
        stroke-dashoffset: 48;
        stroke-width: 4;
        stroke-linecap: round;
        stroke: #16a34a;
        animation: drawCheck 0.45s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
      }

      @keyframes drawCircle { to { stroke-dashoffset: 0; } }
      @keyframes drawCheck { to { stroke-dashoffset: 0; } }

      /* WARNING/PENDING CLOCK ANIMATION */
      .warning-icon-wrapper {
        width: 72px;
        height: 72px;
        background: rgba(245, 158, 11, 0.1);
        border: 2px solid rgba(245, 158, 11, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: clockPulse 2s infinite ease-in-out;
      }

      .warning-clock {
        font-size: 36px;
        line-height: 1;
      }

      @keyframes clockPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.2); }
        50% { transform: scale(1.05); box-shadow: 0 0 16px 4px rgba(245, 158, 11, 0.1); }
      }

      /* DANGER/ERROR ANIMATED CROSS */
      .danger-icon-wrapper {
        width: 72px;
        height: 72px;
        position: relative;
      }

      .danger-cross-svg {
        width: 72px;
        height: 72px;
        display: block;
      }

      .danger-circle {
        stroke-dasharray: 166;
        stroke-dashoffset: 166;
        stroke-width: 3;
        stroke-miterlimit: 10;
        stroke: #dc2626;
        fill: none;
        animation: drawCircle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
      }

      .danger-line1, .danger-line2 {
        stroke-dasharray: 40;
        stroke-dashoffset: 40;
        stroke-width: 4;
        stroke-linecap: round;
        stroke: #dc2626;
      }

      .danger-line1 {
        animation: drawCheck 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
      }

      .danger-line2 {
        animation: drawCheck 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.7s forwards;
      }

      /* BOTONES DE ACCIÓN FLOTANTES */
      .action-buttons-stack {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 8px;
      }

      .btn-immersive-primary {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, #1ba852, #10b981);
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        border: none;
        border-radius: 14px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-family: inherit;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 15px rgba(27, 168, 82, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-immersive-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(27, 168, 82, 0.25);
        background: linear-gradient(135deg, #10b981, #059669);
      }

      .btn-immersive-primary.warning-btn {
        background: linear-gradient(135deg, #f59e0b, #fbbf24);
        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.15);
      }
      .btn-immersive-primary.warning-btn:hover {
        background: linear-gradient(135deg, #d97706, #fbbf24);
        box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25);
      }

      .btn-immersive-primary.danger-btn {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        box-shadow: 0 4px 15px rgba(220, 38, 38, 0.15);
      }
      .btn-immersive-primary.danger-btn:hover {
        background: linear-gradient(135deg, #b91c1c, #ef4444);
        box-shadow: 0 8px 24px rgba(220, 38, 38, 0.25);
      }

      .btn-immersive-secondary {
        width: 100%;
        padding: 16px;
        background: rgba(0, 0, 0, 0.02);
        color: #475569;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 14px;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
      }

      .btn-immersive-secondary:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #0f172a;
        border-color: rgba(0, 0, 0, 0.15);
      }

      /* RESPONSIVE */
      @media (max-width: 480px) {
        .immersive-card {
          padding: 36px 24px;
          border-radius: 20px;
        }
        .immersive-card::before {
          border-radius: 20px;
        }
      }

      /* ANIMATIONS */
      .fade-in { animation: cardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes cardFadeIn {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
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

  statusMessage = () => {
    const step = this.intentos();
    if (step <= 2) return 'Iniciando conexión con Wompi...';
    if (step <= 4) return 'Verificando firma de integridad...';
    if (step <= 6) return 'Consultando estado de transacción...';
    if (step <= 8) return 'Actualizando inventario de productos...';
    return 'Confirmando detalles finales...';
  };

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
