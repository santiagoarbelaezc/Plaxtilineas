import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CatalogoService, CatalogoCategoria } from '../../../services/catalogo.service';
import { ProductosService } from '../../../services/productos.service';
import { ProductoEditable } from '../../../models/producto.model';

export interface CategoriaConDetalles extends CatalogoCategoria {
  total_productos: number;
  productos_asociados: ProductoEditable[];
  total_subcategorias: number;
}

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-categorias.html',
  styleUrls: ['./admin-categorias.css']
})
export class AdminCategorias implements OnInit {
  categorias: CategoriaConDetalles[] = [];
  categoriasFiltradas: CategoriaConDetalles[] = [];
  productos: ProductoEditable[] = [];

  cargando = true;
  error = false;

  // Filtros
  busqueda = '';
  marcaSeleccionada = 'Todas';
  marcasDisponibles: string[] = [];
  filtroConProductos = false;
  filtroConSubcategorias = false;
  ordenSeleccionado: 'nombre_asc' | 'nombre_desc' | 'subcategorias_desc' | 'productos_desc' = 'nombre_asc';
  vistaGrid = true; // true = Cuadrícula, false = Tabla

  // Paginación
  paginaActual = 1;
  readonly porPagina = 12;

  // Modal de Detalle
  categoriaModal: CategoriaConDetalles | null = null;

  // Estadísticas globales
  totalCategorias = 0;
  totalSubcategorias = 0;
  categoriasConProductos = 0;
  categoriasConSubcategorias = 0;
  totalProductosVinculados = 0;

  constructor(
    private catalogoService: CatalogoService,
    private productosService: ProductosService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    // Cargar productos en paralelo para cruzar con categorías
    this.productosService.obtenerProductos().subscribe({
      next: (prods) => {
        this.productos = prods;

        // Cargar exclusivamente las categorías de Plaxtilineas
        this.catalogoService.getCategorias().subscribe({
          next: (cats) => {
            // Filtrar estrictamente solo marca Plaxtilineas (excluyendo Espumas y otras)
            const plaxtilineasOnly = cats.filter(c => 
              (c.marca ?? 'Plaxtilineas').trim().toLowerCase() === 'plaxtilineas'
            );

            this.categorias = plaxtilineasOnly.map(c => {
              // Productos asociados por ID o por nombre
              const prodsCat = this.productos.filter(p => 
                (p.categoria_id && p.categoria_id === c.id) ||
                (p.categoria && this.normalizar(p.categoria) === this.normalizar(c.nombre))
              );

              return {
                ...c,
                marca: 'Plaxtilineas',
                total_productos: prodsCat.length,
                productos_asociados: prodsCat,
                total_subcategorias: (c.subcategorias || []).length
              };
            });

            this.totalCategorias = this.categorias.length;
            this.totalSubcategorias = this.categorias.reduce((acc, curr) => acc + curr.total_subcategorias, 0);
            this.categoriasConProductos = this.categorias.filter(c => c.total_productos > 0).length;
            this.categoriasConSubcategorias = this.categorias.filter(c => c.total_subcategorias > 0).length;
            this.totalProductosVinculados = this.categorias.reduce((acc, curr) => acc + curr.total_productos, 0);

            this.aplicarFiltros();
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error al cargar categorías de Plaxtilineas:', err);
            this.error = true;
            this.cargando = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.error = true;
        this.cargando = false;
      }
    });
  }

  filtroActivo: 'todas' | 'con_productos' | 'con_subcategorias' | 'sin_subcategorias' = 'todas';

  aplicarFiltros(): void {
    let resultado = [...this.categorias];

    // 1. Filtro por búsqueda de texto
    if (this.busqueda.trim()) {
      const q = this.normalizar(this.busqueda);
      resultado = resultado.filter(c => {
        const enNombre = this.normalizar(c.nombre).includes(q);
        const enSubcategorias = (c.subcategorias || []).some(s => this.normalizar(s.nombre).includes(q));
        return enNombre || enSubcategorias;
      });
    }

    // 2. Filtros de estado / producto
    if (this.filtroActivo === 'con_productos' || this.filtroConProductos) {
      resultado = resultado.filter(c => c.total_productos > 0);
    }

    if (this.filtroActivo === 'con_subcategorias' || this.filtroConSubcategorias) {
      resultado = resultado.filter(c => c.total_subcategorias > 0);
    }

    if (this.filtroActivo === 'sin_subcategorias') {
      resultado = resultado.filter(c => c.total_subcategorias === 0);
    }

    // 3. Ordenamiento
    resultado.sort((a, b) => {
      switch (this.ordenSeleccionado) {
        case 'nombre_desc':
          return b.nombre.localeCompare(a.nombre);
        case 'subcategorias_desc':
          return b.total_subcategorias - a.total_subcategorias || a.nombre.localeCompare(b.nombre);
        case 'productos_desc':
          return b.total_productos - a.total_productos || a.nombre.localeCompare(b.nombre);
        case 'nombre_asc':
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });

    this.categoriasFiltradas = resultado;
    this.paginaActual = 1;
  }

  setFiltroRapido(tipo: 'todas' | 'con_productos' | 'con_subcategorias' | 'sin_subcategorias'): void {
    this.filtroActivo = tipo;
    this.filtroConProductos = tipo === 'con_productos';
    this.filtroConSubcategorias = tipo === 'con_subcategorias';
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroActivo = 'todas';
    this.filtroConProductos = false;
    this.filtroConSubcategorias = false;
    this.ordenSeleccionado = 'nombre_asc';
    this.aplicarFiltros();
  }

  get categoriasSinSubcategorias(): number {
    return Math.max(0, this.totalCategorias - this.categoriasConSubcategorias);
  }

  refrescarCatalogo(): void {
    this.catalogoService.refrescar();
    this.cargarDatos();
  }

  // Paginación
  get totalPaginas(): number {
    return Math.ceil(this.categoriasFiltradas.length / this.porPagina) || 1;
  }

  get categoriasPaginadas(): CategoriaConDetalles[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.categoriasFiltradas.slice(inicio, inicio + this.porPagina);
  }

  cambiarPagina(nueva: number): void {
    if (nueva >= 1 && nueva <= this.totalPaginas) {
      this.paginaActual = nueva;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Modales
  abrirModal(cat: CategoriaConDetalles): void {
    this.categoriaModal = cat;
  }

  cerrarModal(): void {
    this.categoriaModal = null;
  }

  // Utilidades
  normalizar(texto: string): string {
    return (texto ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return 'No registrada';
    try {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return fecha;
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return fecha;
    }
  }
}
