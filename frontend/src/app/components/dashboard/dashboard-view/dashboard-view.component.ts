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
  isSidebarCollapsed = false;

  wompiEnabled = true;

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
    private importService: ImportProductsService,
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

        // Alerta al ingresar por primera vez si hay pedidos pagados
        if (this.isFirstLoad) {
          const pedidosPendientesDeProcesar = pedidos.filter((p: any) => estadosAlerta.includes(p.estado)).length;
          if (pedidosPendientesDeProcesar > 0) {
            this.playNotificationSound();
            Swal.fire({
              width: '680px',
              padding: '36px 40px',
              customClass: {
                popup: 'swal-wide-modal',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
              },
              buttonsStyling: false,
              html: `
                <div style="font-family: 'Inter Tight', -apple-system, sans-serif; text-align: center;">
                  <!-- Icono Hero Superior (Reemplaza el círculo vacío) -->
                  <div style="width: 58px; height: 58px; border-radius: 18px; background: #09090b; border: 1.5px solid #27272a; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);">
                    <span class="material-symbols-rounded" style="font-size: 28px; color: #ffffff;">pending_actions</span>
                  </div>

                  <!-- Badge superior con punto pulsante -->
                  <div style="display: flex; justify-content: center; margin-bottom: 14px;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; background: #fef2f2; border: 1.5px solid #fecaca; color: #dc2626; padding: 6px 14px; border-radius: 9999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #dc2626; box-shadow: 0 0 10px rgba(220, 38, 38, 0.7); display: inline-block;"></span>
                      Acción Requerida en Tienda
                    </span>
                  </div>

                  <!-- Título & Subtítulo -->
                  <h2 style="font-size: 1.75rem; font-weight: 800; color: #09090b; letter-spacing: -0.03em; margin: 0 0 10px 0; line-height: 1.2;">
                    Pedidos Pendientes de Despacho
                  </h2>
                  <p style="font-size: 0.95rem; color: #71717a; margin: 0 0 24px 0; line-height: 1.5;">
                    Tienes <span style="font-weight: 800; color: #09090b; background: #f4f5f7; border: 1px solid #e4e4e7; padding: 3px 10px; border-radius: 8px;">${pedidosPendientesDeProcesar} pedido(s) con pago confirmado</span> esperando preparación y entrega.
                  </p>

                  <!-- Bento Grid de 2 Columnas -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 20px; text-align: left;">
                    <!-- Card 1: Alistamiento de Paquete -->
                    <div style="background: #ffffff; border: 1.5px solid #e4e4e7; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #f0fdf4; border: 1.5px solid #bbf7d0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          <span class="material-symbols-rounded" style="font-size: 24px; color: #16a34a;">inventory_2</span>
                        </div>
                        <div>
                          <span style="display: block; font-size: 0.68rem; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.08em;">Paso 1 • Bodega</span>
                          <span style="display: block; font-size: 0.95rem; font-weight: 800; color: #09090b;">Alistar & Embalaje</span>
                        </div>
                      </div>
                      <p style="font-size: 0.82rem; color: #71717a; margin: 0; line-height: 1.5;">
                        Verifica cantidades, referencias y variantes en inventario para apartar y empacar de inmediato.
                      </p>
                    </div>

                    <!-- Card 2: Envío y Guía -->
                    <div style="background: #ffffff; border: 1.5px solid #e4e4e7; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; border: 1.5px solid #bfdbfe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                          <span class="material-symbols-rounded" style="font-size: 24px; color: #2563eb;">local_shipping</span>
                        </div>
                        <div>
                          <span style="display: block; font-size: 0.68rem; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em;">Paso 2 • Logística</span>
                          <span style="display: block; font-size: 0.95rem; font-weight: 800; color: #09090b;">Generar Guía</span>
                        </div>
                      </div>
                      <p style="font-size: 0.82rem; color: #71717a; margin: 0; line-height: 1.5;">
                        Coordina el despacho con la transportadora y actualiza el estado a "Enviado" con el código de rastreo.
                      </p>
                    </div>
                  </div>

                  <!-- Banner Informativo Inferior -->
                  <div style="background: #f4f5f7; border: 1.5px dashed #e4e4e7; border-radius: 14px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; text-align: left;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <span class="material-symbols-rounded" style="font-size: 18px; color: #d97706;">bolt</span>
                    </div>
                    <span style="font-size: 0.82rem; color: #09090b; font-weight: 600; line-height: 1.4;">
                      Despachar con prontitud optimiza el flujo de pedidos y garantiza una alta satisfacción del cliente.
                    </span>
                  </div>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: '<span style="display: inline-flex; align-items: center; gap: 6px;">Gestionar Pedidos <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span></span>',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#000000',
              cancelButtonColor: '#f4f5f7'
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

  toggleWompi(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.configuracionService.updateWompiStatus(isChecked).subscribe({
      next: () => {
        const estado = isChecked ? 'activada' : 'desactivada';
        Swal.fire({
          icon: 'success',
          title: 'Configuraci&oacute;n guardada',
          html: '<p style="color: #cbd5e1; font-size: 0.95rem;">La pasarela Wompi ha sido <strong>' + estado + '</strong> con &eacute;xito.</p>',
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
        (event.target as HTMLInputElement).checked = !isChecked;
        Swal.fire({
          icon: 'error',
          title: 'Error de conexi&oacute;n',
          html: '<p style="color: #cbd5e1; font-size: 0.95rem;">No se pudo actualizar la configuraci&oacute;n de la pasarela.</p>',
          background: '#1e293b',
          color: '#f8fafc',
          iconColor: '#f87171',
          confirmButtonColor: '#368c44',
          confirmButtonText: 'Entendido',
          customClass: {
            popup: 'rounded-xl shadow-2xl border border-slate-700'
          }
        });
      }
    });
  }

  get estaEnInicio(): boolean {
    return this.router.url === '/admin';
  }

  get tituloSeccion(): string {
    const url = this.router.url;
    if (url.includes('/inventario')) return 'Gestión de Inventario';
    if (url.includes('/pedidos')) return 'Gestión de Pedidos';
    if (url.includes('/personalizar-web')) return 'Personalizar';
    if (url.includes('/usuarios')) return 'Usuarios Registrados';
    if (url.includes('/pqr-admin')) return 'PQRS - Peticiones, Quejas y Reclamos';
    return 'Panel de Administración';
  }

  get subtituloSeccion(): string {
    const url = this.router.url;
    if (url.includes('/inventario')) return 'Controla el stock, referencias y precios de tus productos';
    if (url.includes('/pedidos')) return 'Visualiza, gestiona y actualiza el estado de los pedidos';
    if (url.includes('/personalizar-web')) return 'Configura y edita elementos visuales y textos de la tienda';
    if (url.includes('/usuarios')) return 'Visualiza clientes registrados, carritos y actividad';
    if (url.includes('/pqr-admin')) return 'Atiende peticiones, quejas, reclamos y solicitudes de clientes';
    return 'Administra inventario, pedidos, personalización, usuarios y PQRS de Plaxtilineas';
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
