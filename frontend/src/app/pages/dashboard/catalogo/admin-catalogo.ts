import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductosService } from '../../../services/productos.service';
import { CategoriasService } from '../../../services/categorias.service';
import { CatalogoService } from '../../../services/catalogo.service';
import { ProductoEditable } from '../../../models/producto.model';

interface CategoriaFiltro {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-admin-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-catalogo.html',
  styleUrls: ['./admin-catalogo.css']
})
export class AdminCatalogo implements OnInit {
  productos: ProductoEditable[] = [];
  productosFiltrados: ProductoEditable[] = [];
  categorias: CategoriaFiltro[] = [];

  cargando = true;
  error = false;

  // Filtros
  busqueda = '';
  categoriaSeleccionada = 0;
  ordenSeleccionado: 'nombre' | 'precio_asc' | 'precio_desc' | 'nuevos' = 'nuevos';
  vistaGrid = true; // true = cuadrícula, false = lista

  // Paginación
  paginaActual = 1;
  readonly porPagina = 24;

  // Modal detalle
  productoModal: ProductoEditable | null = null;

  // Stats
  totalProductos = 0;
  totalCategorias = 0;
  precioPromedio = 0;
  productosConVariantes = 0;

  constructor(
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    // Cargar categorías
    this.categoriasService.getCategorias().subscribe({
      next: (cats) => {
        this.categorias = cats.map(c => ({ id: c.id, nombre: c.nombre }));
        this.totalCategorias = cats.length;
      },
      error: () => {}
    });

    // Cargar productos
    this.productosService.obtenerProductos().subscribe({
      next: (prods) => {
        this.productos = prods;
        this.totalProductos = prods.length;
        this.productosConVariantes = prods.filter(p => p.variantes && p.variantes.length > 1).length;
        const precios = prods.map(p => p.precio).filter(p => p > 0);
        this.precioPromedio = precios.length ? Math.round(precios.reduce((a, b) => a + b, 0) / precios.length) : 0;
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.productos];

    if (this.busqueda.trim()) {
      const t = this.normalizar(this.busqueda);
      resultado = resultado.filter(p =>
        this.normalizar(p.nombre + ' ' + p.categoria + ' ' + p.subcategoria + ' ' + (p.material || '') + ' ' + (p.marca || '')).includes(t)
      );
    }

    if (this.categoriaSeleccionada > 0) {
      resultado = resultado.filter(p => p.categoria_id === this.categoriaSeleccionada);
    }

    switch (this.ordenSeleccionado) {
      case 'nombre':
        resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'precio_asc':
        resultado.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio_desc':
        resultado.sort((a, b) => b.precio - a.precio);
        break;
      case 'nuevos':
        resultado.sort((a, b) => (b.creado_en ?? '').localeCompare(a.creado_en ?? ''));
        break;
    }

    this.productosFiltrados = resultado;
    this.paginaActual = 1;
  }

  get productosPaginados(): ProductoEditable[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.productosFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.productosFiltrados.length / this.porPagina);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const current = this.paginaActual;
    const pages: number[] = [1];
    if (current > 3) pages.push(-1); // ellipsis
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push(-1); // ellipsis
    pages.push(total);
    return pages;
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.categoriaSeleccionada = 0;
    this.ordenSeleccionado = 'nuevos';
    this.aplicarFiltros();
  }

  imagenModalActiva = '';
  copiado = false;

  abrirModal(producto: ProductoEditable): void {
    this.productoModal = producto;
    this.imagenModalActiva = this.getImagenPrincipal(producto);
  }

  cerrarModal(): void {
    this.productoModal = null;
    this.imagenModalActiva = '';
  }

  setImagenModal(url: string): void {
    this.imagenModalActiva = url;
  }

  copiarTexto(texto: string): void {
    if (!texto) return;
    navigator.clipboard?.writeText(texto).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 1800);
    }).catch(() => {});
  }

  refrescarCatalogo(): void {
    this.catalogoService.refrescar();
    this.productos = [];
    this.productosFiltrados = [];
    this.cargarDatos();
  }

  getImagenPrincipal(producto: ProductoEditable): string {
    if (producto.imagenes?.length) {
      return producto.imagenes.find(i => i.principal)?.url ?? producto.imagenes[0].url;
    }
    return producto.imagen_url || 'assets/images/placeholder.png';
  }

  formatPrecio(precio: number): string {
    if (!precio || precio === 0) return 'Consultar';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precio);
  }

  private normalizar(texto: string): string {
    return (texto ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
