import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import Swal from 'sweetalert2';
import { ImportProductsService } from '../../../services/import-products.service';
import { ThemeService, Theme } from '../../../services/theme.service';
import { AuthService } from '../../../services/auth.service';
import { ProductosService } from '../../../services/productos.service';
import { PedidoService } from '../../../services/pedido.service';
import { AdminUsuariosService } from '../../../services/admin-usuarios.service';
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

  // Estados para la importación
  cargandoPreview = false;
  cargandoEstadisticas = false;
  cargandoImportacion = false;
  
  // Datos mostrados
  datosPreview: any = null;
  datosEstadisticas: any = null;
  respuestaImportacion: any = null;
  analisisPreview: any = null;
  todoActualizado = false;
  
  // Mensajes
  mensajeError = '';
  mensajeExito = '';

  isMobileSidebarOpen = false;

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }

  constructor(
    private router: Router,
    library: FaIconLibrary,
    private importService: ImportProductsService,
    public themeService: ThemeService,
    private authService: AuthService,
    private productosService: ProductosService,
    private pedidoService: PedidoService,
    private adminUsuariosService: AdminUsuariosService
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
      faSearch
    );
  }

  ngOnInit(): void {
    this.iniciarChequeoPedidos();
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
        
        if (pedidos.length === 0) return;

        let mayorId = this.maxOrderId;
        let nuevosPagadosEncontrados = 0;
        let ultimoCodigo = '';
        const estadosAlerta = ['pagado', 'confirmado', 'en_preparacion'];

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

        // Alerta al ingresar por primera vez si hay pedidos pagados
        if (this.isFirstLoad) {
          const pedidosPendientesDeProcesar = pedidos.filter((p: any) => estadosAlerta.includes(p.estado)).length;
          if (pedidosPendientesDeProcesar > 0) {
            this.playNotificationSound();
            Swal.fire({
              title: 'Pedidos Pendientes',
              html: `
                <div style="font-family: 'Montserrat', sans-serif; text-align: center; padding: 5px 10px;">
                  <p style="font-size: 1.15rem; color: #475569; margin-bottom: 25px; line-height: 1.6; font-weight: 500;">
                    Tienes <span style="font-weight: 700; color: #16a34a;">${pedidosPendientesDeProcesar} pedido(s)</span> con pago confirmado pendientes de procesar.
                  </p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; margin: 10px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.01); text-align: left; width: 100%; box-sizing: border-box;">
                    <div style="background: rgba(22, 163, 74, 0.1); color: #16a34a; border-radius: 50%; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; flex-shrink: 0; box-shadow: inset 0 2px 4px rgba(22, 163, 74, 0.05);">
                      📦
                    </div>
                    <div>
                      <p style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0;">Acción Requerida</p>
                      <p style="font-size: 0.8rem; color: #64748b; margin: 4px 0 0 0; line-height: 1.45;">Por favor, ingresa a la sección de pedidos para coordinar el embalaje y despacho del envío.</p>
                    </div>
                  </div>
                </div>
              `,
              icon: 'info',
              iconColor: '#000000',
              width: '520px',
              showCancelButton: true,
              confirmButtonText: 'Gestionar Pedidos',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#000000',
              cancelButtonColor: '#94a3b8'
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate(['/admin/pedidos']);
              }
            });
          }
        }

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

  get estaEnInicio(): boolean {
    return this.router.url === '/admin';
  }

  get tituloSeccion(): string {
    const url = this.router.url;
    if (url.includes('/categorias')) return 'Gestión de Categorías';
    if (url.includes('/subcategorias')) return 'Gestión de Subcategorías';
    if (url.includes('/productos')) return 'Gestión de Productos';
    if (url.includes('/inventario')) return 'Gestión de Inventario';
    if (url.includes('/pqr-admin')) return 'Peticiones, Quejas y Reclamos';
    if (url.includes('/usuarios')) return 'Usuarios Registrados';
    if (url.includes('/pedidos')) return 'Gestión de Pedidos';
    return 'Panel de Administración';
  }

  get subtituloSeccion(): string {
    const url = this.router.url;
    if (url.includes('/categorias')) return 'Administra las categorías principales del catálogo';
    if (url.includes('/subcategorias')) return 'Administra las subcategorías y su relación';
    if (url.includes('/productos')) return 'Añade, edita o elimina productos del catálogo';
    if (url.includes('/inventario')) return 'Controla el stock y precios de tus productos';
    if (url.includes('/pqr-admin')) return 'Gestiona los mensajes de contacto de clientes';
    if (url.includes('/usuarios')) return 'Visualiza clientes, sus carritos de compras activos y pedidos';
    if (url.includes('/pedidos')) return 'Visualiza e interactúa con el estado de pedidos';
    return 'Gestiona productos, categorías, subcategorías y más';
  }

  /**
   * Obtener preview de productos de Hostinger
   */
  obtenerPreview(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cargandoPreview = true;

    this.importService.obtenerPreview(5).subscribe({
      next: (response) => {
        this.datosPreview = response;
        this.analisisPreview = response.analisis || null;
        this.cargandoPreview = false;
        
        if (this.analisisPreview?.todo_actualizado) {
          this.todoActualizado = true;
          Swal.fire('✅ Sincronizado', `¡Todo está sincronizado! Los ${this.analisisPreview.total_hostinger} productos de Hostinger ya están en tu catálogo local.`, 'success');
        } else if (this.analisisPreview) {
          this.todoActualizado = false;
          Swal.fire('⚠️ Pendientes', `Hay ${this.analisisPreview.nuevos_por_importar} producto(s) nuevo(s) pendiente(s) de importar.`, 'info');
        } else {
          Swal.fire('✅ Cargado', `Preview cargado: ${response.total_en_preview} productos encontrados`, 'success');
        }
      },
      error: (err) => {
        this.cargandoPreview = false;
        Swal.fire('❌ Error', `Error al obtener preview: ${err.error?.error || err.message}`, 'error');
        console.error('Error en preview:', err);
      }
    });
  }

  /**
   * Obtener estadísticas de productos en Hostinger
   */
  obtenerEstadisticas(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cargandoEstadisticas = true;

    this.importService.obtenerEstadisticas().subscribe({
      next: (response) => {
        this.datosEstadisticas = response;
        this.cargandoEstadisticas = false;
        Swal.fire('✅ Estadísticas cargadas', `${response.total_productos} productos disponibles`, 'success');
      },
      error: (err) => {
        this.cargandoEstadisticas = false;
        Swal.fire('❌ Error', `Error al obtener estadísticas: ${err.error?.error || err.message}`, 'error');
        console.error('Error en estadísticas:', err);
      }
    });
  }

  /**
   * Ejecutar importación de productos
   */
  ejecutarImportacion(): void {
    if (this.todoActualizado) {
      Swal.fire('✅ Sincronizado', 'No es necesario importar. Todos los productos ya están sincronizados.', 'success');
      return;
    }

    Swal.fire({
      title: '¿Iniciar importación?',
      text: '⚠️ Esta operación importará todos los productos nuevos de Hostinger.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargandoImportacion = true;
        this.mensajeError = '';
        this.mensajeExito = '';

        this.importService.ejecutarImportacion().subscribe({
          next: (response) => {
            this.respuestaImportacion = response;
            this.cargandoImportacion = false;

            if (response.todo_actualizado) {
              this.todoActualizado = true;
              Swal.fire('✅ Todo Actualizado', response.mensaje || 'Todo está actualizado. No hay productos nuevos.', 'success');
            } else {
              let msg = `Sincronización completada: ${response.importados_exitosamente} nuevos`;
              if (response.actualizados > 0) msg += `, ${response.actualizados} actualizados`;
              if (response.errores > 0) msg += `, ${response.errores} errores`;
              Swal.fire('✅ Completado', msg, 'success');
              this.todoActualizado = true;
            }
          },
          error: (err) => {
            this.cargandoImportacion = false;
            Swal.fire('❌ Error', `Error en importación: ${err.error?.error || err.message}`, 'error');
            console.error('Error en importación:', err);
          }
        });
      }
    });
  }

  /**
   * Limpiar datos mostrados
   */
  limpiarDatos(): void {
    this.datosPreview = null;
    this.datosEstadisticas = null;
    this.respuestaImportacion = null;
    this.analisisPreview = null;
    this.todoActualizado = false;
    this.mensajeError = '';
    this.mensajeExito = '';
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
