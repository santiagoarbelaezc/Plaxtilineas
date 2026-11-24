import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { WOMPI_LAST_ORDER_STORAGE_KEY } from '../../services/wompi.service';

type VistaRetorno = 'recibido' | 'pagado' | 'cancelado';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="retorno-page">
      <div class="retorno-card">
        <div class="retorno-accent" [class.is-cancel]="vista() === 'cancelado'"></div>

        <!-- Logo Plaxtilineas -->
        <a routerLink="/" class="retorno-logo-link" aria-label="Plaxtilineas Inicio">
          <img
            src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png"
            alt="Plaxtilineas"
            class="retorno-logo" />
        </a>

        <!-- 1. PAGO YA CONFIRMADO EN BD POR WEBHOOK -->
        @if (vista() === 'pagado') {
          <div class="retorno-icon-ring is-success">
            <svg viewBox="0 0 52 52" class="retorno-svg">
              <circle class="draw-circle" cx="26" cy="26" r="23" fill="none" />
              <path class="draw-check" fill="none" d="M15.5 26.8l6.8 6.9 14.4-14.8" />
            </svg>
          </div>

          <span class="retorno-kicker">Confirmado por nuestro servidor</span>
          <h1 class="retorno-title">¡Gracias por tu compra!</h1>
          <p class="retorno-subtitle">
            Tu pago fue confirmado exitosamente. Hemos enviado el comprobante a tu correo electrónico y ya iniciamos la preparación de tu pedido.
          </p>
        }

        <!-- 2. RETORNO INFORMATIVO INMEDIATO (ESTÁNDAR WOMPI: SIN PANTALLA DE CARGA NI POLLING) -->
        @if (vista() === 'recibido') {
          <div class="retorno-icon-ring is-success">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <span class="retorno-kicker">Resumen de tu transacción</span>
          <h1 class="retorno-title">¡Hemos recibido tu solicitud de pago!</h1>
          <p class="retorno-subtitle">
            Wompi está notificando el resultado directamente a nuestro servidor de forma segura. En cuanto quede acreditado, actualizaremos tu orden y te enviaremos la confirmación por correo electrónico.
          </p>
        }

        <!-- 3. TRANSACCIÓN ANULADA O CANCELADA EN BD -->
        @if (vista() === 'cancelado') {
          <div class="retorno-icon-ring is-danger">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>

          <span class="retorno-kicker is-danger">Estado de la orden</span>
          <h1 class="retorno-title">Transacción no completada</h1>
          <p class="retorno-subtitle">
            La transacción asociada a tu pedido fue anulada o no pudo procesarse. No se realizó ningún cargo definitivo.
          </p>
        }

        <!-- Resumen de Datos del Pedido -->
        @if (codigoPedido() || referencia() || transaccionId() || totalMonto() > 0) {
          <div class="retorno-details">
            @if (codigoPedido()) {
              <div class="detail-row">
                <span class="detail-label">N° de Pedido</span>
                <span class="detail-value mono strong">{{ codigoPedido() }}</span>
              </div>
            }

            @if (totalMonto() > 0) {
              <div class="detail-row">
                <span class="detail-label">Valor de la orden</span>
                <span class="detail-value price">{{ totalMonto() | currency:'COP':'symbol':'1.0-0' }} COP</span>
              </div>
            }

            @if (referencia()) {
              <div class="detail-row">
                <span class="detail-label">Referencia</span>
                <span class="detail-value mono ellipsis" [title]="referencia()">{{ referencia() }}</span>
              </div>
            }

            @if (transaccionId()) {
              <div class="detail-row">
                <span class="detail-label">ID Transacción Wompi</span>
                <span class="detail-value mono ellipsis" [title]="transaccionId()">{{ transaccionId() }}</span>
              </div>
            }

            @if (emailUsuario()) {
              <div class="detail-row">
                <span class="detail-label">Notificación al correo</span>
                <span class="detail-value ellipsis" [title]="emailUsuario()">{{ emailUsuario() }}</span>
              </div>
            }
          </div>
        }

        <!-- Nota de Seguridad S2S Wompi -->
        @if (vista() !== 'cancelado') {
          <div class="retorno-s2s-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>
              Puedes cerrar esta página con tranquilidad: la validación final se realiza automáticamente servidor a servidor con Wompi.
            </span>
          </div>
        }

        <!-- Acciones -->
        <div class="retorno-actions">
          @if (vista() === 'cancelado') {
            <a routerLink="/carrito" class="btn-retorno-primary">Volver al carrito</a>
            <a routerLink="/productos" class="btn-retorno-secondary">Explorar catálogo</a>
          } @else {
            <a [routerLink]="['/perfil']" [queryParams]="{ tab: 'pedidos' }" class="btn-retorno-primary">
              Ver estado en Mis Pedidos
            </a>
            <a routerLink="/productos" class="btn-retorno-secondary">
              Seguir comprando
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .retorno-page {
      min-height: 100dvh;
      background: #f4f5f7;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      font-family: var(--font-secondary, 'Mulish', sans-serif);
      box-sizing: border-box;
    }

    .retorno-card {
      position: relative;
      width: 100%;
      max-width: 520px;
      background: #ffffff;
      border: 1.5px solid #e4e4e7;
      border-radius: 20px;
      padding: 40px 36px 34px;
      text-align: center;
      color: #383838;
      box-shadow: 0 24px 56px -18px rgba(9, 9, 11, 0.12);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-sizing: border-box;
    }

    .retorno-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #379045 0%, #4ade80 100%);
    }

    .retorno-accent.is-cancel {
      background: linear-gradient(90deg, #dc2626 0%, #f87171 100%);
    }

    .retorno-logo-link {
      display: inline-flex;
      margin-bottom: 22px;
    }

    .retorno-logo {
      height: 46px;
      width: auto;
    }

    .retorno-icon-ring {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .retorno-icon-ring.is-success {
      background: #eaf4ec;
      border: 1.5px solid rgba(55, 144, 69, 0.25);
      color: #379045;
    }

    .retorno-icon-ring.is-danger {
      background: #fef2f2;
      border: 1.5px solid #fecaca;
      color: #dc2626;
    }

    .retorno-svg {
      width: 56px;
      height: 56px;
    }

    .draw-circle {
      stroke: #379045;
      stroke-width: 2.6;
      stroke-dasharray: 150;
      stroke-dashoffset: 150;
      animation: circleAnim 0.45s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }

    .draw-check {
      stroke: #379045;
      stroke-width: 3.4;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: checkAnim 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.3s forwards;
    }

    @keyframes circleAnim { to { stroke-dashoffset: 0; } }
    @keyframes checkAnim { to { stroke-dashoffset: 0; } }

    .retorno-kicker {
      font-family: var(--font-primary, 'Montserrat', sans-serif);
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #379045;
      margin-bottom: 6px;
    }

    .retorno-kicker.is-danger {
      color: #dc2626;
    }

    .retorno-title {
      font-family: var(--font-primary, 'Montserrat', sans-serif);
      font-size: 1.55rem;
      font-weight: 800;
      color: #09090b;
      letter-spacing: -0.025em;
      line-height: 1.2;
      margin: 0 0 10px 0;
    }

    .retorno-subtitle {
      font-size: 0.95rem;
      color: #5e5e5e;
      line-height: 1.6;
      margin: 0 0 22px 0;
      max-width: 440px;
    }

    .retorno-details {
      width: 100%;
      background: #f8f9fa;
      border: 1px solid #e4e4e7;
      border-radius: 14px;
      padding: 6px 18px;
      margin-bottom: 16px;
      box-sizing: border-box;
    }

    .detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 0;
      border-bottom: 1px solid #ececef;
      font-size: 0.88rem;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: #71717a;
      font-weight: 600;
      text-align: left;
    }

    .detail-value {
      color: #09090b;
      font-weight: 600;
      text-align: right;
      max-width: 62%;
    }

    .detail-value.strong {
      font-weight: 800;
    }

    .detail-value.price {
      font-family: var(--font-primary, 'Montserrat', sans-serif);
      font-weight: 800;
      color: #379045;
      font-size: 0.96rem;
    }

    .detail-value.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
    }

    .ellipsis {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .retorno-s2s-note {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #eaf4ec;
      border: 1px solid rgba(55, 144, 69, 0.25);
      border-radius: 12px;
      color: #1f4727;
      font-size: 0.82rem;
      line-height: 1.45;
      text-align: left;
      margin-bottom: 22px;
      box-sizing: border-box;
    }

    .retorno-s2s-note svg {
      flex-shrink: 0;
      margin-top: 1px;
      color: #379045;
    }

    .retorno-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .btn-retorno-primary {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 15px 22px;
      background: #09090b;
      border: 2px solid #09090b;
      border-radius: 12px;
      color: #ffffff;
      font-family: var(--font-primary, 'Montserrat', sans-serif);
      font-size: 0.86rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-decoration: none;
      transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
      box-sizing: border-box;
    }

    .btn-retorno-primary:hover {
      background: #141418;
      border-color: #379045;
      transform: translateY(-1px);
    }

    .btn-retorno-secondary {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 22px;
      background: #f4f5f7;
      border: 1.5px solid #e4e4e7;
      border-radius: 12px;
      color: #383838;
      font-family: var(--font-primary, 'Montserrat', sans-serif);
      font-size: 0.84rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-decoration: none;
      transition: background-color 0.2s ease, color 0.2s ease;
      box-sizing: border-box;
    }

    .btn-retorno-secondary:hover {
      background: #e4e4e7;
      color: #09090b;
    }

    @media (max-width: 520px) {
      .retorno-card {
        padding: 32px 20px 26px;
      }
      .retorno-title {
        font-size: 1.35rem;
      }
    }
  `]
})
export class PagoExitosoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pedidoSvc = inject(PedidoService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  // Render inmediato sin pantalla de carga ni polling ("Limbo State" eliminado)
  vista = signal<VistaRetorno>('recibido');
  codigoPedido = signal<string>('');
  referencia = signal<string>('');
  transaccionId = signal<string>('');
  totalMonto = signal<number>(0);
  emailUsuario = signal<string>('');

  ngOnInit(): void {
    const queryRef = this.route.snapshot.queryParamMap.get('ref') ?? '';
    const queryTxId = this.route.snapshot.queryParamMap.get('id') ?? '';

    if (queryTxId) {
      this.transaccionId.set(queryTxId);
    }
    if (queryRef) {
      this.referencia.set(queryRef);
    }

    // Recuperar contexto inmediato guardado antes de ir al Web Checkout de Wompi
    try {
      const raw = sessionStorage.getItem(WOMPI_LAST_ORDER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (!this.referencia() && saved?.referencia) {
          this.referencia.set(saved.referencia);
        }
        if (saved?.codigo_pedido) {
          this.codigoPedido.set(saved.codigo_pedido);
        }
        if (saved?.total) {
          this.totalMonto.set(Number(saved.total));
        }
      }
    } catch {
      // Ignorar errores de sessionStorage
    }

    const user = this.authService.currentUser.getValue();
    if (user?.correo) {
      this.emailUsuario.set(user.correo);
    }

    // Limpiar el carrito visual local si venimos de enviar la orden a Wompi
    if (this.referencia() || queryTxId) {
      this.cartService.clearCart();
    }

    // Consulta única de SOLO LECTURA a nuestra propia BD (sin polling ni llamadas del frontend a Wompi)
    if (this.authService.isLoggedIn.getValue()) {
      this.pedidoSvc.verificarEstado(this.referencia(), queryTxId).subscribe({
        next: (res) => {
          if (res.codigo_pedido) this.codigoPedido.set(res.codigo_pedido);
          if (res.wompi_referencia) this.referencia.set(res.wompi_referencia);
          if (res.wompi_transaction_id && !this.transaccionId()) {
            this.transaccionId.set(res.wompi_transaction_id);
          }
          if (res.total) this.totalMonto.set(res.total);

          if (res.estado === 'pagado') {
            this.vista.set('pagado');
            this.cartService.clearCart();
          } else if (res.estado === 'cancelado') {
            this.vista.set('cancelado');
          } else {
            this.vista.set('recibido');
          }
        },
        error: () => {
          // Mantener vista informativa inmediata sin bloquear al comprador
        }
      });
    }
  }
}
