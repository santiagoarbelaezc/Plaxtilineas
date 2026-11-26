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
  faEdit,
  faArrowLeft,
  faFileInvoice,
  faReceipt,
  faPrint,
  faChevronLeft,
  faChevronRight
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
  faArrowLeft = faArrowLeft;
  faFileInvoice = faFileInvoice;
  faReceipt = faReceipt;
  faPrint = faPrint;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  selectedPedido = signal<Pedido | null>(null);

  pedidos = signal<Pedido[]>([]);
  loading = signal(true);
  stats = signal<any>(null);

  searchTerm = signal('');
  filtroEstado = signal<string>('todos');
  filtroFecha = signal<string>('todos');
  fechaPersonalizada = signal<string>('');
  paginaActual = signal<number>(1);
  itemsPorPagina = signal<number>(6);
  expandedPedidoId = signal<number | null>(null);

  updatingId = signal<number | null>(null);

  readonly estadosList = ESTADOS_PEDIDO;
  readonly transportadorasOpciones: string[] = [
    'Servientrega',
    'Interrapidísimo',
    'Coordinadora',
    'Envía',
    'TCC',
    'Deprisa',
    '4-72',
    'Domicilio Plaxtilineas (Armenia)',
  ];

  get filteredPedidos(): Pedido[] {
    let result = this.pedidos();
    const filtro = this.filtroEstado();
    if (filtro !== 'todos') {
      result = result.filter(p => p.estado === filtro);
    }
    const fechaFiltro = this.filtroFecha();
    if (fechaFiltro !== 'todos') {
      const now = new Date();
      result = result.filter(p => {
        if (!p.fecha) return false;
        const pedidoDate = new Date(p.fecha);
        if (isNaN(pedidoDate.getTime())) return true;

        if (fechaFiltro === 'hoy') {
          return pedidoDate.toDateString() === now.toDateString();
        }
        if (fechaFiltro === '7dias') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return pedidoDate >= sevenDaysAgo;
        }
        if (fechaFiltro === '30dias') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return pedidoDate >= thirtyDaysAgo;
        }
        if (fechaFiltro === 'mes') {
          return (
            pedidoDate.getMonth() === now.getMonth() &&
            pedidoDate.getFullYear() === now.getFullYear()
          );
        }
        if (fechaFiltro === 'custom' && this.fechaPersonalizada()) {
          const [year, month, day] = this.fechaPersonalizada().split('-').map(Number);
          return (
            pedidoDate.getFullYear() === year &&
            pedidoDate.getMonth() === month - 1 &&
            pedidoDate.getDate() === day
          );
        }
        return true;
      });
    }
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      result = result.filter(p =>
        p.codigo_pedido.toLowerCase().includes(search) ||
        (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(search)) ||
        (p.cliente_correo && p.cliente_correo.toLowerCase().includes(search))
      );
    }
    // Ordenar de más reciente a más antiguo (para ver los últimos pedidos)
    result = [...result].sort((a, b) => {
      const timeA = new Date(a.fecha).getTime() || 0;
      const timeB = new Date(b.fecha).getTime() || 0;
      return timeB - timeA || (b.id - a.id);
    });
    return result;
  }

  get totalPaginas(): number {
    return Math.ceil(this.filteredPedidos.length / this.itemsPorPagina()) || 1;
  }

  get paginatedPedidos(): Pedido[] {
    const startIndex = (this.paginaActual() - 1) * this.itemsPorPagina();
    return this.filteredPedidos.slice(startIndex, startIndex + this.itemsPorPagina());
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual.set(pagina);
    }
  }

  getRangoPaginas(): number[] {
    const total = this.totalPaginas;
    const current = this.paginaActual();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  getInicioItem(): number {
    if (this.filteredPedidos.length === 0) return 0;
    return (this.paginaActual() - 1) * this.itemsPorPagina() + 1;
  }

  getFinItem(): number {
    return Math.min(this.paginaActual() * this.itemsPorPagina(), this.filteredPedidos.length);
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
      this.abrirModalEnvio(pedido, nuevoEstado, 'Detalles de Envío', 'Confirmar y Enviar', true);
      return;
    }

    if (nuevoEstado === 'entregado') {
      this.abrirModalEntrega(pedido, true);
      return;
    }

    this.ejecutarActualizacion(pedidoId, nuevoEstado);
  }

  ejecutarActualizacion(
    pedidoId: number,
    nuevoEstado: string,
    extra?: {
      transportadora?: string;
      guia_numero?: string;
      evidencia_envio_url?: string;
      evidencia_entrega_url?: string;
      solicitud_cliente?: boolean;
    }
  ): void {
    this.updatingId.set(pedidoId);
    this.pedidoService.adminActualizarEstado(pedidoId, nuevoEstado, extra).subscribe({
      next: (res: any) => {
        const estadoFinal = (res?.data?.estado_nuevo || res?.estado_nuevo || nuevoEstado) as EstadoPedido;
        const fechaEntregaRes = res?.data?.fecha_entrega || res?.fecha_entrega || null;
        const pedidoActual = this.pedidos().find(p => p.id === pedidoId);
        const codigoPedido = res?.data?.codigo_pedido || res?.codigo_pedido || pedidoActual?.codigo_pedido || `#${pedidoId}`;
        const estadoLabel = this.getEstadoLabel(estadoFinal);

        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3800,
          timerProgressBar: true,
          customClass: {
            popup: 'plx-admin-toast'
          },
          html: `
            <div style="display:flex; align-items:flex-start; gap:12px; font-family:'Montserrat',-apple-system,BlinkMacSystemFont,sans-serif;">
              <div style="width:36px; height:36px; border-radius:10px; background:#f0fdf4; border:1px solid #bbf7d0; color:#16a34a; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                  <span style="font-size:0.86rem; font-weight:800; color:#09090b; letter-spacing:-0.01em;">
                    Estado actualizado
                  </span>
                  <span style="font-size:0.68rem; font-weight:700; color:#52525b; background:#f4f4f5; border:1px solid #e4e4e7; padding:2px 7px; border-radius:6px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
                    ${codigoPedido}
                  </span>
                </div>
                <div style="margin-top:6px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:0.78rem; color:#52525b;">
                  <span>Ahora está en</span>
                  <span style="display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:999px; background:#eaf4ec; border:1px solid rgba(55,144,69,0.28); color:#2c7337; font-weight:800; font-size:0.74rem;">
                    <span style="width:6px; height:6px; border-radius:50%; background:#16a34a;"></span>
                    ${estadoLabel}
                  </span>
                </div>
              </div>
              <button type="button" id="plx-toast-close-btn" aria-label="Cerrar aviso" style="background:transparent; border:none; color:#a1a1aa; cursor:pointer; padding:2px; line-height:1; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          `,
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
            const closeBtn = toast.querySelector('#plx-toast-close-btn');
            closeBtn?.addEventListener('click', () => Swal.close());
          }
        });
        
        // Update locally
        this.pedidos.update(list =>
          list.map(p => {
            if (p.id === pedidoId) {
              const updated = { 
                ...p, 
                estado: estadoFinal,
                fecha_actualizacion: new Date().toISOString()
              };
              if (extra?.guia_numero) updated.guia_numero = extra.guia_numero;
              if (extra?.transportadora) updated.transportadora = extra.transportadora;
              if (extra?.evidencia_envio_url) updated.evidencia_envio_url = extra.evidencia_envio_url;
              if (extra?.evidencia_entrega_url) updated.evidencia_entrega_url = extra.evidencia_entrega_url;
              if (estadoFinal === 'en_camino' && !updated.fecha_envio) {
                updated.fecha_envio = new Date().toISOString();
              }
              if (estadoFinal === 'entregado' && !updated.fecha_entrega) {
                updated.fecha_entrega = fechaEntregaRes || new Date().toISOString();
              }
              if (this.selectedPedido()?.id === pedidoId) {
                this.selectedPedido.set(updated);
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

  eliminarPedidoComoAdmin(pedido: Pedido): void {
    if (!['pendiente_pago', 'pendiente'].includes(pedido.estado)) {
      Swal.fire('Acción no permitida', 'Solo puedes eliminar pedidos pendientes de confirmación de pago.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Eliminar pedido',
      html: `Escribe <strong>eliminar</strong> para borrar permanentemente el pedido <strong>${pedido.codigo_pedido}</strong>.<br><span style="font-size: 0.84rem; color: #71717a; margin-top: 8px; display: inline-block;">Esta acción es irreversible y no se puede deshacer.</span>`,
      input: 'text',
      inputPlaceholder: 'eliminar',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar pedido',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'swal-danger-modal',
        confirmButton: 'swal-danger-btn',
        cancelButton: 'swal-cancel-btn',
        input: 'swal-danger-input'
      },
      inputValidator: (value) => value.trim().toLowerCase() !== 'eliminar'
        ? 'Debes escribir exactamente "eliminar".'
        : undefined,
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.updatingId.set(pedido.id);
      this.pedidoService.adminEliminarPedido(pedido.id, result.value).subscribe({
        next: () => {
          this.selectedPedido.set(null);
          this.updatingId.set(null);
          Swal.fire('Pedido eliminado', 'El pedido pendiente fue eliminado correctamente.', 'success');
          this.cargarPedidos();
        },
        error: (err) => {
          this.updatingId.set(null);
          Swal.fire('No se pudo eliminar', err.error?.error || 'El pedido no puede ser eliminado.', 'error');
        }
      });
    });
  }

  editarDatosEnvio(pedido: Pedido): void {
    const estadoObjetivo = ['pagado', 'confirmado', 'en_preparacion'].includes(pedido.estado)
      ? 'en_camino'
      : pedido.estado;
    const textoBoton = estadoObjetivo === 'en_camino' && pedido.estado !== 'en_camino'
      ? 'Guardar y Marcar En Camino'
      : 'Guardar Cambios';
    this.abrirModalEnvio(pedido, estadoObjetivo, 'Asignar / Editar Detalles de Envío', textoBoton, false);
  }

  marcarComoEntregado(pedido: Pedido): void {
    this.abrirModalEntrega(pedido, false);
  }

  private abrirModalEntrega(pedido: Pedido, recargarAlCancelar: boolean): void {
    const tieneEvidenciaPrevia = !!pedido.evidencia_entrega_url;

    Swal.fire({
      width: 520,
      padding: '24px 26px',
      background: '#ffffff',
      title: '',
      html: `
        <div style="text-align: left; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; color: #09090b;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f4f4f5;">
            <div style="width:40px; height:40px; border-radius:12px; background:#16a34a; color:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div>
              <span style="display:block; font-size:0.68rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#16a34a;">
                Confirmación de Entrega &bull; ${pedido.codigo_pedido}
              </span>
              <h2 style="margin:2px 0 0 0; font-size:1.12rem; font-weight:800; color:#09090b; letter-spacing:-0.01em;">
                Marcar Pedido como Entregado
              </h2>
            </div>
          </div>

          <p style="margin:0 0 14px 0; font-size:0.84rem; color:#52525b; line-height:1.5;">
            Para confirmar que el cliente recibió su pedido, adjunta obligatoriamente la <strong>foto de evidencia de la entrega</strong> (guía firmada, recibido o foto en domicilio).
          </p>

          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
              <label style="font-weight:700; font-size:0.8rem; color:#3f3f46; text-transform:uppercase; letter-spacing:0.04em;">
                Evidencia Fotográfica de Entrega <span style="color:#ef4444;">*</span>
              </label>
              <span style="font-size:0.7rem; font-weight:700; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; padding:2px 8px; border-radius:999px;">
                Obligatoria · Visible al cliente
              </span>
            </div>

            <input id="swal-entrega-file" type="file" accept="image/jpeg,image/png,image/webp" style="display:none;" />

            <!-- Dropzone vacía -->
            <div id="swal-entrega-dropzone" style="display: ${tieneEvidenciaPrevia ? 'none' : 'flex'}; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px 16px; border:2px dashed #86efac; border-radius:14px; background:#f0fdf4; cursor:pointer; transition:all 0.2s ease;">
              <div style="width:46px; height:46px; border-radius:12px; background:#ffffff; color:#16a34a; display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid #bbf7d0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <span style="font-size:0.88rem; font-weight:700; color:#14532d;">
                Haz clic o arrastra la foto de entrega aquí
              </span>
              <span style="font-size:0.74rem; color:#15803d; margin-top:4px;">
                JPG, PNG o WEBP (máx. 5 MB)
              </span>
            </div>

            <!-- Tarjeta de vista previa -->
            <div id="swal-entrega-preview-card" style="display: ${tieneEvidenciaPrevia ? 'block' : 'none'}; border:1.5px solid #bbf7d0; border-radius:14px; overflow:hidden; background:#fafafa;">
              <div style="position:relative; background:#09090b; display:flex; align-items:center; justify-content:center; height:170px; overflow:hidden;">
                <img id="swal-entrega-preview" src="${pedido.evidencia_entrega_url || ''}" alt="Evidencia de entrega" style="max-height:100%; max-width:100%; object-fit:contain;" />
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:#ffffff; border-top:1px solid #f4f4f5;">
                <div style="min-width:0;">
                  <span id="swal-entrega-file-name" style="display:block; font-size:0.78rem; font-weight:700; color:#18181b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${tieneEvidenciaPrevia ? 'Evidencia de entrega cargada en Cloudinary' : ''}
                  </span>
                  <span id="swal-entrega-file-meta" style="display:block; font-size:0.7rem; color:#16a34a; font-weight:600;">
                    ${tieneEvidenciaPrevia ? 'Lista y visible para el cliente' : ''}
                  </span>
                </div>
                <div style="display:flex; gap:6px; flex-shrink:0;">
                  <button type="button" id="swal-entrega-btn-change" style="padding:6px 10px; border-radius:8px; border:1px solid #d4d4d8; background:#ffffff; color:#18181b; font-size:0.74rem; font-weight:700; cursor:pointer; font-family:inherit;">
                    Cambiar foto
                  </button>
                  <button type="button" id="swal-entrega-btn-clear" style="display:${tieneEvidenciaPrevia ? 'none' : 'inline-block'}; padding:6px 9px; border-radius:8px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; font-size:0.74rem; font-weight:700; cursor:pointer; font-family:inherit;">
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar Entrega',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#f4f4f5',
      customClass: {
        confirmButton: 'swal-plx-confirm',
        cancelButton: 'swal-plx-cancel',
      },
      didOpen: () => {
        const fileInput = document.getElementById('swal-entrega-file') as HTMLInputElement | null;
        const dropzone = document.getElementById('swal-entrega-dropzone');
        const previewCard = document.getElementById('swal-entrega-preview-card');
        const previewImg = document.getElementById('swal-entrega-preview') as HTMLImageElement | null;
        const fileNameEl = document.getElementById('swal-entrega-file-name');
        const fileMetaEl = document.getElementById('swal-entrega-file-meta');
        const btnChange = document.getElementById('swal-entrega-btn-change');
        const btnClear = document.getElementById('swal-entrega-btn-clear');

        const confirmBtn = Swal.getConfirmButton();
        const cancelBtn = Swal.getCancelButton();
        if (confirmBtn) {
          confirmBtn.style.borderRadius = '10px';
          confirmBtn.style.padding = '11px 22px';
          confirmBtn.style.fontWeight = '700';
          confirmBtn.style.fontSize = '0.86rem';
        }
        if (cancelBtn) {
          cancelBtn.style.borderRadius = '10px';
          cancelBtn.style.padding = '11px 18px';
          cancelBtn.style.fontWeight = '700';
          cancelBtn.style.fontSize = '0.86rem';
          cancelBtn.style.color = '#3f3f46';
        }

        (window as any).__plxEntregaFile = null;

        const applyFile = (file: File | null) => {
          if (!file) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            Swal.showValidationMessage('Formato no válido. Usa JPG, PNG o WEBP.');
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            Swal.showValidationMessage('La imagen no puede superar los 5 MB.');
            return;
          }
          Swal.resetValidationMessage();
          (window as any).__plxEntregaFile = file;

          const reader = new FileReader();
          reader.onload = () => {
            if (previewImg) previewImg.src = String(reader.result || '');
            if (fileNameEl) fileNameEl.textContent = file.name;
            if (fileMetaEl) {
              const sizeKb = file.size >= 1024 * 1024
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : `${Math.max(1, Math.round(file.size / 1024))} KB`;
              fileMetaEl.textContent = `Foto lista para subir (${sizeKb})`;
            }
            if (dropzone) dropzone.style.display = 'none';
            if (previewCard) previewCard.style.display = 'block';
            if (btnClear) btnClear.style.display = 'inline-block';
          };
          reader.readAsDataURL(file);
        };

        dropzone?.addEventListener('click', () => fileInput?.click());
        btnChange?.addEventListener('click', () => fileInput?.click());

        btnClear?.addEventListener('click', () => {
          (window as any).__plxEntregaFile = null;
          if (fileInput) fileInput.value = '';
          if (tieneEvidenciaPrevia && pedido.evidencia_entrega_url) {
            if (previewImg) previewImg.src = pedido.evidencia_entrega_url;
            if (fileNameEl) fileNameEl.textContent = 'Evidencia de entrega cargada en Cloudinary';
            if (fileMetaEl) fileMetaEl.textContent = 'Lista y visible para el cliente';
            if (btnClear) btnClear.style.display = 'none';
          } else {
            if (previewCard) previewCard.style.display = 'none';
            if (dropzone) dropzone.style.display = 'flex';
          }
        });

        fileInput?.addEventListener('change', () => {
          applyFile(fileInput.files?.[0] || null);
        });

        ['dragenter', 'dragover'].forEach((evt) => {
          dropzone?.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropzone) {
              dropzone.style.borderColor = '#16a34a';
              dropzone.style.background = '#dcfce7';
            }
          });
        });

        ['dragleave', 'drop'].forEach((evt) => {
          dropzone?.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropzone) {
              dropzone.style.borderColor = '#86efac';
              dropzone.style.background = '#f0fdf4';
            }
          });
        });

        dropzone?.addEventListener('drop', (e: DragEvent) => {
          const dropped = e.dataTransfer?.files?.[0] || null;
          applyFile(dropped);
        });
      },
      preConfirm: () => {
        const fileInput = document.getElementById('swal-entrega-file') as HTMLInputElement | null;
        const archivo: File | null = (window as any).__plxEntregaFile || fileInput?.files?.[0] || null;

        if (!archivo && !pedido.evidencia_entrega_url) {
          Swal.showValidationMessage('Debes adjuntar una foto de evidencia de la entrega para marcar el pedido como entregado.');
          return false;
        }
        return { archivo };
      }
    }).then((result) => {
      (window as any).__plxEntregaFile = null;
      if (!result.isConfirmed) {
        if (recargarAlCancelar) {
          this.cargarPedidos();
        }
        return;
      }

      const { archivo } = result.value as { archivo: File | null };

      if (archivo) {
        this.updatingId.set(pedido.id);
        this.pedidoService.adminSubirEvidenciaEntrega(pedido.id, archivo).subscribe({
          next: (uploadRes: any) => {
            const urlSubida = uploadRes?.data?.evidencia_entrega_url || uploadRes?.evidencia_entrega_url;
            this.ejecutarActualizacion(pedido.id, 'entregado', {
              evidencia_entrega_url: urlSubida || undefined,
            });
          },
          error: (err) => {
            this.updatingId.set(null);
            Swal.fire(
              'Error subiendo evidencia',
              err?.error?.error || err?.error?.message || 'No se pudo subir la foto de evidencia de entrega a Cloudinary.',
              'error'
            );
            if (recargarAlCancelar) {
              this.cargarPedidos();
            }
          }
        });
      } else {
        this.ejecutarActualizacion(pedido.id, 'entregado', {
          evidencia_entrega_url: pedido.evidencia_entrega_url || undefined,
        });
      }
    });
  }

  private abrirModalEnvio(
    pedido: Pedido,
    nuevoEstado: string,
    titulo: string,
    textoConfirmar: string,
    recargarAlCancelar: boolean
  ): void {
    const actual = (pedido.transportadora || '').trim();
    const esPersonalizada = actual !== '' && !this.transportadorasOpciones.includes(actual);
    const valorSelectInicial = esPersonalizada ? '__OTRA__' : actual;

    const optionsHtml = [
      `<option value="" ${valorSelectInicial === '' ? 'selected' : ''}>Selecciona una transportadora...</option>`,
      ...this.transportadorasOpciones.map(
        (t) => `<option value="${t}" ${valorSelectInicial === t ? 'selected' : ''}>${t}</option>`
      ),
      `<option value="__OTRA__" ${esPersonalizada ? 'selected' : ''}>Otra (escribir manualmente)</option>`,
    ].join('');

    const tieneEvidenciaPrevia = !!pedido.evidencia_envio_url;

    Swal.fire({
      width: 540,
      padding: '24px 26px',
      background: '#ffffff',
      title: '',
      html: `
        <div style="text-align: left; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; color: #09090b;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f4f4f5;">
            <div style="width:40px; height:40px; border-radius:12px; background:#09090b; color:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
            <div>
              <span style="display:block; font-size:0.68rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#16a34a;">
                Logística &amp; Despacho &bull; ${pedido.codigo_pedido}
              </span>
              <h2 style="margin:2px 0 0 0; font-size:1.12rem; font-weight:800; color:#09090b; letter-spacing:-0.01em;">
                ${titulo}
              </h2>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-weight:700; font-size:0.8rem; color:#3f3f46; text-transform:uppercase; letter-spacing:0.04em;">
              Empresa Transportadora <span style="color:#ef4444;">*</span>
            </label>
            <select id="swal-transportadora-select" style="width:100%; height:44px; padding:0 12px; border:1.5px solid #e4e4e7; border-radius:10px; background:#ffffff; color:#09090b; font-size:0.9rem; font-weight:600; font-family:inherit; outline:none; cursor:pointer; box-sizing:border-box;">
              ${optionsHtml}
            </select>
          </div>

          <div id="swal-otra-wrap" style="display: ${esPersonalizada ? 'block' : 'none'}; margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-weight:700; font-size:0.78rem; color:#52525b;">
              Nombre de la transportadora personalizada <span style="color:#ef4444;">*</span>
            </label>
            <input id="swal-transportadora-otra" type="text" style="width:100%; height:42px; padding:0 12px; border:1.5px solid #16a34a; border-radius:10px; background:#f0fdf4; color:#09090b; font-size:0.9rem; font-weight:600; font-family:inherit; outline:none; box-sizing:border-box;" placeholder="Ej: Mensajería Express, Rápido Ochoa..." value="${esPersonalizada ? actual : ''}">
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display:block; margin-bottom: 6px; font-weight:700; font-size:0.8rem; color:#3f3f46; text-transform:uppercase; letter-spacing:0.04em;">
              Número de Guía <span style="color:#ef4444;">*</span>
            </label>
            <input id="swal-guia" type="text" style="width:100%; height:44px; padding:0 12px; border:1.5px solid #e4e4e7; border-radius:10px; background:#ffffff; color:#09090b; font-size:0.92rem; font-weight:700; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; outline:none; box-sizing:border-box;" placeholder="Ej: 987654321" value="${pedido.guia_numero || ''}">
          </div>

          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
              <label style="font-weight:700; font-size:0.8rem; color:#3f3f46; text-transform:uppercase; letter-spacing:0.04em;">
                Evidencia Fotográfica del Envío
              </label>
              <span style="font-size:0.7rem; font-weight:700; color:#16a34a; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 8px; border-radius:999px;">
                Opcional · Visible al cliente
              </span>
            </div>

            <input id="swal-evidencia-file" type="file" accept="image/jpeg,image/png,image/webp" style="display:none;" />

            <!-- Dropzone vacía -->
            <div id="swal-dropzone" style="display: ${tieneEvidenciaPrevia ? 'none' : 'flex'}; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:22px 16px; border:2px dashed #d4d4d8; border-radius:14px; background:#fafafa; cursor:pointer; transition:all 0.2s ease;">
              <div style="width:44px; height:44px; border-radius:12px; background:#f0fdf4; color:#16a34a; display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid #bbf7d0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <span style="font-size:0.86rem; font-weight:700; color:#18181b;">
                Haz clic o arrastra una foto aquí
              </span>
              <span style="font-size:0.74rem; color:#71717a; margin-top:4px;">
                Foto del paquete o guía física · JPG, PNG o WEBP (máx. 5 MB)
              </span>
            </div>

            <!-- Tarjeta de vista previa -->
            <div id="swal-preview-card" style="display: ${tieneEvidenciaPrevia ? 'block' : 'none'}; border:1.5px solid #e4e4e7; border-radius:14px; overflow:hidden; background:#fafafa;">
              <div style="position:relative; background:#09090b; display:flex; align-items:center; justify-content:center; height:155px; overflow:hidden;">
                <img id="swal-evidencia-preview" src="${pedido.evidencia_envio_url || ''}" alt="Evidencia de envío" style="max-height:100%; max-width:100%; object-fit:contain;" />
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:#ffffff; border-top:1px solid #f4f4f5;">
                <div style="min-width:0;">
                  <span id="swal-file-name" style="display:block; font-size:0.78rem; font-weight:700; color:#18181b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${tieneEvidenciaPrevia ? 'Evidencia cargada en Cloudinary' : ''}
                  </span>
                  <span id="swal-file-meta" style="display:block; font-size:0.7rem; color:#16a34a; font-weight:600;">
                    ${tieneEvidenciaPrevia ? 'Lista y visible para el cliente' : ''}
                  </span>
                </div>
                <div style="display:flex; gap:6px; flex-shrink:0;">
                  <button type="button" id="swal-btn-change-photo" style="padding:6px 10px; border-radius:8px; border:1px solid #d4d4d8; background:#ffffff; color:#18181b; font-size:0.74rem; font-weight:700; cursor:pointer; font-family:inherit;">
                    Cambiar foto
                  </button>
                  <button type="button" id="swal-btn-clear-photo" style="display:${tieneEvidenciaPrevia ? 'none' : 'inline-block'}; padding:6px 9px; border-radius:8px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; font-size:0.74rem; font-weight:700; cursor:pointer; font-family:inherit;">
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#09090b',
      cancelButtonColor: '#f4f4f5',
      didOpen: () => {
        const cancelBtn = Swal.getCancelButton();
        if (cancelBtn) {
          cancelBtn.style.color = '#18181b';
          cancelBtn.style.border = '1px solid #e4e4e7';
        }

        const selectEl = document.getElementById('swal-transportadora-select') as HTMLSelectElement | null;
        const otraWrap = document.getElementById('swal-otra-wrap') as HTMLDivElement | null;
        const otraInput = document.getElementById('swal-transportadora-otra') as HTMLInputElement | null;
        const fileInput = document.getElementById('swal-evidencia-file') as HTMLInputElement | null;
        const dropzone = document.getElementById('swal-dropzone') as HTMLDivElement | null;
        const previewCard = document.getElementById('swal-preview-card') as HTMLDivElement | null;
        const previewImg = document.getElementById('swal-evidencia-preview') as HTMLImageElement | null;
        const fileNameEl = document.getElementById('swal-file-name') as HTMLSpanElement | null;
        const fileMetaEl = document.getElementById('swal-file-meta') as HTMLSpanElement | null;
        const btnChange = document.getElementById('swal-btn-change-photo') as HTMLButtonElement | null;
        const btnClear = document.getElementById('swal-btn-clear-photo') as HTMLButtonElement | null;

        let selectedFile: File | null = null;
        (window as any).__plxEvidenciaFile = null;

        const applyFile = (file: File | null) => {
          if (!file) return;
          const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!validTypes.includes(file.type)) {
            Swal.showValidationMessage('Formato no válido. Usa JPG, PNG o WEBP.');
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            Swal.showValidationMessage('La foto no puede superar los 5 MB.');
            return;
          }

          Swal.resetValidationMessage();
          selectedFile = file;
          (window as any).__plxEvidenciaFile = file;

          const reader = new FileReader();
          reader.onload = () => {
            if (previewImg) previewImg.src = String(reader.result || '');
            if (fileNameEl) fileNameEl.textContent = file.name;
            if (fileMetaEl) {
              const sizeKb = file.size < 1024 * 1024
                ? `${Math.round(file.size / 1024)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
              fileMetaEl.textContent = `Nueva foto lista para subir (${sizeKb})`;
            }
            if (dropzone) dropzone.style.display = 'none';
            if (previewCard) previewCard.style.display = 'block';
            if (btnClear) btnClear.style.display = 'inline-block';
          };
          reader.readAsDataURL(file);
        };

        selectEl?.addEventListener('change', () => {
          const isOtra = selectEl.value === '__OTRA__';
          if (otraWrap) otraWrap.style.display = isOtra ? 'block' : 'none';
          if (isOtra && otraInput) otraInput.focus();
        });

        dropzone?.addEventListener('click', () => fileInput?.click());
        btnChange?.addEventListener('click', () => fileInput?.click());

        btnClear?.addEventListener('click', () => {
          selectedFile = null;
          (window as any).__plxEvidenciaFile = null;
          if (fileInput) fileInput.value = '';
          if (tieneEvidenciaPrevia && pedido.evidencia_envio_url) {
            if (previewImg) previewImg.src = pedido.evidencia_envio_url;
            if (fileNameEl) fileNameEl.textContent = 'Evidencia cargada en Cloudinary';
            if (fileMetaEl) fileMetaEl.textContent = 'Lista y visible para el cliente';
            if (btnClear) btnClear.style.display = 'none';
          } else {
            if (previewCard) previewCard.style.display = 'none';
            if (dropzone) dropzone.style.display = 'flex';
          }
        });

        fileInput?.addEventListener('change', () => {
          applyFile(fileInput.files?.[0] || null);
        });

        ['dragenter', 'dragover'].forEach((evt) => {
          dropzone?.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropzone) {
              dropzone.style.borderColor = '#16a34a';
              dropzone.style.background = '#f0fdf4';
            }
          });
        });

        ['dragleave', 'drop'].forEach((evt) => {
          dropzone?.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropzone) {
              dropzone.style.borderColor = '#d4d4d8';
              dropzone.style.background = '#fafafa';
            }
          });
        });

        dropzone?.addEventListener('drop', (e: DragEvent) => {
          const dropped = e.dataTransfer?.files?.[0] || null;
          applyFile(dropped);
        });
      },
      preConfirm: () => {
        const selectVal = (document.getElementById('swal-transportadora-select') as HTMLSelectElement)?.value || '';
        const otraVal = ((document.getElementById('swal-transportadora-otra') as HTMLInputElement)?.value || '').trim();
        const guia = ((document.getElementById('swal-guia') as HTMLInputElement)?.value || '').trim();
        const fileInput = document.getElementById('swal-evidencia-file') as HTMLInputElement | null;
        const archivo: File | null = (window as any).__plxEvidenciaFile || fileInput?.files?.[0] || null;

        const transportadora = selectVal === '__OTRA__' ? otraVal : selectVal.trim();

        if (!transportadora) {
          Swal.showValidationMessage('Selecciona una empresa transportadora o escríbela en la opción "Otra".');
          return false;
        }
        if (!guia) {
          Swal.showValidationMessage('El número de guía es obligatorio.');
          return false;
        }
        if (archivo && archivo.size > 5 * 1024 * 1024) {
          Swal.showValidationMessage('La foto de evidencia no puede superar los 5 MB.');
          return false;
        }

        delete (window as any).__plxEvidenciaFile;
        return { transportadora, guia, archivo };
      }
    }).then((result) => {
      delete (window as any).__plxEvidenciaFile;
      if (!result.isConfirmed) {
        if (recargarAlCancelar) this.cargarPedidos();
        return;
      }

      const { transportadora, guia, archivo } = result.value as {
        transportadora: string;
        guia: string;
        archivo: File | null;
      };

      if (archivo) {
        this.updatingId.set(pedido.id);
        this.pedidoService.adminSubirEvidenciaEnvio(pedido.id, archivo).subscribe({
          next: (uploadRes: any) => {
            const evidenciaUrl = uploadRes?.data?.evidencia_envio_url || uploadRes?.evidencia_envio_url;
            this.ejecutarActualizacion(pedido.id, nuevoEstado, {
              transportadora,
              guia_numero: guia,
              ...(evidenciaUrl ? { evidencia_envio_url: evidenciaUrl } : {}),
            });
          },
          error: (err) => {
            this.updatingId.set(null);
            Swal.fire(
              'Error subiendo foto',
              err?.error?.message || err?.error?.error || 'No se pudo subir la foto de evidencia a Cloudinary.',
              'error'
            );
          },
        });
      } else {
        this.ejecutarActualizacion(pedido.id, nuevoEstado, {
          transportadora,
          guia_numero: guia,
        });
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
    return `$ ${Math.round(price || 0).toLocaleString('es-CO')}`;
  }

  getSubtotalReal(pedido: Pedido): number {
    if (pedido.subtotal !== undefined && pedido.subtotal !== null && Number(pedido.subtotal) > 0) {
      return Number(pedido.subtotal);
    }
    const sumaItems = (pedido.detalles || []).reduce(
      (acc, it) => acc + Number(it.subtotal || (it.precio_unitario * it.cantidad) || 0),
      0
    );
    return sumaItems > 0 ? sumaItems : Number(pedido.total || 0);
  }

  getCostoEnvioReal(pedido: Pedido): number {
    if (pedido.costo_envio !== undefined && pedido.costo_envio !== null) {
      return Math.max(0, Number(pedido.costo_envio));
    }
    const diff = Number(pedido.total || 0) - this.getSubtotalReal(pedido) - Number(pedido.iva || 0);
    return diff > 0 ? diff : 0;
  }

  formatMetodoPago(metodo?: string | null): string {
    const m = (metodo || '').toLowerCase();
    if (m === 'wompi') return 'Pago online (Wompi)';
    if (m === 'asesor') return 'Asesor comercial (WhatsApp)';
    if (m === 'transferencia') return 'Transferencia bancaria';
    if (m === 'contraentrega') return 'Pago contraentrega';
    return metodo || 'No especificado';
  }

  getEstadoLabel(estado: string): string {
    return ESTADOS_PEDIDO.find(e => e.key === estado)?.label || estado;
  }

  get pedidosActivosCount(): number {
    return this.pedidos().filter(p => ['pendiente', 'pagado', 'confirmado', 'en_preparacion'].includes(p.estado)).length;
  }

  filtrarPorEstado(estado: string): void {
    this.filtroEstado.set(estado);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('todos');
    this.filtroFecha.set('todos');
    this.fechaPersonalizada.set('');
    this.searchTerm.set('');
  }

  verDetalle(pedido: Pedido): void {
    this.selectedPedido.set(pedido);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverALista(): void {
    this.selectedPedido.set(null);
  }

  imprimirDetalle(): void {
    window.print();
  }

  getStepState(stepIndex: number, estado: string): 'completed' | 'active' | 'pending' {
    if (estado === 'cancelado') return 'pending';
    const estadoOrder: Record<string, number> = {
      'pendiente_pago': 1,
      'pendiente': 1,
      'pagado': 2,
      'confirmado': 2,
      'en_preparacion': 3,
      'en_camino': 4,
      'entregado': 5
    };
    const currentLevel = estadoOrder[estado] ?? 0;
    if (currentLevel > stepIndex) return 'completed';
    if (currentLevel === stepIndex) return 'active';
    return 'pending';
  }
}
