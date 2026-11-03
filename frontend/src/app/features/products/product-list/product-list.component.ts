// src/app/features/products/product-list/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations'; 
import { ProductoEditable } from '../../../models/producto.model';
import { ProductosService } from '../../../services/productos.service';
import { CatalogoService } from '../../../services/catalogo.service';
import { ProductSelectService } from '../../../services/product-select.service';
import { MenuStateService } from '../../../services/menu-state.service';
import { ProductoBackgroundComponent, ProductoBackgroundImage } from '../producto-background/producto-background';
import { ProductoBackgroundService } from '../../../services/producto-background.service';
import { PrecioOfertaService } from '../../../services/precio-oferta.service';
import { optimizeForCard } from '../../../utils/cloudinary-optimizer';

@Component({
  selector: 'app-product-list-component',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductoBackgroundComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('0.35s cubic-bezier(0.16, 1, 0.3, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProductListComponent implements OnInit {
  todosLosProductos: ProductoEditable[] = [];
  productos: ProductoEditable[] = [];
  cargando = true;
  error = false;

  filtroTipo: 'Categoría' | 'Subcategoría' | '' = '';
  filtroNombre: string = '';
  categoriaActual: string = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 0;

  // Propiedades para ProductoBackground
  mostrarProductoBackground = false;
  tituloProductoBackground: string = '';
  imagenesProductoBackground: ProductoBackgroundImage[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private catalogoService: CatalogoService,
    private productSelectService: ProductSelectService,
    private menuStateService: MenuStateService,
    private productoBackgroundService: ProductoBackgroundService,
    public precioOfertaService: PrecioOfertaService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  /**
   * Carga los productos desde el catálogo centralizado oficial
   */
  cargarCatalogo(): void {
    this.cargando = true;
    this.error = false;

    this.productosService.obtenerProductos().subscribe({
      next: (prods) => {
        this.todosLosProductos = prods ?? [];
        this.cargando = false;

        // Suscribirse a los parámetros de la URL para filtrar
        this.route.queryParams.subscribe(params => {
          this.procesarParametrosURL(params);
        });
      },
      error: (err) => {
        console.error('Error al cargar catálogo de productos:', err);
        this.error = true;
        this.cargando = false;
      }
    });
  }

  private procesarParametrosURL(params: any): void {
    const subcatId = parseInt(params['subcategoria_id']);
    const catId = parseInt(params['categoria_id']);

    if (!isNaN(subcatId)) {
      this.filtrarPorSubcategoria(subcatId);
    } else if (!isNaN(catId)) {
      this.filtrarPorCategoria(catId);
    } else {
      this.mostrarTodos();
    }
  }

  private mostrarTodos(): void {
    this.productos = [...this.todosLosProductos];
    this.filtroTipo = '';
    this.filtroNombre = '';
    this.categoriaActual = '';
    this.mostrarProductoBackground = false;
    this.actualizarPaginacion();
  }

  private filtrarPorSubcategoria(subcatId: number): void {
    const filtrados = this.todosLosProductos.filter(p => p.subcategoria_id === subcatId);
    this.productos = filtrados;
    this.filtroTipo = 'Subcategoría';

    if (filtrados.length > 0) {
      this.filtroNombre = filtrados[0].subcategoria || `Subcategoría #${subcatId}`;
      this.categoriaActual = filtrados[0].categoria || '';
      this.actualizarProductoBackground(this.categoriaActual);
    } else {
      this.filtroNombre = `Subcategoría #${subcatId}`;
      this.mostrarProductoBackground = false;
    }

    this.actualizarPaginacion();
  }

  private filtrarPorCategoria(catId: number): void {
    const filtrados = this.todosLosProductos.filter(p => p.categoria_id === catId);
    this.productos = filtrados;
    this.filtroTipo = 'Categoría';

    if (filtrados.length > 0) {
      this.filtroNombre = filtrados[0].categoria || `Categoría #${catId}`;
      this.categoriaActual = filtrados[0].categoria || '';
      this.actualizarProductoBackground(this.categoriaActual);
    } else {
      this.filtroNombre = `Categoría #${catId}`;
      this.mostrarProductoBackground = false;
    }

    this.actualizarPaginacion();
  }

  private actualizarPaginacion(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.productos.length / this.itemsPerPage) || 1;
    this.hacerScrollSuave();
  }

  verTodosLosProductos(): void {
    this.menuStateService.clearLastSelectedSubcategory();
    this.router.navigate(['/productos']);
  }

  verDetalles(producto: ProductoEditable): void {
    this.productSelectService.verDetallesProducto(producto as any);
  }

  // Precios y formato
  formatearPrecio(precio: number): string {
    return this.precioOfertaService.formatearPrecio(precio);
  }

  obtenerPrecioReferencia(precioReal: number): string {
    const precioRef = this.precioOfertaService.calcularPrecioReferencia(precioReal, 25);
    return this.precioOfertaService.formatearPrecio(precioRef);
  }

  formatearNombre(nombre: string): string {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  optimizarImagen(url: string): string {
    return optimizeForCard(url, 400);
  }

  // Paginación
  get productosPaginaActual(): ProductoEditable[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.productos.slice(start, start + this.itemsPerPage);
  }

  get rangoProductos(): string {
    if (this.productos.length === 0) return '';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.productos.length);
    return `${start} - ${end}`;
  }

  get paginasVisibles(): number[] {
    const paginas: number[] = [];
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end = Math.min(this.totalPages, start + max - 1);

    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1);
    }

    for (let i = start; i <= end; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.currentPage = pagina;
      this.hacerScrollSuave();
    }
  }

  paginaAnterior(): void {
    if (this.currentPage > 1) {
      this.cambiarPagina(this.currentPage - 1);
    }
  }

  paginaSiguiente(): void {
    if (this.currentPage < this.totalPages) {
      this.cambiarPagina(this.currentPage + 1);
    }
  }

  private hacerScrollSuave(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      const seccion = document.getElementById('productos-seccion');
      if (seccion) {
        const offset = 80;
        const seccionTop = seccion.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: Math.max(0, seccionTop - offset),
          behavior: 'smooth'
        });
      }
    }, 150);
  }

  private actualizarProductoBackground(nombreCategoria: string): void {
    if (!nombreCategoria) {
      this.mostrarProductoBackground = false;
      return;
    }
    const config = this.productoBackgroundService.obtenerConfiguracionPorCategoria(nombreCategoria);
    if (config) {
      this.mostrarProductoBackground = config.mostrar;
      this.tituloProductoBackground = config.titulo;
      this.imagenesProductoBackground = config.imagenes;
    } else {
      this.mostrarProductoBackground = false;
    }
  }
}