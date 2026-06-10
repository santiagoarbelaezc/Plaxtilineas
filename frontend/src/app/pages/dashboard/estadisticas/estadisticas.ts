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
  filtroCategoria = '';
  filtroSubcategoria = '';
  filtroPrecioMin: number | null = null;
  filtroPrecioMax: number | null = null;

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

  get categoriasUnicas(): string[] {
    if (!this.stats?.inventario) return [];
    const catSet = new Set(this.stats.inventario.map(p => p.categoria).filter(c => !!c));
    return Array.from(catSet);
  }

  get subcategoriasUnicas(): string[] {
    if (!this.stats?.inventario) return [];
    let items = this.stats.inventario;
    if (this.filtroCategoria) {
      items = items.filter(p => p.categoria === this.filtroCategoria);
    }
    const subCatSet = new Set(items.map(p => p.subcategoria).filter(s => !!s));
    return Array.from(subCatSet);
  }

  alCambiarFiltros(): void {
    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.busquedaInventario = '';
    this.filtroCategoria = '';
    this.filtroSubcategoria = '';
    this.filtroPrecioMin = null;
    this.filtroPrecioMax = null;
    this.paginaActual = 1;
  }

  get inventarioFiltrado(): any[] {
    if (!this.stats?.inventario) return [];
    
    return this.stats.inventario.filter(p => {
      // 1. Búsqueda por texto
      if (this.busquedaInventario.trim()) {
        const search = this.busquedaInventario.toLowerCase().trim();
        const matchText = p.nombre?.toLowerCase().includes(search) || 
                          p.categoria?.toLowerCase().includes(search) ||
                          p.subcategoria?.toLowerCase().includes(search);
        if (!matchText) return false;
      }
      
      // 2. Filtro Categoría
      if (this.filtroCategoria && p.categoria !== this.filtroCategoria) {
        return false;
      }
      
      // 3. Filtro Subcategoría
      if (this.filtroSubcategoria && p.subcategoria !== this.filtroSubcategoria) {
        return false;
      }
      
      // 4. Filtro Precio Mínimo
      // Si el precio máximo del producto es menor que el filtro mínimo, se excluye
      if (this.filtroPrecioMin !== null && p.precio_max < this.filtroPrecioMin) {
        return false;
      }
      
      // 5. Filtro Precio Máximo
      // Si el precio mínimo del producto es mayor que el filtro máximo, se excluye
      if (this.filtroPrecioMax !== null && p.precio_min > this.filtroPrecioMax) {
        return false;
      }
      
      return true;
    });
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

  // Paginación Categorías
  paginaCategorias = 1;
  itemsPorPaginaCategorias = 4;

  get categoriasPaginadas(): any[] {
    if (!this.stats?.distribucion_categorias) return [];
    const inicio = (this.paginaCategorias - 1) * this.itemsPorPaginaCategorias;
    return this.stats.distribucion_categorias.slice(inicio, inicio + this.itemsPorPaginaCategorias);
  }

  get totalPaginasCategorias(): number {
    return Math.ceil((this.stats?.distribucion_categorias?.length || 0) / this.itemsPorPaginaCategorias) || 1;
  }

  cambiarPaginaCategorias(delta: number): void {
    const nuevaPag = this.paginaCategorias + delta;
    if (nuevaPag >= 1 && nuevaPag <= this.totalPaginasCategorias) {
      this.paginaCategorias = nuevaPag;
    }
  }

  // Paginación Alertas
  paginaAlertas = 1;
  itemsPorPaginaAlertas = 3;

  get alertasPaginadas(): any[] {
    if (!this.stats?.alertas) return [];
    const inicio = (this.paginaAlertas - 1) * this.itemsPorPaginaAlertas;
    return this.stats.alertas.slice(inicio, inicio + this.itemsPorPaginaAlertas);
  }

  get totalPaginasAlertas(): number {
    return Math.ceil((this.stats?.alertas?.length || 0) / this.itemsPorPaginaAlertas) || 1;
  }

  cambiarPaginaAlertas(delta: number): void {
    const nuevaPag = this.paginaAlertas + delta;
    if (nuevaPag >= 1 && nuevaPag <= this.totalPaginasAlertas) {
      this.paginaAlertas = nuevaPag;
    }
  }

  // Paginación PQRs
  paginaPqrs = 1;
  itemsPorPaginaPqrs = 3;

  get pqrsPaginadas(): any[] {
    if (!this.stats?.pqrs_recientes) return [];
    const inicio = (this.paginaPqrs - 1) * this.itemsPorPaginaPqrs;
    return this.stats.pqrs_recientes.slice(inicio, inicio + this.itemsPorPaginaPqrs);
  }

  get totalPaginasPqrs(): number {
    return Math.ceil((this.stats?.pqrs_recientes?.length || 0) / this.itemsPorPaginaPqrs) || 1;
  }

  cambiarPaginaPqrs(delta: number): void {
    const nuevaPag = this.paginaPqrs + delta;
    if (nuevaPag >= 1 && nuevaPag <= this.totalPaginasPqrs) {
      this.paginaPqrs = nuevaPag;
    }
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
