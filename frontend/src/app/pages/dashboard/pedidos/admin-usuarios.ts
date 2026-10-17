import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsuariosService, UsuarioDetalle } from '../../../services/admin-usuarios.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faUsers, 
  faShoppingCart, 
  faDollarSign, 
  faClipboardList, 
  faSync, 
  faSearch, 
  faMapMarkerAlt, 
  faChevronDown, 
  faChevronUp, 
  faChevronLeft,
  faChevronRight,
  faUser,
  faShoppingBag,
  faEye,
  faTrash,
  faClock,
  faCheckCircle,
  faBoxOpen,
  faExclamationTriangle,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './admin-usuarios.html',
  styleUrls: ['./admin-usuarios.css'],
})
export class AdminUsuarios implements OnInit {
  private adminUsuariosService = inject(AdminUsuariosService);

  // Iconos Font Awesome
  faUsers = faUsers;
  faShoppingCart = faShoppingCart;
  faDollarSign = faDollarSign;
  faClipboardList = faClipboardList;
  faSync = faSync;
  faSearch = faSearch;
  faMapMarkerAlt = faMapMarkerAlt;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faUser = faUser;
  faShoppingBag = faShoppingBag;
  faEye = faEye;
  faTrash = faTrash;
  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faBoxOpen = faBoxOpen;
  faExclamationTriangle = faExclamationTriangle;
  faArrowRight = faArrowRight;

  // Estado del modal de eliminar
  usuarioAEliminar = signal<UsuarioDetalle | null>(null);
  textoConfirmacion = signal('');
  isDeleting = signal(false);

  usuarios = signal<UsuarioDetalle[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  filtroTipo = signal<'todos' | 'con_pedidos' | 'con_carrito' | 'sin_actividad'>('todos');
  paginaActual = signal<number>(1);
  itemsPorPagina = signal<number>(6);
  expandedUserId = signal<number | null>(null);

  // Métricas computadas
  totalUsuarios = computed(() => this.usuarios().length);
  carritosActivos = computed(() => this.usuarios().filter(u => u.carrito && u.carrito.length > 0).length);
  totalVentas = computed(() => this.usuarios().reduce((acc, u) => acc + (u.total_compras || 0), 0));
  totalPedidos = computed(() => this.usuarios().reduce((acc, u) => acc + (u.cantidad_pedidos || 0), 0));

  get filteredUsuarios(): UsuarioDetalle[] {
    let result = this.usuarios();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      result = result.filter(u =>
        (u.nombre && u.nombre.toLowerCase().includes(search)) ||
        (u.apellidos && u.apellidos.toLowerCase().includes(search)) ||
        (u.correo && u.correo.toLowerCase().includes(search)) ||
        (u.ciudad && u.ciudad.toLowerCase().includes(search))
      );
    }
    const tipo = this.filtroTipo();
    if (tipo === 'con_pedidos') {
      result = result.filter(u => (u.cantidad_pedidos || 0) > 0);
    } else if (tipo === 'con_carrito') {
      result = result.filter(u => u.carrito && u.carrito.length > 0);
    } else if (tipo === 'sin_actividad') {
      result = result.filter(u => (!u.cantidad_pedidos || u.cantidad_pedidos === 0) && (!u.carrito || u.carrito.length === 0));
    }
    return result;
  }

  get totalPaginas(): number {
    return Math.ceil(this.filteredUsuarios.length / this.itemsPorPagina()) || 1;
  }

  get paginatedUsuarios(): UsuarioDetalle[] {
    const startIndex = (this.paginaActual() - 1) * this.itemsPorPagina();
    return this.filteredUsuarios.slice(startIndex, startIndex + this.itemsPorPagina());
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.adminUsuariosService.obtenerUsuariosDetalle().subscribe({
      next: (res) => {
        this.usuarios.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar usuarios detallados:', err);
        this.loading.set(false);
      }
    });
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
    if (this.filteredUsuarios.length === 0) return 0;
    return (this.paginaActual() - 1) * this.itemsPorPagina() + 1;
  }

  getFinItem(): number {
    return Math.min(this.paginaActual() * this.itemsPorPagina(), this.filteredUsuarios.length);
  }

  filtrarPorTipo(tipo: 'todos' | 'con_pedidos' | 'con_carrito' | 'sin_actividad'): void {
    this.filtroTipo.set(tipo);
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.filtroTipo.set('todos');
    this.searchTerm.set('');
    this.paginaActual.set(1);
  }

  toggleExpand(id: number): void {
    this.expandedUserId.set(this.expandedUserId() === id ? null : id);
  }

  formatPrice(price: number): string {
    return `$ ${Math.round(price).toLocaleString('es-CO')}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'entregado': return '#10b981';
      case 'confirmado':
      case 'pagado': return '#3b82f6';
      case 'en_preparacion': return '#8b5cf6';
      case 'en_camino': return '#06b6d4';
      case 'pendiente': 
      case 'pendiente_pago': return '#f59e0b';
      case 'cancelado': return '#ef4444';
      default: return '#71717a';
    }
  }

  // --- Modal de Eliminar ---

  abrirModalEliminar(u: UsuarioDetalle) {
    this.usuarioAEliminar.set(u);
    this.textoConfirmacion.set('');
  }

  cerrarModalEliminar() {
    this.usuarioAEliminar.set(null);
    this.textoConfirmacion.set('');
  }

  confirmarEliminacion() {
    const user = this.usuarioAEliminar();
    if (!user) return;
    if (this.textoConfirmacion().trim().toLowerCase() !== 'eliminar') {
      return;
    }
    
    this.isDeleting.set(true);
    this.adminUsuariosService.eliminarUsuario(user.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.cerrarModalEliminar();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.isDeleting.set(false);
        alert(err.error?.error || 'Error al eliminar usuario');
      }
    });
  }
}
