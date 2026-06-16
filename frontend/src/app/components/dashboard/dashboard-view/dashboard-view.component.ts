import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import Swal from 'sweetalert2';
import { ImportProductsService } from '../../../services/import-products.service';
import { ThemeService, Theme } from '../../../services/theme.service';
import { AuthService } from '../../../services/auth.service';
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
  faDollarSign
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FontAwesomeModule, DashboardAssistantComponent],
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.css']
})
export class DashboardViewComponent {
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

  constructor(
    private router: Router,
    library: FaIconLibrary,
    private importService: ImportProductsService,
    public themeService: ThemeService,
    private authService: AuthService
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
      faMoon
    );
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
}
