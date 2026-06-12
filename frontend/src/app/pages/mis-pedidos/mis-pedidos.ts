import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { Pedido, PedidoDetalle, ESTADOS_PEDIDO, EstadoPedido } from '../../models/pedido.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Footer } from '../../components/footer/footer.component';

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, Footer],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.css'],
})
export class MisPedidos implements OnInit {
  private pedidoService = inject(PedidoService);
  public authService = inject(AuthService);

  pedidos = signal<Pedido[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  selectedPedido = signal<Pedido | null>(null);
  showInvoiceModal = signal(false);
  invoicePedido = signal<Pedido | null>(null);

  filtroEstado = signal<string>('todos');

  readonly estadosList = ESTADOS_PEDIDO;

  pedidosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    const all = this.pedidos();
    if (filtro === 'todos') return all;
    return all.filter(p => p.estado === filtro);
  });

  totalPedidos = computed(() => this.pedidos().length);
  totalInvertido = computed(() => this.pedidos().reduce((s, p) => s + Number(p.total), 0));
  pedidosActivos = computed(() =>
    this.pedidos().filter(p => !['entregado', 'cancelado'].includes(p.estado)).length
  );

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.pedidoService.obtenerMisPedidos().subscribe({
      next: (res: any) => {
        const data = res.data ?? res;
        this.pedidos.set(data.pedidos || []);
        this.loading.set(false);
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
    const order: EstadoPedido[] = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
    return order.indexOf(estado);
  }

  isStepCompleted(estado: EstadoPedido, stepIndex: number): boolean {
    if (estado === 'cancelado') return false;
    return this.getEstadoIndex(estado) >= stepIndex;
  }

  isStepActive(estado: EstadoPedido, stepIndex: number): boolean {
    if (estado === 'cancelado') return false;
    return this.getEstadoIndex(estado) === stepIndex;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
    { label: 'Recibido', icon: '📋' },
    { label: 'Confirmado', icon: '✅' },
    { label: 'Preparación', icon: '📦' },
    { label: 'En Camino', icon: '🚚' },
    { label: 'Entregado', icon: '🎉' },
  ];
}
