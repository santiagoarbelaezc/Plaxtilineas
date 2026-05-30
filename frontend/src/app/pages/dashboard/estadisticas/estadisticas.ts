import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EstadisticasService, CatalogStats } from '../../../services/estadisticas.service';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './estadisticas.html',
  styleUrls: ['./estadisticas.css'],
})
export class Estadisticas implements OnInit {
  
  stats: CatalogStats | null = null;
  cargando = true;
  error = '';
  
  // Filtros y paginación para la tabla de inventario
  busquedaInventario = '';
  paginaActual = 1;
  itemsPorPagina = 8;
  Math = Math;

  constructor(private estadisticasService: EstadisticasService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.error = '';
    this.estadisticasService.getCatalogStats().subscribe({
      next: (res) => {
        this.stats = res;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del catálogo', err);
        this.error = 'No se pudieron cargar las métricas. Intenta recargar la página.';
        this.cargando = false;
      }
    });
  }

  get inventarioFiltrado(): any[] {
    if (!this.stats?.inventario) return [];
    if (!this.busquedaInventario.trim()) return this.stats.inventario;
    
    const search = this.busquedaInventario.toLowerCase().trim();
    return this.stats.inventario.filter(p => 
      p.nombre?.toLowerCase().includes(search) || 
      p.categoria?.toLowerCase().includes(search) ||
      p.subcategoria?.toLowerCase().includes(search)
    );
  }

  get totalPaginas(): number {
    return Math.ceil(this.inventarioFiltrado.length / this.itemsPorPagina) || 1;
  }

  get inventarioPaginado(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.inventarioFiltrado.slice(inicio, fin);
  }

  cambiarPagina(delta: number): void {
    const nuevaPag = this.paginaActual + delta;
    if (nuevaPag >= 1 && nuevaPag <= this.totalPaginas) {
      this.paginaActual = nuevaPag;
    }
  }

  alBuscar(): void {
    this.paginaActual = 1; // Reiniciar página al buscar
  }

  getMaxCategorias(): number {
    if (!this.stats?.distribucion_categorias?.length) return 1;
    return Math.max(...this.stats.distribucion_categorias.map(c => c.cantidad));
  }

  getBarWidth(cantidad: number): string {
    const max = this.getMaxCategorias();
    return max ? `${(cantidad / max) * 100}%` : '0%';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
