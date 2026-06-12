import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../services/pedido.service';
import { Pedido, ESTADOS_PEDIDO, EstadoPedido } from '../../../models/pedido.model';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pedidos.html',
  styleUrls: ['./admin-pedidos.css'],
})
export class AdminPedidos implements OnInit {
  private pedidoService = inject(PedidoService);

  pedidos = signal<Pedido[]>([]);
  loading = signal(true);
  stats = signal<any>(null);

  searchTerm = signal('');
  filtroEstado = signal<string>('todos');
  expandedPedidoId = signal<number | null>(null);

  updatingId = signal<number | null>(null);

  readonly estadosList = ESTADOS_PEDIDO;
  readonly estadosOptions: EstadoPedido[] = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];

  get filteredPedidos(): Pedido[] {
    let result = this.pedidos();
    const filtro = this.filtroEstado();
    if (filtro !== 'todos') {
      result = result.filter(p => p.estado === filtro);
    }
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      result = result.filter(p =>
        p.codigo_pedido.toLowerCase().includes(search) ||
        (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(search)) ||
        (p.cliente_correo && p.cliente_correo.toLowerCase().includes(search))
      );
    }
    return result;
  }

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.loading.set(true);
    this.pedidoService.adminObtenerTodos().subscribe({
      next: (res: any) => {
        const data = res.data ?? res;
        this.pedidos.set(data.pedidos || []);
        this.stats.set(data.estadisticas || null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleExpand(id: number): void {
    this.expandedPedidoId.set(this.expandedPedidoId() === id ? null : id);
  }

  actualizarEstado(pedidoId: number, nuevoEstado: string): void {
    this.updatingId.set(pedidoId);
    this.pedidoService.adminActualizarEstado(pedidoId, nuevoEstado).subscribe({
      next: () => {
        // Update locally
        this.pedidos.update(list =>
          list.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado as EstadoPedido } : p)
        );
        this.updatingId.set(null);
      },
      error: () => {
        this.updatingId.set(null);
      }
    });
  }

  getEstadoInfo(estado: EstadoPedido) {
    return ESTADOS_PEDIDO.find(e => e.key === estado) || ESTADOS_PEDIDO[0];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatPrice(price: number): string {
    return `$ ${Math.round(price).toLocaleString('es-CO')}`;
  }

  getEstadoLabel(estado: string): string {
    return ESTADOS_PEDIDO.find(e => e.key === estado)?.label || estado;
  }
}
