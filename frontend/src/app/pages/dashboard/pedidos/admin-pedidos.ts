import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../services/pedido.service';
import { Pedido, ESTADOS_PEDIDO, EstadoPedido } from '../../../models/pedido.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import Swal from 'sweetalert2';
import {
  faClipboardList,
  faDollarSign,
  faHourglassHalf,
  faCheckCircle,
  faTimesCircle,
  faSync,
  faSearch,
  faChevronDown,
  faChevronUp,
  faBoxOpen,
  faTruck,
  faCreditCard,
  faMapMarkerAlt,
  faUser,
  faCalendarAlt,
  faEnvelope,
  faShoppingBag,
  faClock,
  faCheck,
  faBan,
  faEdit
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './admin-pedidos.html',
  styleUrls: ['./admin-pedidos.css'],
})
export class AdminPedidos implements OnInit {
  private pedidoService = inject(PedidoService);

  // Iconos Font Awesome
  faClipboardList = faClipboardList;
  faDollarSign = faDollarSign;
  faHourglassHalf = faHourglassHalf;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faSync = faSync;
  faSearch = faSearch;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faBoxOpen = faBoxOpen;
  faTruck = faTruck;
  faCreditCard = faCreditCard;
  faMapMarkerAlt = faMapMarkerAlt;
  faUser = faUser;
  faCalendarAlt = faCalendarAlt;
  faEnvelope = faEnvelope;
  faShoppingBag = faShoppingBag;
  faClock = faClock;
  faCheck = faCheck;
  faBan = faBan;
  faEdit = faEdit;

  pedidos = signal<Pedido[]>([]);
  loading = signal(true);
  stats = signal<any>(null);

  searchTerm = signal('');
  filtroEstado = signal<string>('todos');
  expandedPedidoId = signal<number | null>(null);

  updatingId = signal<number | null>(null);

  readonly estadosList = ESTADOS_PEDIDO;

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

