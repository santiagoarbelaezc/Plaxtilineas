import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFileAlt, faChartPie, faChartLine, faUsers, faInfoCircle, faDownload } from '@fortawesome/free-solid-svg-icons';
import { StatsService } from '../../../services/stats.service';
import { EstadisticasService } from '../../../services/estadisticas.service';
import { LeadsService } from '../../../services/leads.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
})
export class Reportes implements OnInit {
  // FontAwesome Icons
  faFileAlt = faFileAlt;
  faChartPie = faChartPie;
  faChartLine = faChartLine;
  faUsers = faUsers;
  faInfoCircle = faInfoCircle;
  faDownload = faDownload;

  // Services
  private statsService = inject(StatsService);
  private catalogService = inject(EstadisticasService);
  private leadsService = inject(LeadsService);

  // States
  loadingSystem = false;
  loadingCatalog = false;
  loadingAnalytics = false;
  loadingUsers = false;

  fechaActual = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  ngOnInit(): void {}

  // ─── REPORT GENERATORS ─────────────────────────────────────────────────────

  generarReporteSistema(): void {
    this.loadingSystem = true;
    this.statsService.getDashboardStats().subscribe({
      next: (res) => {
        const stats = (res as any).data || res;
        const doc = new jsPDF();
        
        // Header
        this.drawHeader(doc, 'REPORTE GENERAL DEL SISTEMA');

        // General Info / Meta
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Fecha de emisión: ${this.fechaActual}`, 14, 45);
        doc.text('Generado por: Administrador del Sistema', 14, 50);
        
        // Section: KPIs
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Resumen de Indicadores Clave (KPIs)', 14, 62);
        
        const kpisData = [
          ['Indicador', 'Valor actual'],
          ['Visitas hoy', stats.resumen.visitas_hoy.toString()],
          ['Visitas de la semana', stats.resumen.visitas_semana.toString()],
          ['Visitas del mes', stats.resumen.visitas_mes.toString()],
          ['Sesiones únicas', stats.resumen.sesiones_unicas.toString()],
          ['Total productos', stats.resumen.total_productos.toString()],
          ['Total categorías', stats.resumen.total_categorias.toString()],
          ['Total subcategorías', stats.resumen.total_subcats.toString()],
          ['Total leads registrados', stats.resumen.total_leads.toString()],
        ];

        autoTable(doc, {
          startY: 68,
          head: [kpisData[0]],
          body: kpisData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [54, 140, 68] },
          styles: { fontSize: 10, cellPadding: 4 }
        });

        // Section: Leads Recientes
        const currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Últimos Leads Registrados', 14, currentY);

        const leadsBody = stats.leads_recientes.map((lead: any) => [
          lead.nombre,
          lead.telefono,
          lead.fuente || 'Modal de bienvenida',
          lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-ES') : ''
        ]);

        autoTable(doc, {
          startY: currentY + 6,
          head: [['Nombre', 'Teléfono', 'Origen', 'Fecha de Registro']],
          body: leadsBody,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 10, cellPadding: 4 }
        });

        this.drawFooter(doc);
        doc.save(`reporte-sistema-${new Date().toISOString().slice(0,10)}.pdf`);
        this.loadingSystem = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingSystem = false;
      }
    });
  }

  generarReporteCatalogo(): void {
    this.loadingCatalog = true;
    this.catalogService.getCatalogStats().subscribe({
      next: (stats) => {
        const doc = new jsPDF();
        
        // Header
        this.drawHeader(doc, 'REPORTE DE SALUD DEL CATÁLOGO');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Fecha de emisión: ${this.fechaActual}`, 14, 45);
        doc.text('Generado por: Administrador del Catálogo', 14, 50);

        // KPIs de catálogo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Métricas del Catálogo', 14, 62);

        const catalogKpis = [
          ['Total de Productos en Catálogo', stats.kpis.total_productos.toString()],
          ['Categorías Activas', stats.kpis.total_categorias.toString()],
          ['Productos sin Variantes', stats.kpis.productos_sin_variantes.toString()],
          ['PQRs Pendientes de Atención', stats.kpis.pqrs_pendientes.toString()],
        ];

        autoTable(doc, {
          startY: 68,
          head: [['Métrica', 'Valor']],
          body: catalogKpis,
          theme: 'striped',
          headStyles: { fillColor: [54, 140, 68] },
          styles: { fontSize: 10, cellPadding: 4 }
        });

        // Alertas de Calidad
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Alertas de Calidad de Datos', 14, currentY);

        if (stats.alertas && stats.alertas.length > 0) {
          const alertasBody = stats.alertas.map((a: any) => [a.tipo, a.mensaje]);
          autoTable(doc, {
            startY: currentY + 6,
            head: [['Tipo de Alerta', 'Detalle']],
            body: alertasBody,
            theme: 'grid',
            headStyles: { fillColor: [185, 28, 28] },
            styles: { fontSize: 9, cellPadding: 4 }
          });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.text('No se encontraron alertas en el catálogo. ¡Calidad de datos al 100%!', 14, currentY + 8);
        }

        // Distribución por Categoría
        currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 25;
        // Check if we need a new page
        if (currentY > 230) {
          doc.addPage();
          currentY = 40;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Distribución de Productos por Categoría', 14, currentY);

        const distribucionBody = stats.distribucion_categorias.map((d: any) => [
          d.categoria || 'Sin categoría',
          (d.cantidad !== undefined && d.cantidad !== null) ? d.cantidad.toString() : '0'
        ]);

        autoTable(doc, {
          startY: currentY + 6,
          head: [['Categoría', 'Cantidad de Productos']],
          body: distribucionBody,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 10, cellPadding: 4 }
        });

        this.drawFooter(doc);
        doc.save(`reporte-catalogo-${new Date().toISOString().slice(0,10)}.pdf`);
        this.loadingCatalog = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingCatalog = false;
      }
    });
  }

  generarReporteAnaliticas(): void {
    this.loadingAnalytics = true;
    this.statsService.getDashboardStats().subscribe({
      next: (res) => {
        const stats = (res as any).data || res;
        const doc = new jsPDF();
        
        // Header
        this.drawHeader(doc, 'REPORTE DE ANALÍTICAS Y TRÁFICO');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Fecha de emisión: ${this.fechaActual}`, 14, 45);
        doc.text('Generado por: Auditor de Analíticas', 14, 50);

        // Top Productos Más Visitados
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Top Productos Más Solicitados / Visitados', 14, 62);

        const topProductosBody = stats.top_productos.map((p: any, idx: number) => [
          (idx + 1).toString(),
          p.nombre,
          p.visitas.toString()
        ]);

        autoTable(doc, {
          startY: 68,
          head: [['Puesto', 'Producto', 'Visitas / Clics']],
          body: topProductosBody,
          theme: 'striped',
          headStyles: { fillColor: [54, 140, 68] },
          styles: { fontSize: 10, cellPadding: 4 }
        });

        // Páginas más visitadas
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Rutas y Secciones Populares', 14, currentY);

        const paginasBody = stats.paginas_top.map((p: any) => [
          p.url === '/' ? 'Inicio (Lobby principal)' : p.url,
          p.visitas.toString()
        ]);

        autoTable(doc, {
          startY: currentY + 6,
          head: [['URL / Sección', 'Visitas']],
          body: paginasBody,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 10, cellPadding: 4 }
        });

        this.drawFooter(doc);
        doc.save(`reporte-analiticas-${new Date().toISOString().slice(0,10)}.pdf`);
        this.loadingAnalytics = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingAnalytics = false;
      }
    });
  }

  generarReporteUsuarios(): void {
    this.loadingUsers = true;
    // Buscamos con un límite alto (ej: 500) para traer la gran mayoría en un solo reporte PDF
    this.leadsService.getLeads(1, 500, '').subscribe({
      next: (res) => {
        const leads = res.leads;
        const doc = new jsPDF();
        
        // Header
        this.drawHeader(doc, 'REPORTE DE USUARIOS Y LEADS REGISTRADOS');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Fecha de emisión: ${this.fechaActual}`, 14, 45);
        doc.text(`Total de registros exportados: ${res.total}`, 14, 50);

        // Tabla de Usuarios
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Lista Completa de Contactos Registrados', 14, 62);

        const usuariosBody = leads.map((lead: any) => [
          lead.nombre,
          lead.telefono,
          lead.fuente || 'Modal de bienvenida',
          lead.ip_address || 'N/A',
          lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-ES') : ''
        ]);

        autoTable(doc, {
          startY: 68,
          head: [['Nombre Completo', 'Teléfono / WhatsApp', 'Origen', 'Dirección IP', 'Fecha Registro']],
          body: usuariosBody,
          theme: 'striped',
          headStyles: { fillColor: [54, 140, 68] },
          styles: { fontSize: 9, cellPadding: 4 }
        });

        this.drawFooter(doc);
        doc.save(`reporte-usuarios-${new Date().toISOString().slice(0,10)}.pdf`);
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingUsers = false;
      }
    });
  }

  // ─── PDF DRAWING HELPERS ───────────────────────────────────────────────────

  private drawHeader(doc: jsPDF, title: string): void {
    // Top colored banner
    doc.setFillColor(17, 24, 39); // Charcoal (#111827)
    doc.rect(0, 0, 210, 32, 'F');

    // Accent line (green)
    doc.setFillColor(54, 140, 68); // #368C44
    doc.rect(0, 32, 210, 2, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PLAXTILINEAS', 14, 15);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175); // Slate
    doc.text(title, 14, 23);

    // Reset color to dark grey for content
    doc.setTextColor(30, 41, 59);
  }

  private drawFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Top boundary line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 280, 196, 280);

      // Footer Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Plaxtilineas - Panel de Control Administrativo', 14, 286);
      doc.text(`Página ${i} de ${pageCount}`, 180, 286);
    }
  }
}
