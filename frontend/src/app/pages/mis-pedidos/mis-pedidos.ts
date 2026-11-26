import { Component, inject, OnInit, OnDestroy, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { WompiService } from '../../services/wompi.service';
import { AuthService } from '../../services/auth.service';
import { CatalogoService } from '../../services/catalogo.service';
import { Pedido, PedidoDetalle, ESTADOS_PEDIDO, EstadoPedido } from '../../models/pedido.model';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';

export interface TrazabilidadHito {
  titulo: string;
  detalle: string;
  fecha?: string;
  codigo?: string;
  estado: 'done' | 'active' | 'cancel' | 'pending';
}

export interface PedidoActionModal {
  mode: 'confirm-cancel' | 'confirm-delete' | 'success' | 'error';
  title: string;
  message: string;
  pedido?: Pedido;
}

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, Footer],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.css'],
})
export class MisPedidos implements OnInit, OnDestroy {
  @Input() isEmbedded: boolean = false;
  private pedidoService = inject(PedidoService);
  private wompiService = inject(WompiService);
  public authService = inject(AuthService);
  private catalogoService = inject(CatalogoService);
  private route = inject(ActivatedRoute);

  pedidos = signal<Pedido[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  retornoRef = signal<string>('');
  retornoTxId = signal<string>('');
  sincronizandoPagoId = signal<number | null>(null);
  reintentandoPagoId = signal<number | null>(null);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private pollingAttempts = 0;
  private readonly MAX_POLLING_ATTEMPTS = 15;

  selectedPedido = signal<Pedido | null>(null);
  expandedTraceIds = signal<Set<number>>(new Set());
  showInvoiceModal = signal(false);
  invoicePedido = signal<Pedido | null>(null);
  pedidoModal = signal<PedidoActionModal | null>(null);
  modalProcesando = signal(false);

  isTraceExpanded(pedidoId: number): boolean {
    return this.expandedTraceIds().has(pedidoId);
  }

  toggleTrace(pedidoId: number, event?: Event): void {
    event?.stopPropagation();
    const next = new Set(this.expandedTraceIds());
    if (next.has(pedidoId)) {
      next.delete(pedidoId);
    } else {
      next.add(pedidoId);
    }
    this.expandedTraceIds.set(next);
  }

  getUltimoHito(pedido: Pedido): TrazabilidadHito | null {
    const hitos = this.getTrazabilidadHitos(pedido);
    return hitos.length > 0 ? hitos[hitos.length - 1] : null;
  }

  filtroEstado = signal<string>('todos');
  searchQuery = signal<string>('');

  readonly estadosList = ESTADOS_PEDIDO;

  pedidosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    const query = this.searchQuery().trim().toLowerCase();
    let list = this.pedidos();

    if (filtro !== 'todos') {
      list = list.filter(p => p.estado === filtro);
    }

    if (query) {
      list = list.filter(p =>
        (p.codigo_pedido && p.codigo_pedido.toLowerCase().includes(query)) ||
        (p.direccion_envio && p.direccion_envio.toLowerCase().includes(query)) ||
        (p.detalles && p.detalles.some(d => d.nombre_producto.toLowerCase().includes(query)))
      );
    }

    return list;
  });

  getCountByEstado(estado: string): number {
    if (estado === 'todos') return this.pedidos().length;
    return this.pedidos().filter(p => p.estado === estado).length;
  }

  totalPedidos = computed(() => this.pedidos().length);
  totalInvertido = computed(() => this.pedidos().reduce((s, p) => s + Number(p.total), 0));
  pedidosActivos = computed(() =>
    this.pedidos().filter(p => !['entregado', 'cancelado'].includes(p.estado)).length
  );
  entregasCompletadas = computed(() =>
    this.pedidos().filter(p => p.estado === 'entregado').length
  );

  ngOnInit(): void {
    const ref = this.route.snapshot.queryParamMap.get('ref') ?? '';
    const tx = this.route.snapshot.queryParamMap.get('tx') ?? this.route.snapshot.queryParamMap.get('id') ?? '';
    if (ref) this.retornoRef.set(ref);
    if (tx) this.retornoTxId.set(tx);

    this.cargarPedidos();
  }

  ngOnDestroy(): void {
    this.detenerPollingPago();
  }

  cargarPedidos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.pedidoService.obtenerMisPedidos().subscribe({
      next: (res: any) => {
        const data = res.data ?? res;
        const lista: Pedido[] = data.pedidos || [];
        this.pedidos.set(lista);
        this.loading.set(false);

        // Si el usuario acaba de regresar desde Wompi, desplegar automáticamente ese pedido
        const ref = this.retornoRef();
        const tx = this.retornoTxId();
        if (lista.length > 0 && !this.selectedPedido()) {
          if (ref) {
            const match = lista.find(p => p.wompi_referencia === ref) || lista[0];
            this.selectedPedido.set(match);
          } else if (tx) {
            const match = lista.find(p => p.wompi_transaction_id === tx) || lista[0];
            this.selectedPedido.set(match);
          }
        }

        // Activar conciliación S2S rápida si hay un pedido en validación de pago
        const candidatoPendiente = this.resolverPedidoPendienteParaSync(lista);
        if (candidatoPendiente) {
          this.verificarPagoS2S(candidatoPendiente, true);
          this.iniciarPollingPago(candidatoPendiente);
        } else {
          this.detenerPollingPago();
        }
      },
      error: (err) => {
        this.error.set('No pudimos cargar tus pedidos. Intenta de nuevo.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  togglePedido(pedido: Pedido): void {
    if (this.selectedPedido()?.id === pedido.id) {
      this.selectedPedido.set(null);
    } else {
      this.selectedPedido.set(pedido);
      if (pedido.estado === 'pendiente_pago') {
        this.verificarPagoS2S(pedido, true);
        this.iniciarPollingPago(pedido);
      }
    }
  }

  sincronizarPagoManual(pedido: Pedido, event: Event): void {
    event.stopPropagation();
    this.verificarPagoS2S(pedido, false);
  }

  private resolverPedidoPendienteParaSync(lista: Pedido[]): Pedido | null {
    const ref = this.retornoRef();
    if (ref) {
      const porRef = lista.find(p => p.wompi_referencia === ref && p.estado === 'pendiente_pago');
      if (porRef) return porRef;
    }
    const sel = this.selectedPedido();
    if (sel && sel.estado === 'pendiente_pago') {
      return sel;
    }
    return lista.find(p => p.estado === 'pendiente_pago' && p.wompi_referencia) || null;
  }

  private iniciarPollingPago(pedido: Pedido): void {
    this.detenerPollingPago();
    this.pollingAttempts = 0;

    this.pollingTimer = setInterval(() => {
      this.pollingAttempts++;
      const actual = this.pedidos().find(p => p.id === pedido.id);

      if (!actual || actual.estado !== 'pendiente_pago' || this.pollingAttempts > this.MAX_POLLING_ATTEMPTS) {
        this.detenerPollingPago();
        return;
      }

      this.verificarPagoS2S(actual, true);
    }, 3000);
  }

  private detenerPollingPago(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private verificarPagoS2S(pedido: Pedido, silencioso = true): void {
    if (this.sincronizandoPagoId() === pedido.id) {
      return;
    }

    if (!silencioso) {
      this.sincronizandoPagoId.set(pedido.id);
    }

    const txId = this.getTransaccionIdVisible(pedido);

    this.wompiService.verificarTransaccion({
      pedido_id: pedido.id,
      ...(pedido.wompi_referencia ? { referencia: pedido.wompi_referencia } : {}),
      ...(txId ? { transaction_id: txId } : {}),
    }).subscribe({
      next: (res: any) => {
        this.sincronizandoPagoId.set(null);
        const data = res?.data ?? res;
        if (!data || !data.estado) return;

        const nuevoEstado = data.estado as EstadoPedido;
        const cambioEstado = nuevoEstado !== pedido.estado;
        const nuevoTxId = data.wompi_transaction_id || pedido.wompi_transaction_id;

        if (cambioEstado || nuevoTxId !== pedido.wompi_transaction_id) {
          const pedidoActualizado: Pedido = {
            ...pedido,
            estado: nuevoEstado,
            wompi_transaction_id: nuevoTxId,
            wompi_pagado_at: data.wompi_pagado_at || pedido.wompi_pagado_at,
            fecha_actualizacion: data.wompi_pagado_at || new Date().toISOString(),
          };

          this.pedidos.update(list =>
            list.map(p => (p.id === pedido.id ? pedidoActualizado : p))
          );

          if (this.selectedPedido()?.id === pedido.id) {
            this.selectedPedido.set(pedidoActualizado);
          }
        }

        if (nuevoEstado !== 'pendiente_pago') {
          this.detenerPollingPago();
        }
      },
      error: () => {
        this.sincronizandoPagoId.set(null);
      },
    });
  }

  isPedidoExpanded(pedido: Pedido): boolean {
    return this.selectedPedido()?.id === pedido.id;
  }

  openInvoice(pedido: Pedido): void {
    this.invoicePedido.set(pedido);
    this.showInvoiceModal.set(true);
  }

  closeInvoice(): void {
    this.showInvoiceModal.set(false);
    this.invoicePedido.set(null);
  }

  printInvoice(): void {
    const pedido = this.invoicePedido();
    if (!pedido || typeof window === 'undefined') {
      window.print();
      return;
    }

    const escapeHtml = (val?: string | number | null): string =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const userActual = this.authService.currentUser.getValue();
    const clienteNombre = escapeHtml(pedido.cliente_nombre || userActual?.nombre || 'Cliente Plaxtilineas');
    const clienteCorreo = escapeHtml(pedido.cliente_correo || userActual?.correo || '');
    const clienteTel = escapeHtml(pedido.telefono_contacto || userActual?.telefono || '');
    const direccion = escapeHtml(pedido.direccion_envio || 'Sin dirección registrada');
    const ubicacion = escapeHtml([pedido.ciudad, pedido.departamento].filter(Boolean).join(', '));
    const estadoInfo = this.getEstadoInfo(pedido.estado);
    const metodoPago = escapeHtml(this.formatMetodoPago(pedido.metodo_pago));
    const txId = escapeHtml(this.getTransaccionIdVisible(pedido));
    const refWompi = escapeHtml(pedido.wompi_referencia || '');
    const fechaEmision = escapeHtml(this.formatDate(pedido.fecha));
    const fechaConfirmacion = pedido.wompi_pagado_at ? escapeHtml(this.formatDate(pedido.wompi_pagado_at)) : '';
    const costoEnvioTexto =
      pedido.costo_envio && Number(pedido.costo_envio) > 0
        ? this.formatPrice(Number(pedido.costo_envio))
        : 'Incluido';
    const isCancelado = pedido.estado === 'cancelado';
    const isPendiente = pedido.estado === 'pendiente_pago' || pedido.estado === 'pendiente';
    const statusBg = isCancelado ? '#fef2f2' : isPendiente ? '#fffbeb' : '#eaf4ec';
    const statusColor = isCancelado ? '#b91c1c' : isPendiente ? '#b45309' : '#2c7337';
    const statusBorder = isCancelado ? '#fecaca' : isPendiente ? '#fde68a' : 'rgba(55, 144, 69, 0.32)';

    const itemsRows = (pedido.detalles || [])
      .map(
        (item, idx) => `
          <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
            <td class="td-product">
              <div class="prod-name">${escapeHtml(item.nombre_producto)}</div>
              ${item.variante_id ? `<div class="prod-var">Referencia variante #${escapeHtml(item.variante_id)}</div>` : ''}
            </td>
            <td class="td-center">${escapeHtml(item.cantidad)}</td>
            <td class="td-right">${escapeHtml(this.formatPrice(item.precio_unitario))}</td>
            <td class="td-right td-bold">${escapeHtml(this.formatPrice(item.subtotal || item.precio_unitario * item.cantidad))}</td>
          </tr>
        `
      )
      .join('');

    const traceBlocks: string[] = [];
    if (refWompi) {
      traceBlocks.push(`<div class="trace-cell"><span class="trace-k">Referencia de Pago</span><strong class="mono">${refWompi}</strong></div>`);
    }
    if (txId) {
      traceBlocks.push(`<div class="trace-cell"><span class="trace-k">ID Transacción Wompi</span><strong class="mono">${txId}</strong></div>`);
    }
    if (fechaConfirmacion) {
      traceBlocks.push(`<div class="trace-cell"><span class="trace-k">Confirmación de Pago</span><strong>${fechaConfirmacion}</strong></div>`);
    }
    if (pedido.guia_numero) {
      const transportadora = pedido.transportadora ? `${escapeHtml(pedido.transportadora)} · ` : '';
      traceBlocks.push(`<div class="trace-cell"><span class="trace-k">Despacho / Guía</span><strong class="mono">${transportadora}${escapeHtml(pedido.guia_numero)}</strong></div>`);
    }

    const traceSectionHtml =
      traceBlocks.length > 0
        ? `<section class="trace-card"><div class="trace-grid">${traceBlocks.join('')}</div></section>`
        : '';

    const logoUrl = 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png';
    const docTitle = `Comprobante-Plaxtilineas-${pedido.codigo_pedido}`;

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Mulish:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: letter; margin: 12mm; }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #09090b;
      font-family: 'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .sheet {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 14px;
      overflow: hidden;
    }
    .top-bar-accent {
      height: 6px;
      background: linear-gradient(90deg, #379045 0%, #2c7337 55%, #4ade80 100%);
    }
    .sheet-inner {
      padding: 28px 34px 26px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 20px;
      border-bottom: 2px solid #09090b;
    }
    .brand-logo {
      height: 46px;
      width: auto;
      object-fit: contain;
      display: block;
      margin-bottom: 8px;
    }
    .brand-tagline {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #379045;
      margin: 0 0 6px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .brand-meta {
      font-size: 11.5px;
      color: #5e5e5e;
      margin: 2px 0;
      line-height: 1.45;
    }
    .doc-box {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .doc-kicker {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #71717a;
    }
    .doc-code {
      font-family: 'Montserrat', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #09090b;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .doc-date {
      font-size: 11.5px;
      color: #5e5e5e;
    }
    .status-pill {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: ${statusBg};
      border: 1px solid ${statusBorder};
      color: ${statusColor};
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 700;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${statusColor};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0 18px;
    }
    .info-card {
      background: #f8f9fa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-kicker {
      font-family: 'Montserrat', sans-serif;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #379045;
      margin-bottom: 6px;
      display: block;
    }
    .info-lead {
      font-family: 'Montserrat', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #09090b;
      margin: 0 0 4px;
    }
    .info-sub {
      font-size: 12px;
      color: #5e5e5e;
      margin: 2px 0;
      line-height: 1.45;
    }
    .trace-card {
      background: #f5fbf6;
      border: 1px solid rgba(55, 144, 69, 0.25);
      border-left: 4px solid #379045;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 22px;
    }
    .trace-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 28px;
    }
    .trace-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #09090b;
    }
    .trace-k {
      font-family: 'Montserrat', sans-serif;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #2c7337;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead th {
      background: #09090b;
      color: #ffffff;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 10px 12px;
    }
    thead th:first-child { border-radius: 8px 0 0 0; text-align: left; }
    thead th:last-child { border-radius: 0 8px 0 0; }
    tbody td {
      padding: 11px 12px;
      border-bottom: 1px solid #e4e4e7;
      font-size: 12.5px;
      vertical-align: middle;
    }
    tbody tr.row-alt td {
      background: #fafafa;
    }
    .td-product { text-align: left; }
    .td-center { text-align: center; }
    .td-right { text-align: right; }
    .td-bold { font-family: 'Montserrat', sans-serif; font-weight: 700; }
    .prod-name {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      color: #09090b;
      font-size: 12.5px;
    }
    .prod-var {
      font-size: 11px;
      color: #71717a;
      margin-top: 2px;
    }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totals-box {
      width: 310px;
      background: #f8f9fa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 14px 18px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      color: #5e5e5e;
      padding: 4px 0;
    }
    .tot-row strong {
      color: #09090b;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
    }
    .tot-final {
      margin-top: 8px;
      padding-top: 10px;
      border-top: 2px solid #09090b;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .tot-final-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #09090b;
    }
    .tot-final-val {
      font-family: 'Montserrat', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #379045;
    }
    .footer {
      border-top: 1px dashed #d4d4d8;
      padding-top: 16px;
      text-align: center;
    }
    .footer-thanks {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #09090b;
      margin: 0 0 4px;
    }
    .footer-legal {
      font-size: 10.5px;
      color: #71717a;
      margin: 2px 0;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top-bar-accent"></div>
    <div class="sheet-inner">
      <header class="header">
        <div>
          <img src="${logoUrl}" alt="Plaxtilineas" class="brand-logo" />
          <p class="brand-tagline">Soluciones Plásticas de Alta Resistencia</p>
          <p class="brand-meta">Plaxtilineas S.A.S. &bull; NIT: 900.123.456-7</p>
          <p class="brand-meta">Cra. 19 #19-35, Armenia, Quindío &bull; Colombia</p>
        </div>
        <div class="doc-box">
          <span class="doc-kicker">Comprobante de Compra</span>
          <span class="doc-code">#${escapeHtml(pedido.codigo_pedido)}</span>
          <span class="doc-date">${fechaEmision}</span>
          <span class="status-pill">
            <span class="status-dot"></span>
            <span>${escapeHtml(estadoInfo.label)}</span>
          </span>
        </div>
      </header>

      <section class="info-grid">
        <div class="info-card">
          <span class="info-kicker">Datos del Cliente</span>
          <p class="info-lead">${clienteNombre}</p>
          ${clienteCorreo ? `<p class="info-sub">${clienteCorreo}</p>` : ''}
          ${clienteTel ? `<p class="info-sub">Tel: ${clienteTel}</p>` : ''}
        </div>
        <div class="info-card">
          <span class="info-kicker">Entrega y Pago</span>
          <p class="info-lead">${direccion}</p>
          ${ubicacion ? `<p class="info-sub">${ubicacion}</p>` : ''}
          <p class="info-sub">Método: <strong>${metodoPago}</strong></p>
        </div>
      </section>

      ${traceSectionHtml}

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="td-center">Cant.</th>
            <th class="td-right">Precio Unitario</th>
            <th class="td-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-box">
          <div class="tot-row">
            <span>Subtotal</span>
            <strong>${escapeHtml(this.formatPrice(pedido.subtotal || 0))}</strong>
          </div>
          <div class="tot-row">
            <span>Costo de envío</span>
            <strong>${escapeHtml(costoEnvioTexto)}</strong>
          </div>
          <div class="tot-row">
            <span>Impuestos (IVA)</span>
            <strong>Incluido</strong>
          </div>
          <div class="tot-final">
            <span class="tot-final-label">Total Pagado</span>
            <span class="tot-final-val">${escapeHtml(this.formatPrice(pedido.total || 0))}</span>
          </div>
        </div>
      </div>

      <footer class="footer">
        <p class="footer-thanks">¡Gracias por confiar en Plaxtilineas!</p>
        <p class="footer-legal">Soporte y atención comercial: WhatsApp +57 300 736 5939 &bull; plaxtilineas.com</p>
        <p class="footer-legal">Comprobante electrónico generado automáticamente &bull; Plaxtilineas S.A.S. &copy; ${new Date().getFullYear()}</p>
      </footer>
    </div>
  </div>
</body>
</html>`;

    const previousTitle = document.title;
    document.title = docTitle;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      document.title = previousTitle;
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(htmlDoc);
    frameDoc.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          document.title = previousTitle;
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1200);
      }
    };

    const img = frameDoc.querySelector<HTMLImageElement>('img.brand-logo');
    if (img && !img.complete) {
      img.onload = () => setTimeout(triggerPrint, 180);
      img.onerror = () => setTimeout(triggerPrint, 180);
      setTimeout(triggerPrint, 1200);
    } else {
      setTimeout(triggerPrint, 250);
    }
  }

  getEstadoInfo(estado: EstadoPedido) {
    return ESTADOS_PEDIDO.find(e => e.key === estado) || ESTADOS_PEDIDO[0];
  }

  getEstadoIndex(estado: EstadoPedido): number {
    switch (estado) {
      case 'pendiente_pago':
      case 'pendiente':
        return 0; // Recibido
      case 'pagado':
      case 'confirmado':
        return 1; // Confirmado
      case 'en_preparacion':
        return 2; // Preparación
      case 'en_camino':
        return 3; // En Camino
      case 'entregado':
        return 4; // Entregado
      default:
        return -1;
    }
  }

  isStepCompleted(estado: EstadoPedido, stepIndex: number): boolean {
    if (estado === 'cancelado') return false;
    return this.getEstadoIndex(estado) >= stepIndex;
  }

  isStepActive(estado: EstadoPedido, stepIndex: number): boolean {
    if (estado === 'cancelado') return false;
    return this.getEstadoIndex(estado) === stepIndex;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatShortDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTimeShort(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const fecha = d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${fecha} · ${hora}`;
  }

  formatMetodoPago(metodo?: string | null): string {
    const m = (metodo || '').toLowerCase();
    if (m === 'wompi') return 'Pago online (Wompi)';
    if (m === 'asesor') return 'Asesor comercial (WhatsApp)';
    if (m === 'transferencia') return 'Transferencia bancaria';
    return metodo || 'No especificado';
  }

  getTransaccionIdVisible(pedido: Pedido): string {
    if (pedido.wompi_transaction_id) return pedido.wompi_transaction_id;
    if (this.retornoRef() && pedido.wompi_referencia === this.retornoRef() && this.retornoTxId()) {
      return this.retornoTxId();
    }
    return '';
  }

  getTrazabilidadHitos(pedido: Pedido): TrazabilidadHito[] {
    const hitos: TrazabilidadHito[] = [
      {
        titulo: 'Orden registrada en Plaxtilineas',
        detalle: `Pedido #${pedido.codigo_pedido} creado con ${pedido.total_items} ${pedido.total_items === 1 ? 'artículo' : 'artículos'} por ${this.formatPrice(pedido.total)}.`,
        fecha: this.formatDate(pedido.fecha),
        codigo: pedido.wompi_referencia ? `Ref: ${pedido.wompi_referencia}` : undefined,
        estado: 'done',
      },
    ];

    const txId = this.getTransaccionIdVisible(pedido);

    if (pedido.estado === 'pendiente_pago') {
      hitos.push({
        titulo: 'Validando pago con pasarela Wompi',
        detalle: 'Tu transacción fue recibida. Nuestro servidor está validando la confirmación oficial vía Webhook con Wompi.',
        fecha: this.formatDate(pedido.fecha_actualizacion || pedido.fecha),
        codigo: txId ? `Transacción Wompi: ${txId}` : undefined,
        estado: 'active',
      });
    } else if (pedido.estado === 'cancelado') {
      hitos.push({
        titulo: 'Pedido cancelado o anulado',
        detalle: 'La orden fue cancelada.',
        fecha: this.formatDate(pedido.fecha_actualizacion),
        codigo: txId ? `Transacción Wompi: ${txId}` : undefined,
        estado: 'cancel',
      });
    } else if (pedido.wompi_pagado_at || ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'].includes(pedido.estado)) {
      hitos.push({
        titulo: 'Pago confirmado y verificado',
        detalle: `Pago acreditado mediante ${this.formatMetodoPago(pedido.metodo_pago)}.`,
        fecha: this.formatDate(pedido.wompi_pagado_at || pedido.fecha_actualizacion),
        codigo: txId ? `Transacción Wompi: ${txId}` : undefined,
        estado: 'done',
      });
    }

    if (pedido.estado === 'en_preparacion') {
      hitos.push({
        titulo: 'En preparación de bodega',
        detalle: 'Estamos alistando y empacando tus productos para el despacho.',
        fecha: this.formatDate(pedido.fecha_actualizacion),
        estado: 'active',
      });
    }

    if (pedido.fecha_envio || pedido.guia_numero || pedido.estado === 'en_camino' || pedido.estado === 'entregado') {
      hitos.push({
        titulo: pedido.estado === 'entregado' ? 'Pedido despachado y entregado' : 'Despachado en camino',
        detalle: pedido.transportadora
          ? `Enviado con ${pedido.transportadora} hacia ${pedido.direccion_envio}.`
          : `En ruta hacia ${pedido.direccion_envio}.`,
        fecha: this.formatDate(pedido.fecha_envio || pedido.fecha_actualizacion),
        codigo: pedido.guia_numero ? `Guía: ${pedido.guia_numero}` : undefined,
        estado: pedido.estado === 'entregado' ? 'done' : 'active',
      });
    }

    return hitos;
  }

  formatPrice(price: number): string {
    return `$ ${Math.round(price).toLocaleString('es-CO')}`;
  }

  setFiltro(estado: string): void {
    this.filtroEstado.set(estado);
  }

  trackByPedidoId(index: number, pedido: Pedido): number {
    return pedido.id;
  }

  readonly timelineSteps = [
    { label: 'Recibido', icon: 'fa-solid fa-file-invoice' },
    { label: 'Confirmado', icon: 'fa-solid fa-circle-check' },
    { label: 'Preparación', icon: 'fa-solid fa-box' },
    { label: 'En Camino', icon: 'fa-solid fa-truck-fast' },
    { label: 'Entregado', icon: 'fa-solid fa-gift' },
  ];

  isCancelable(pedido: Pedido): boolean {
    const noCancelables: EstadoPedido[] = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];
    return !noCancelables.includes(pedido.estado);
  }

  canRetryPayment(pedido: Pedido): boolean {
    return pedido.estado === 'pendiente_pago' && (pedido.metodo_pago || '').toLowerCase() === 'wompi';
  }

  reintentarPago(pedido: Pedido, event: Event): void {
    event.stopPropagation();
    if (this.reintentandoPagoId() === pedido.id) return;

    this.reintentandoPagoId.set(pedido.id);
    this.wompiService.obtenerDatosPago(pedido.id).subscribe({
      next: (res: any) => {
        this.reintentandoPagoId.set(null);
        const datos = res?.data ?? res;
        this.wompiService.abrirWidget(datos);
      },
      error: (err) => {
        this.reintentandoPagoId.set(null);
        this.pedidoModal.set({
          mode: 'error',
          title: 'No se pudo iniciar el pago',
          message: err?.error?.error || err?.error?.message || 'Ocurrió un inconveniente al conectar con Wompi. Intenta nuevamente.',
        });
      },
    });
  }

  isDeletable(pedido: Pedido): boolean {
    const noDeletables: EstadoPedido[] = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
    return !noDeletables.includes(pedido.estado);
  }

  cancelarPedido(pedido: Pedido, event: Event): void {
    event.stopPropagation();
    this.pedidoModal.set({
      mode: 'confirm-cancel',
      title: '¿Cancelar este pedido?',
      message: `¿Deseas cancelar el pedido #${pedido.codigo_pedido}? Esta acción no se puede deshacer.`,
      pedido,
    });
  }

  eliminarPedido(pedido: Pedido, event: Event): void {
    event.stopPropagation();
    this.pedidoModal.set({
      mode: 'confirm-delete',
      title: '¿Eliminar este pedido?',
      message: `¿Deseas eliminar el pedido #${pedido.codigo_pedido} de tu historial? Esta acción no se puede deshacer.`,
      pedido,
    });
  }

  closePedidoModal(): void {
    if (this.modalProcesando()) return;
    this.pedidoModal.set(null);
  }

  confirmPedidoModalAction(): void {
    const modal = this.pedidoModal();
    if (!modal || !modal.pedido || this.modalProcesando()) return;

    const pedido = modal.pedido;
    this.modalProcesando.set(true);

    if (modal.mode === 'confirm-cancel') {
      this.pedidoService.cancelarPedido(pedido.id).subscribe({
        next: () => {
          this.modalProcesando.set(false);
          this.pedidoModal.set({
            mode: 'success',
            title: 'Pedido cancelado',
            message: `Tu pedido #${pedido.codigo_pedido} ha sido cancelado correctamente.`,
          });
          this.catalogoService.sincronizarCambiosInventario();
          this.cargarPedidos();
        },
        error: (err) => {
          this.modalProcesando.set(false);
          this.pedidoModal.set({
            mode: 'error',
            title: 'No se pudo cancelar',
            message: err?.error?.error || 'Ocurrió un inconveniente al cancelar tu pedido. Intenta nuevamente.',
          });
        },
      });
    } else if (modal.mode === 'confirm-delete') {
      this.pedidoService.eliminarPedido(pedido.id).subscribe({
        next: () => {
          this.modalProcesando.set(false);
          this.pedidoModal.set({
            mode: 'success',
            title: 'Pedido eliminado',
            message: `El pedido #${pedido.codigo_pedido} ha sido eliminado de tu historial.`,
          });
          this.catalogoService.sincronizarCambiosInventario();
          this.cargarPedidos();
        },
        error: (err) => {
          this.modalProcesando.set(false);
          this.pedidoModal.set({
            mode: 'error',
            title: 'No se pudo eliminar',
            message: err?.error?.error || 'Ocurrió un inconveniente al eliminar el pedido. Intenta nuevamente.',
          });
        },
      });
    }
  }
}
