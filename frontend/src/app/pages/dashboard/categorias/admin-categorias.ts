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
  totalMarcas = 0;

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

        // Cargar todas las categorías del catálogo
        this.catalogoService.getTodasLasCategorias().subscribe({
          next: (cats) => {
            const marcasSet = new Set<string>();

            this.categorias = cats.map(c => {
              if (c.marca) marcasSet.add(c.marca);

              // Productos asociados por ID o por nombre
              const prodsCat = this.productos.filter(p => 
                (p.categoria_id && p.categoria_id === c.id) ||
                (p.categoria && this.normalizar(p.categoria) === this.normalizar(c.nombre))
              );

              return {
                ...c,
                total_productos: prodsCat.length,
                productos_asociados: prodsCat,
                total_subcategorias: (c.subcategorias || []).length
              };
            });

            this.marcasDisponibles = ['Todas', ...Array.from(marcasSet)];
            this.totalCategorias = this.categorias.length;
            this.totalSubcategorias = this.categorias.reduce((acc, curr) => acc + curr.total_subcategorias, 0);
            this.categoriasConProductos = this.categorias.filter(c => c.total_productos > 0).length;
            this.totalMarcas = marcasSet.size;

            this.aplicarFiltros();
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error al cargar categorías:', err);
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

  aplicarFiltros(): void {
    let resultado = [...this.categorias];

    // 1. Filtro por búsqueda de texto
    if (this.busqueda.trim()) {
      const q = this.normalizar(this.busqueda);
      resultado = resultado.filter(c => {
        const enNombre = this.normalizar(c.nombre).includes(q);
        const enMarca = this.normalizar(c.marca || '').includes(q);
        const enSubcategorias = (c.subcategorias || []).some(s => this.normalizar(s.nombre).includes(q));
        return enNombre || enMarca || enSubcategorias;
      });
    }

    // 2. Filtro por marca
    if (this.marcaSeleccionada !== 'Todas') {
      resultado = resultado.filter(c => c.marca === this.marcaSeleccionada);
    }

    // 3. Filtro categorías con productos
    if (this.filtroConProductos) {
      resultado = resultado.filter(c => c.total_productos > 0);
    }

    // 4. Filtro categorías con subcategorías
    if (this.filtroConSubcategorias) {
      resultado = resultado.filter(c => c.total_subcategorias > 0);
    }

    // 5. Ordenamiento
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

  limpiarFiltros(): void {
    this.busqueda = '';
    this.marcaSeleccionada = 'Todas';
    this.filtroConProductos = false;
    this.filtroConSubcategorias = false;
    this.ordenSeleccionado = 'nombre_asc';
    this.aplicarFiltros();
  }

  seleccionarMarca(marca: string): void {
    this.marcaSeleccionada = marca;
    this.aplicarFiltros();
  }

  getCantidadPorMarca(marca: string): number {
    if (marca === 'Todas') {
      return this.categorias.length;
    }
    return this.categorias.filter(c => c.marca === marca).length;
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
