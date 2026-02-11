import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { ImportProductsService } from '../../../services/import-products.service';
import {
  faBoxes,
  faFolderOpen,
  faFolder,
  faSignOutAlt,
  faUserShield,
  faHome,
  faBolt,
  faWarehouse,      // Icono para Inventario
  faClipboardList,   // Icono para PQR
  faDownload,        // Icono para descargar/importar
  faEye,            // Icono para preview
  faChartBar        // Icono para estadísticas
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
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

  // Estados para la importación
  cargandoPreview = false;
  cargandoEstadisticas = false;
  cargandoImportacion = false;
  
  // Datos mostrados
  datosPreview: any = null;
  datosEstadisticas: any = null;
  respuestaImportacion: any = null;
  
  // Mensajes
  mensajeError = '';
  mensajeExito = '';

  constructor(
    private router: Router,
    library: FaIconLibrary,
    private importService: ImportProductsService
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
      faChartBar
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  get estaEnInicio(): boolean {
    return this.router.url === '/admin';
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
        this.cargandoPreview = false;
        this.mensajeExito = `✅ Preview cargado: ${response.total_en_preview} productos encontrados`;
        setTimeout(() => this.mensajeExito = '', 5000);
      },
      error: (err) => {
        this.cargandoPreview = false;
        this.mensajeError = `❌ Error al obtener preview: ${err.error?.error || err.message}`;
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
        this.mensajeExito = `✅ Estadísticas cargadas: ${response.total_productos} productos disponibles`;
        setTimeout(() => this.mensajeExito = '', 5000);
      },
      error: (err) => {
        this.cargandoEstadisticas = false;
        this.mensajeError = `❌ Error al obtener estadísticas: ${err.error?.error || err.message}`;
        console.error('Error en estadísticas:', err);
      }
    });
  }

  /**
   * Ejecutar importación de productos
   */
  ejecutarImportacion(): void {
    if (!confirm('⚠️ Esta operación importará todos los productos de Hostinger.\n¿Estás seguro de continuar?')) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';
    this.cargandoImportacion = true;

    this.importService.ejecutarImportacion().subscribe({
      next: (response) => {
        this.respuestaImportacion = response;
        this.cargandoImportacion = false;
        this.mensajeExito = `✅ Importación completada: ${response.importados_exitosamente} productos importados`;
        setTimeout(() => this.mensajeExito = '', 5000);
      },
      error: (err) => {
        this.cargandoImportacion = false;
        this.mensajeError = `❌ Error en importación: ${err.error?.error || err.message}`;
        console.error('Error en importación:', err);
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
    this.mensajeError = '';
    this.mensajeExito = '';
  }
}