  getEstadosOptionsForPedido(pedido: Pedido): EstadoPedido[] {
    const paidStates = ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
    if (paidStates.includes(pedido.estado)) {
      const list: EstadoPedido[] = ['en_preparacion', 'en_camino', 'entregado'];
      if (pedido.estado === 'pagado') {
        list.unshift('pagado');
      } else if (pedido.estado === 'confirmado') {
        list.unshift('confirmado');
      }
      return list;
    }
    return ['pendiente_pago', 'pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];
  }

  esPedidoPagado(estado: string): boolean {
    return ['pagado', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'].includes(estado);
  }

  actualizarEstado(pedidoId: number, nuevoEstado: string): void {
    const pedido = this.pedidos().find(p => p.id === pedidoId);
    if (!pedido) return;

    if (nuevoEstado === 'en_camino') {
      Swal.fire({
        title: 'Detalles de Envío',
        html: `
          <div style="text-align: left; font-family: 'Montserrat', sans-serif;">
            <label style="display:block; margin-bottom: 5px; font-weight:600; font-size:0.9rem;">Empresa Transportadora:</label>
            <input id="swal-transportadora" class="swal2-input" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box;" placeholder="Ej: Servientrega, Interrapidisimo, Coordinadora" value="${pedido.transportadora || ''}">
            <label style="display:block; margin-bottom: 5px; font-weight:600; font-size:0.9rem;">Número de Guía:</label>
            <input id="swal-guia" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" placeholder="Ej: 987654321" value="${pedido.guia_numero || ''}">
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirmar y Enviar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
          const transportadora = (document.getElementById('swal-transportadora') as HTMLInputElement).value;
          const guia = (document.getElementById('swal-guia') as HTMLInputElement).value;
          if (!transportadora || !guia) {
            Swal.showValidationMessage('Ambos campos son obligatorios para enviar el pedido.');
            return false;
          }
          return { transportadora, guia };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const { transportadora, guia } = result.value;
          this.ejecutarActualizacion(pedidoId, nuevoEstado, { transportadora, guia_numero: guia });
        } else {
          // Reset dropdown
          this.cargarPedidos();
        }
      });
      return;
    }

    this.ejecutarActualizacion(pedidoId, nuevoEstado);
  }

  ejecutarActualizacion(pedidoId: number, nuevoEstado: string, extra?: { transportadora?: string; guia_numero?: string; solicitud_cliente?: boolean }): void {
    this.updatingId.set(pedidoId);
    this.pedidoService.adminActualizarEstado(pedidoId, nuevoEstado, extra).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Estado Actualizado',
          text: `El pedido ahora está en estado: ${this.getEstadoLabel(nuevoEstado)}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        
        // Update locally
        this.pedidos.update(list =>
          list.map(p => {
            if (p.id === pedidoId) {
              const updated = { 
                ...p, 
                estado: nuevoEstado as EstadoPedido,
                fecha_actualizacion: new Date().toISOString()
              };
              if (extra?.guia_numero) updated.guia_numero = extra.guia_numero;
              if (extra?.transportadora) updated.transportadora = extra.transportadora;
              if (nuevoEstado === 'en_camino' && !updated.fecha_envio) {
                updated.fecha_envio = new Date().toISOString();
              }
              return updated;
            }
            return p;
          })
        );
        this.updatingId.set(null);
      },
      error: (err) => {
        Swal.fire('Error', err.error?.error || 'No se pudo actualizar el estado del pedido', 'error');
        this.updatingId.set(null);
        this.cargarPedidos();
      }
    });
  }

  cancelarPorCliente(pedido: Pedido): void {
    Swal.fire({
      title: '¿Cancelar pedido?',
      text: `¿Estás seguro de que deseas cancelar el pedido ${pedido.codigo_pedido} por solicitud expresa del cliente? Esto devolverá el stock a la normalidad.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar pedido',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarActualizacion(pedido.id, 'cancelado', { solicitud_cliente: true });
      }
    });
  }

  mostrarModalDevolucion(pedido: Pedido): void {
    Swal.fire({
      title: 'Cancelar Pedido',
      html: `
        <div style="font-family: 'Montserrat', sans-serif; text-align: center; padding: 10px;">
          <p style="font-size: 1.2rem; font-weight: 700; margin-bottom: 10px; color: #ef4444;">Devolución de Dinero</p>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 15px; margin-top: 15px;">
            <p style="font-size: 0.95rem; font-weight: 600; color: #d97706; margin: 0;">⚠️ Pantalla en desarrollo</p>
            <p style="font-size: 0.85rem; color: #64748b; margin: 8px 0 0 0;">
              El sistema de reembolsos automáticos con Wompi se encuentra en fase de pruebas.
            </p>
          </div>
          <p style="font-size: 0.85rem; margin-top: 15px; color: #475569;">
            ¿Deseas proceder con la cancelación administrativa del pedido en la base de datos de todas formas? (Deberás gestionar el reembolso manualmente).
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar pedido',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cancelarPorCliente(pedido);
      }
    });
  }

  editarDatosEnvio(pedido: Pedido): void {
    Swal.fire({
      title: 'Editar Detalles de Envío',
      html: `
        <div style="text-align: left; font-family: 'Montserrat', sans-serif;">
          <label style="display:block; margin-bottom: 5px; font-weight:600; font-size:0.9rem;">Empresa Transportadora:</label>
          <input id="swal-transportadora" class="swal2-input" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box;" placeholder="Ej: Servientrega, Interrapidisimo" value="${pedido.transportadora || ''}">
          <label style="display:block; margin-bottom: 5px; font-weight:600; font-size:0.9rem;">Número de Guía:</label>
          <input id="swal-guia" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" placeholder="Ej: 987654321" value="${pedido.guia_numero || ''}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const transportadora = (document.getElementById('swal-transportadora') as HTMLInputElement).value;
        const guia = (document.getElementById('swal-guia') as HTMLInputElement).value;
        if (!transportadora || !guia) {
          Swal.showValidationMessage('Ambos campos son obligatorios.');
          return false;
        }
        return { transportadora, guia };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { transportadora, guia } = result.value;
        this.ejecutarActualizacion(pedido.id, pedido.estado, { transportadora, guia_numero: guia });
      }
    });
  }

  getEstadoInfo(estado: EstadoPedido) {
    return ESTADOS_PEDIDO.find(e => e.key === estado) || ESTADOS_PEDIDO[0];
  }

  getEstadoFAIcon(estado: string) {
    switch (estado) {
      case 'pendiente': return this.faClock;
      case 'confirmado': return this.faCheckCircle;
      case 'en_preparacion': return this.faBoxOpen;
      case 'en_camino': return this.faTruck;
      case 'entregado': return this.faCheckCircle;
      case 'cancelado': return this.faBan;
      default: return this.faClipboardList;
    }
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
