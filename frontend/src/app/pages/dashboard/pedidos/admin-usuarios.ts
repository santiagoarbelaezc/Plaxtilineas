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
  faUser,
  faShoppingBag,
  faEye,
  faTrash
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
  faUser = faUser;
  faShoppingBag = faShoppingBag;
  faEye = faEye;
  faTrash = faTrash;

  // Estado del modal de eliminar
  usuarioAEliminar = signal<UsuarioDetalle | null>(null);
  textoConfirmacion = signal('');
  isDeleting = signal(false);

  usuarios = signal<UsuarioDetalle[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  expandedUserId = signal<number | null>(null);

  // Métricas computadas
  totalUsuarios = computed(() => this.usuarios().length);
  carritosActivos = computed(() => this.usuarios().filter(u => u.carrito.length > 0).length);
  totalVentas = computed(() => this.usuarios().reduce((acc, u) => acc + (u.total_compras || 0), 0));
  totalPedidos = computed(() => this.usuarios().reduce((acc, u) => acc + (u.cantidad_pedidos || 0), 0));

  get filteredUsuarios(): UsuarioDetalle[] {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) return this.usuarios();
    return this.usuarios().filter(u =>
      u.nombre.toLowerCase().includes(search) ||
      u.apellidos.toLowerCase().includes(search) ||
      u.correo.toLowerCase().includes(search) ||
      (u.ciudad && u.ciudad.toLowerCase().includes(search))
    );
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
      case 'pendiente': return '#f59e0b';
      case 'cancelado': return '#ef4444';
      default: return '#3b82f6';
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
        this.cargarUsuarios(); // Recargar la lista después de borrar
      },
      error: (err) => {
        this.isDeleting.set(false);
        alert(err.error?.error || 'Error al eliminar usuario');
      }
    });
  }
}
