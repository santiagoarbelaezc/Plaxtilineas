import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import Swal from 'sweetalert2';
import { ThemeService, Theme } from '../../../services/theme.service';
import { AuthService } from '../../../services/auth.service';
import { ProductosService } from '../../../services/productos.service';
import { PedidoService } from '../../../services/pedido.service';
import { AdminUsuariosService } from '../../../services/admin-usuarios.service';
import { ConfiguracionService } from '../../../services/configuracion.service';
import { PqrService } from '../../../services/pqr.service';
import { DashboardAssistantComponent } from '../dashboard-assistant/dashboard-assistant.component';
import {
  faBoxes,
  faFolderOpen,
  faFolder,
  faSignOutAlt,
  faUserShield,
  faHome,
  faBolt,
  faWarehouse,
  faClipboardList,
  faDownload,
  faEye,
  faChartBar,
  faArrowRight,
  faArrowLeft,
  faChartLine,
  faPaintBrush,
  faChartPie,
  faFileAlt,
  faShoppingCart,
  faSun,
  faMoon,
  faCheckCircle,
  faExclamationTriangle,
  faCubes,
  faDollarSign,
  faSearch
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule, FontAwesomeModule, DashboardAssistantComponent],
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.css']
})
export class DashboardViewComponent implements OnInit, OnDestroy {
  private pollingInterval: any;
  private maxOrderId = 0;
  private isFirstLoad = true;
  // Definir las propiedades públicas para los iconos
  faBoxes = faBoxes;
  faFolderOpen = faFolderOpen;
  faFolder = faFolder;
  faSignOutAlt = faSignOutAlt;
  faUserShield = faUserShield;
  faHome = faHome;
  faBolt = faBolt;
  faWarehouse = faWarehouse;      // Icono para Inventario
  faClipboardList = faClipboardList; // Icono para PQR
  faDownload = faDownload;
  faEye = faEye;
  faChartBar = faChartBar;
  faArrowRight = faArrowRight;
  faArrowLeft = faArrowLeft;
  faChartLine = faChartLine;
  faPaintBrush = faPaintBrush;
  faChartPie = faChartPie;
  faFileAlt = faFileAlt;
  faShoppingCart = faShoppingCart;
  faSun = faSun;
  faMoon = faMoon;
  faCheckCircle = faCheckCircle;
  faExclamationTriangle = faExclamationTriangle;
  faCubes = faCubes;
  faDollarSign = faDollarSign;
  faSearch = faSearch;

  // Estados del Buscador Inteligente IA
  searchQuery = '';
  isSearching = false;
  searchResults: any = null;
  searchType: 'stock' | 'ventas' | 'redireccion' | 'nombre' | null = null;

  isMobileSidebarOpen = false;
  isSidebarCollapsed = false;

  wompiEnabled = true;
  mostrarDetallesWompi = false;

  toggleDetallesWompi(): void {
    this.mostrarDetallesWompi = !this.mostrarDetallesWompi;
  }

