// src/app/features/products/product-list/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations'; 
import { ProductoMenu } from '../../../models/productoMenu.model';
import { ProductoMenuService } from '../../../services/producto-menu.service';
import { AddToCartBtnComponent } from '../../../cart/add-to-cart-btn/add-to-cart-btn.component';
import { ProductSelectService } from '../../../services/product-select.service';
import { MenuStateService } from '../../../services/menu-state.service';
import { ProductoBackgroundComponent, ProductoBackgroundImage } from '../producto-background/producto-background';
import { ProductoBackgroundService } from '../../../services/producto-background.service';
import { optimizeForCard } from '../../../utils/cloudinary-optimizer';

@Component({
  selector: 'app-product-list-component',
  standalone: true,
  imports: [CommonModule, ProductoBackgroundComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProductListComponent implements OnInit {
  productos: ProductoMenu[] = [];
  cargando = false;
  filtroActual: string = '';
  mensajeEstado: string = '';
  private isInitialLoad = true;

  // Propiedades para paginación
  currentPage = 1;
  itemsPerPage = 9;
  totalPages = 0;

  // Propiedades para ProductoBackground
  mostrarProductoBackground = false;
  tituloProductoBackground: string = '';
  imagenesProductoBackground: ProductoBackgroundImage[] = [];
  categoriaActual: string = '';

  constructor(
    private route: ActivatedRoute,
    private productoService: ProductoMenuService,
    private productSelectService: ProductSelectService,
    private menuStateService: MenuStateService,
    private productoBackgroundService: ProductoBackgroundService
  ) {}

  ngOnInit() {
    // Suscribirse a cambios en los query params
    this.route.queryParams.subscribe(params => {
      this.handleQueryParams(params);
    });
  }

  private handleQueryParams(params: any): void {
    const subcatId = parseInt(params['subcategoria_id']);
    const catId = parseInt(params['categoria_id']);
    
    // Determinar qué acción tomar basado en los parámetros
    if (!isNaN(subcatId)) {
      this.cargarProductosPorSubcategoria(subcatId);
    } else if (!isNaN(catId)) {
      this.cargarProductosPorCategoria(catId);
    } else if (this.isInitialLoad) {
      this.handleInitialLoad();
    } else {
      this.cargarTodosLosProductos();
    }
    
    this.isInitialLoad = false;
  }

  private handleInitialLoad(): void {
    const savedSubcategoryId = this.menuStateService.getLastSelectedSubcategory();
    
    if (savedSubcategoryId) {
      console.log(`📌 Cargando subcategoría guardada: ${savedSubcategoryId}`);
      
      setTimeout(() => {
        this.cargarProductosPorSubcategoria(savedSubcategoryId);
        
        // Actualizar la URL para reflejar el estado
        this.updateUrlWithParam('subcategoria_id', savedSubcategoryId);
      }, 300);
    } else {
      console.log('ℹ️ No hay subcategoría guardada');
      this.cargarTodosLosProductos();
    }
  }

  private updateUrlWithParam(key: string, value: any): void {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value.toString());
    window.history.replaceState({}, '', url.toString());
  }

  private cargarTodosLosProductos(): void {
    this.cargando = true;
    this.filtroActual = 'Todos los productos';
    this.mensajeEstado = '';
    
    console.log('🔍 Cargando TODOS los productos...');
    
    this.productoService.obtenerTodosLosProductos().subscribe({
      next: (data: ProductoMenu[]) => {
        this.handleSuccessResponse(data, `Se encontraron ${data.length} productos`);
      },
      error: (error) => {
        this.handleErrorResponse(error);
      }
    });
  }

  private cargarProductosPorSubcategoria(subcatId: number): void {
    this.cargando = true;
    this.filtroActual = `Subcategoría`;
    this.mensajeEstado = `Cargando productos...`;
    
    console.log(`🔄 Cargando productos para subcategoría: ${subcatId}`);
    
    this.productoService.obtenerPorSubcategoria(subcatId).subscribe({
      next: (data: ProductoMenu[]) => {
        // Extraer nombre de categoría del primer producto
        if (data.length > 0) {
          this.categoriaActual = data[0].categoria;
          this.actualizarProductoBackground(this.categoriaActual);
        }
        this.handleSuccessResponse(data, `Subcategoría: ${data.length} productos`);
      },
      error: (error) => {
        this.handleErrorResponse(error);
      }
    });
  }

  private cargarProductosPorCategoria(catId: number): void {
    this.cargando = true;
    this.filtroActual = `Categoría`;
    this.mensajeEstado = `Cargando productos...`;
    
    console.log(`🏷️ Cargando productos para categoría: ${catId}`);
    
    this.productoService.obtenerPorCategoria(catId).subscribe({
      next: (data: ProductoMenu[]) => {
        // Extraer nombre de categoría del primer producto
        if (data.length > 0) {
          this.categoriaActual = data[0].categoria;
          this.actualizarProductoBackground(this.categoriaActual);
        }
        this.handleSuccessResponse(data, `Categoría: ${data.length} productos`);
      },
      error: (error) => {
        this.handleErrorResponse(error);
      }
    });
  }

  private handleSuccessResponse(data: ProductoMenu[], mensaje: string = ''): void {
    setTimeout(() => {
      this.productos = data;
      this.cargando = false;
      this.currentPage = 1; // Resetear a primera página
      this.totalPages = Math.ceil(data.length / this.itemsPerPage);
      this.mensajeEstado = data.length > 0 ? mensaje : 'No se encontraron productos';
      
      console.log(`✅ ${data.length} productos cargados (${this.totalPages} páginas)`);
      
      // Solo hacer scroll si hay productos
      if (data.length > 0) {
        this.hacerScrollSuave();
      }
    }, 300);
  }

  private handleErrorResponse(error: any): void {
    console.error('❌ Error al cargar productos:', error);
    
    setTimeout(() => {
      this.productos = [];
      this.cargando = false;
      this.mensajeEstado = 'Error al cargar los productos';
    }, 300);
  }

  private hacerScrollSuave(): void {
    setTimeout(() => {
      const seccion = document.getElementById('productos-seccion');
      if (seccion) {
        const offset = 100;
        const seccionTop = seccion.getBoundingClientRect().top + window.pageYOffset;
        
        // Solo hacer scroll si la sección no es visible
        const isVisible = (seccionTop - offset) > window.pageYOffset && 
                          (seccionTop - offset) < (window.pageYOffset + window.innerHeight);
        
        if (!isVisible) {
          window.scrollTo({
            top: seccionTop - offset,
            behavior: 'smooth'
          });
        }
      }
    }, 300);
  }

  verDetalles(producto: ProductoMenu) {
    this.productSelectService.verDetallesProducto(producto);
  }

  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    const precioEntero = Math.round(precio);
    const precioFormateado = precioEntero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${precioFormateado}`;
  }

  // Getter para productos de la página actual
  get productosPaginaActual(): ProductoMenu[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.productos.slice(startIndex, endIndex);
  }

  // Métodos de paginación
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.currentPage = pagina;
      this.hacerScrollSuave();
    }
  }

  paginaAnterior(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.hacerScrollSuave();
    }
  }

  paginaSiguiente(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.hacerScrollSuave();
    }
  }

  // Método para obtener el rango de productos mostrado
  get rangoProductos(): string {
    if (this.productos.length === 0) return '';
    
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.productos.length);
    return `${start}-${end}`;
  }

  // Método para obtener páginas para mostrar en controles
  get paginasVisibles(): number[] {
    const paginas: number[] = [];
    const maxPaginasVisibles = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPaginasVisibles / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPaginasVisibles - 1);

    if (endPage - startPage + 1 < maxPaginasVisibles) {
      startPage = Math.max(1, endPage - maxPaginasVisibles + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  // Método público para recargar productos (útil para botones externos)
  recargarProductos(): void {
    // Reiniciar y recargar según los parámetros actuales
    this.isInitialLoad = false;
    this.route.queryParams.subscribe(params => {
      this.handleQueryParams(params);
    });
  }

  /**
   * Actualizar ProductoBackground según la categoría actual
   * @param nombreCategoria - Nombre de la categoría
   */
  private actualizarProductoBackground(nombreCategoria: string): void {
    const config = this.productoBackgroundService.obtenerConfiguracionPorCategoria(nombreCategoria);
    
    if (config) {
      this.mostrarProductoBackground = config.mostrar;
      this.tituloProductoBackground = config.titulo;
      this.imagenesProductoBackground = config.imagenes;
      console.log(`✅ ProductoBackground configurado para: ${nombreCategoria}`);
    } else {
      this.mostrarProductoBackground = false;
      console.log(`⚠️ No hay configuración de ProductoBackground para: ${nombreCategoria}`);
    }
  }

  optimizarImagen(url: string): string {
    return optimizeForCard(url, 400); // Usamos 400px de ancho para las tarjetas del catálogo
  }
}