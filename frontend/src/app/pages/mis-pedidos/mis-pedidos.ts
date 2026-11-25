import { Component, inject, OnInit, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { CatalogoService } from '../../services/catalogo.service';
import { Pedido, PedidoDetalle, ESTADOS_PEDIDO, EstadoPedido } from '../../models/pedido.model';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';
import Swal from 'sweetalert2';

export interface TrazabilidadHito {
  titulo: string;
  detalle: string;
  fecha?: string;
  codigo?: string;
  estado: 'done' | 'active' | 'cancel' | 'pending';
}

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, Footer],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.css'],
})
export class MisPedidos implements OnInit {
  @Input() isEmbedded: boolean = false;
  private pedidoService = inject(PedidoService);
  public authService = inject(AuthService);
  private catalogoService = inject(CatalogoService);
  private route = inject(ActivatedRoute);

  pedidos = signal<Pedido[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  retornoRef = signal<string>('');
  retornoTxId = signal<string>('');

  selectedPedido = signal<Pedido | null>(null);
  showInvoiceModal = signal(false);
  invoicePedido = signal<Pedido | null>(null);

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
    }
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
    window.print();
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
        detalle: 'La orden fue cancelada y el inventario reservado fue liberado.',
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

  isDeletable(pedido: Pedido): boolean {
    const noDeletables: EstadoPedido[] = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
    return !noDeletables.includes(pedido.estado);
  }

  cancelarPedido(pedido: Pedido, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas cancelar el pedido #${pedido.codigo_pedido}? Esta acción liberará el stock reservado.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener',
      background: '#ffffff',
      color: '#111111',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        this.pedidoService.cancelarPedido(pedido.id).subscribe({
          next: () => {
            Swal.fire('Cancelado', 'Tu pedido ha sido cancelado con éxito y el stock ha sido devuelto al catálogo.', 'success');
            this.catalogoService.sincronizarCambiosInventario();
            this.catalogoService.refrescar();
            this.cargarPedidos();
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'No se pudo cancelar el pedido.', 'error');
          }
        });
      }
    });
  }

  eliminarPedido(pedido: Pedido, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el pedido #${pedido.codigo_pedido}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, mantener',
      background: '#ffffff',
      color: '#111111',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        this.pedidoService.eliminarPedido(pedido.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Tu pedido ha sido eliminado con éxito y el stock ha sido devuelto al catálogo.', 'success');
            this.catalogoService.sincronizarCambiosInventario();
            this.catalogoService.refrescar();
            this.cargarPedidos();
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'No se pudo eliminar el pedido.', 'error');
          }
        });
      }
    });
  }
}