  // Métricas del Dashboard (Stat Cards)
  totalProductosCount = 0;
  totalPedidosCount = 0;
  pedidosPendientesCount = 0;
  totalUsuariosCount = 0;
  totalPqrsCount = 0;
  cargandoMetricas = false;

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    try {
      localStorage.setItem('admin_sidebar_collapsed', this.isSidebarCollapsed ? 'true' : 'false');
    } catch (e) {
      // Ignorar restricciones de almacenamiento local
    }
  }

  abrirMateoIA(): void {
    const assistantBtn = document.querySelector('.dashboard-assistant-button, .assistant-fab, .floating-ai-button, .ai-assistant-btn, app-dashboard-assistant button') as HTMLElement;
    if (assistantBtn) {
      assistantBtn.click();
    }
  }

  constructor(
    private router: Router,
    library: FaIconLibrary,
    public themeService: ThemeService,
    private authService: AuthService,
    private productosService: ProductosService,
    private pedidoService: PedidoService,
    private adminUsuariosService: AdminUsuariosService,
    private configuracionService: ConfiguracionService,
    private pqrService: PqrService
  ) {
    library.addIcons(
      faBoxes, 
      faFolderOpen, 
      faFolder, 
      faSignOutAlt, 
      faUserShield, 
      faHome, 
      faBolt,
      faWarehouse,
      faClipboardList,
      faDownload,
      faEye,
      faChartBar,
      faArrowRight,
      faArrowLeft,
      faShoppingCart,
      faSun,
      faMoon,
      faSearch,
      faPaintBrush
    );
  }

  ngOnInit(): void {
    try {
      this.isSidebarCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch (e) {
      this.isSidebarCollapsed = false;
    }
    this.iniciarChequeoPedidos();
    this.cargarMetricasDashboard();
    this.configuracionService.wompiEnabled$.subscribe(val => {
      this.wompiEnabled = val;
    });
  }

  cargarMetricasDashboard(): void {
    this.cargandoMetricas = true;

    // 1. Total Productos en Inventario
    this.productosService.obtenerProductos().subscribe({
      next: (prods) => {
        this.totalProductosCount = Array.isArray(prods) ? prods.length : 0;
      },
      error: () => {}
    });

    // 2. Total Usuarios Registrados
    this.adminUsuariosService.obtenerUsuariosDetalle().subscribe({
      next: (res: any) => {
        this.totalUsuariosCount = Array.isArray(res) ? res.length : (res?.data?.length || 0);
      },
      error: () => {}
    });

    // 3. Total PQRS
    const token = localStorage.getItem('token') || '';
    if (token) {
      this.pqrService.getPQRS(token).subscribe({
        next: (res) => {
          this.totalPqrsCount = res?.total || (Array.isArray(res?.data) ? res.data.length : 0);
        },
        error: () => {}
      });
    }
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  private iniciarChequeoPedidos(): void {
    // Primera carga para inicializar maxOrderId
    this.chequearNuevosPedidos();
    
    // Polling cada 30 segundos
    this.pollingInterval = setInterval(() => {
      this.chequearNuevosPedidos();
    }, 30000);
  }

  private playNotificationSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Professional chime sound: two consecutive notes (e.g. E5 then A5)
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playNote(659.25, now, 0.3); // E5
      playNote(880.00, now + 0.15, 0.6); // A5
    } catch (e) {
      console.warn('Web Audio API notification chime failed:', e);
    }
  }

  private chequearNuevosPedidos(): void {
    this.pedidoService.adminObtenerTodos().subscribe({
      next: (res: any) => {
        const data = res.data ?? res;
        const pedidos = data.pedidos || [];
        this.totalPedidosCount = pedidos.length;
        const estadosAlerta = ['pagado', 'confirmado', 'en_preparacion'];
        this.pedidosPendientesCount = pedidos.filter((p: any) => estadosAlerta.includes(p.estado) || p.estado === 'pendiente').length;
        
        if (pedidos.length === 0) return;

        let mayorId = this.maxOrderId;
        let nuevosPagadosEncontrados = 0;
        let ultimoCodigo = '';

        pedidos.forEach((pedido: any) => {
          const pid = Number(pedido.id);
          if (pid > this.maxOrderId) {
            if (pid > mayorId) {
              mayorId = pid;
            }
            // Si no es la primera carga del componente, y el pedido es pagado/confirmado, alertamos
            if (!this.isFirstLoad) {
              if (estadosAlerta.includes(pedido.estado)) {
                nuevosPagadosEncontrados++;
                ultimoCodigo = pedido.codigo_pedido;
              }
            }
          }
        });

        // Alerta modal desactivada temporalmente a petición del usuario
        // if (this.isFirstLoad) { ... }

        this.maxOrderId = mayorId;
        this.isFirstLoad = false;

        if (nuevosPagadosEncontrados > 0) {
          this.playNotificationSound();
          Swal.fire({
            icon: 'info',
            title: '¡Nuevo Pedido Recibido!',
            text: nuevosPagadosEncontrados === 1 
              ? `Se ha recibido un nuevo pago para el pedido ${ultimoCodigo}.`
              : `Se han recibido ${nuevosPagadosEncontrados} nuevos pagos/pedidos.`,
            toast: true,
            position: 'top-end',
            showConfirmButton: true,
            confirmButtonText: 'Ver Pedidos',
            timer: 10000,
            timerProgressBar: true
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/admin/pedidos']);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al chequear nuevos pedidos:', err);
      }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.authService.logout(false);
  }

  toggleWompi(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.aplicarCambioWompi(isChecked, event);
  }

  setWompiMode(activar: boolean): void {
    if (this.wompiEnabled === activar) return;
    this.aplicarCambioWompi(activar);
  }

  private aplicarCambioWompi(nuevoEstado: boolean, event?: Event): void {
    this.configuracionService.updateWompiStatus(nuevoEstado).subscribe({
      next: () => {
        const modoNombre = nuevoEstado ? 'Modo Producción (En Vivo)' : 'Modo en Desarrollo (Inactiva)';
        Swal.fire({
          icon: 'success',
          title: 'Pasarela Wompi Actualizada',
          html: `<p style="color: #cbd5e1; font-size: 0.95rem;">Estado de pagos establecido en <strong>${modoNombre}</strong>.</p>`,
          background: '#1e293b',
          color: '#f8fafc',
          iconColor: '#4ade80',
          confirmButtonColor: '#368c44',
          confirmButtonText: 'Entendido',
          customClass: {
            popup: 'rounded-xl shadow-2xl border border-slate-700'
          }
        });
      },
      error: () => {
        if (event && event.target) {
          (event.target as HTMLInputElement).checked = !nuevoEstado;
        }
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          html: '<p style="color: #cbd5e1; font-size: 0.95rem;">No se pudo actualizar la configuración de la pasarela Wompi.</p>',
          background: '#1e293b',
          color: '#f8fafc',
          iconColor: '#f87171',
          confirmButtonColor: '#dc2626',
          confirmButtonText: 'Cerrar'
        });
      }
    });
  }

  get estaEnInicio(): boolean {
    return this.router.url === '/admin';
  }

  get tituloSeccion(): string {
    const url = this.router.url;
    if (url.includes('/pedidos')) return 'Gestión de Pedidos';
    if (url.includes('/personalizar-web')) return 'Personalizar';
    if (url.includes('/usuarios')) return 'Usuarios Registrados';
    if (url.includes('/pqr-admin')) return 'PQRS - Peticiones, Quejas y Reclamos';
    return 'Panel de Administración';
  }

  get subtituloSeccion(): string {
    const url = this.router.url;
    if (url.includes('/pedidos')) return 'Visualiza, gestiona y actualiza el estado de los pedidos';
    if (url.includes('/personalizar-web')) return 'Configura y edita elementos visuales y textos de la tienda';
    if (url.includes('/usuarios')) return 'Visualiza clientes registrados, carritos y actividad';
    if (url.includes('/pqr-admin')) return 'Atiende peticiones, quejas, reclamos y solicitudes de clientes';
    return 'Administra pedidos, personalización, usuarios y PQRS de Plaxtilineas';
  }

  /**
   * Procesa la consulta del Buscador Inteligente IA
   */
  procesarBusquedaIA(query: string): void {
    if (!query || query.trim() === '') return;
    this.searchQuery = query;
    this.isSearching = true;
    this.searchResults = null;
    this.searchType = null;

    const normalizedQuery = query.toLowerCase().trim();

    // 1. Detectar intención de stock bajo
    if (
      normalizedQuery.includes('stock') ||
      normalizedQuery.includes('inventario') ||
      normalizedQuery.includes('escasez') ||
      normalizedQuery.includes('pocos') ||
      normalizedQuery.includes('bajo') ||
      normalizedQuery.includes('menos')
    ) {
      this.searchType = 'stock';
      this.productosService.obtenerProductos().subscribe({
        next: (productos) => {
          // Ordenar por stock ascendente
          const ordenados = [...productos].sort((a, b) => (a.stock || 0) - (b.stock || 0));
          this.searchResults = ordenados.slice(0, 6);
          this.isSearching = false;
        },
        error: (err) => {
          console.error(err);
          this.isSearching = false;
          Swal.fire('Error', 'No se pudieron consultar los productos para el stock.', 'error');
        }
      });
      return;
    }

    // 2. Detectar intención de productos más vendidos / ventas
    if (
      normalizedQuery.includes('vendido') ||
      normalizedQuery.includes('ventas') ||
      normalizedQuery.includes('popular') ||
      normalizedQuery.includes('comprado') ||
      normalizedQuery.includes('salida')
    ) {
      this.searchType = 'ventas';
      this.pedidoService.adminObtenerTodos().subscribe({
        next: (res) => {
          // Consolidar cantidades vendidas
          const ventasPorProducto: { [id: number]: { id: number, nombre: string, cantidad: number, totalVendido: number, imagen_url: string | null } } = {};
          if (res && res.pedidos) {
            res.pedidos.forEach(pedido => {
              if (pedido.detalles) {
                pedido.detalles.forEach(detalle => {
                  const pid = detalle.producto_id;
                  if (!ventasPorProducto[pid]) {
                    ventasPorProducto[pid] = {
                      id: pid,
                      nombre: detalle.nombre_producto,
                      cantidad: 0,
                      totalVendido: 0,
                      imagen_url: detalle.imagen_url
                    };
                  }
                  ventasPorProducto[pid].cantidad += detalle.cantidad;
                  ventasPorProducto[pid].totalVendido += (detalle.subtotal || (detalle.cantidad * detalle.precio_unitario));
                });
              }
            });
          }
          const ordenados = Object.values(ventasPorProducto).sort((a, b) => b.cantidad - a.cantidad);
          this.searchResults = ordenados.slice(0, 6);
          this.isSearching = false;
        },
        error: (err) => {
          console.error(err);
          this.isSearching = false;
          Swal.fire('Error', 'No se pudieron consultar los pedidos.', 'error');
        }
      });
      return;
    }

    // 3. Redirecciones
    // Usuarios / clientes
    if (
      normalizedQuery.includes('usuario') ||
      normalizedQuery.includes('cliente') ||
      normalizedQuery.includes('persona') ||
      normalizedQuery.includes('registrado')
    ) {
      this.searchType = 'redireccion';
      this.isSearching = false;
      Swal.fire({
        title: 'Redirigiendo...',
        text: 'Te estamos llevando a la sección de Usuarios Registrados.',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
      });
      this.router.navigate(['/admin/usuarios']);
      return;
    }

    // Pedidos / órdenes
    if (
      normalizedQuery.includes('pedido') ||
      normalizedQuery.includes('orden') ||
      normalizedQuery.includes('compra')
    ) {
      this.searchType = 'redireccion';
      this.isSearching = false;
      Swal.fire({
        title: 'Redirigiendo...',
        text: 'Te estamos llevando a la gestión de Pedidos.',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
      });
      this.router.navigate(['/admin/pedidos']);
      return;
    }

    // Categorías
    if (normalizedQuery.includes('categoria')) {
      this.searchType = 'redireccion';
      this.isSearching = false;
      this.router.navigate(['/admin/categorias']);
      return;
    }

    // Subcategorías
    if (normalizedQuery.includes('subcat')) {
      this.searchType = 'redireccion';
      this.isSearching = false;
      this.router.navigate(['/admin/subcategorias']);
      return;
    }

    // PQR
    if (normalizedQuery.includes('pqr') || normalizedQuery.includes('mensaje') || normalizedQuery.includes('contacto')) {
      this.searchType = 'redireccion';
      this.isSearching = false;
      this.router.navigate(['/admin/pqr-admin']);
      return;
    }

    // 4. Búsqueda de productos por nombre como Fallback
    this.searchType = 'nombre';
    this.productosService.buscarProductosPorNombre(normalizedQuery).subscribe({
      next: (res) => {
        this.searchResults = res.resultados || [];
        this.isSearching = false;
      },
      error: (err) => {
        console.error(err);
        this.isSearching = false;
        this.searchResults = [];
      }
    });
  }

  limpiarBusqueda(): void {
    this.searchQuery = '';
    this.searchResults = null;
    this.searchType = null;
  }
}
