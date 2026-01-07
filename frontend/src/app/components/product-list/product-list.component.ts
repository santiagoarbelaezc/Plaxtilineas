// src/app/components/product-list/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations'; 
import { ProductoMenu } from '../../models/productoMenu.model';
import { ProductoMenuService } from '../../services/producto-menu.service';
import { ProductSelectService } from '../../services/product-select.service';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-product-list-component',
  standalone: true,
  imports: [CommonModule],
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

  constructor(
    private route: ActivatedRoute,
    private productoService: ProductoMenuService,
    private productSelectService: ProductSelectService,
    private menuStateService: MenuStateService
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
      this.mensajeEstado = data.length > 0 ? mensaje : 'No se encontraron productos';
      
      console.log(`✅ ${data.length} productos cargados`);
      
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
    const precioFormateado = precioEntero.toLocaleString('es-ES');
    
    return `$ ${precioFormateado}`;
  }

  // Método público para recargar productos (útil para botones externos)
  recargarProductos(): void {
    // Reiniciar y recargar según los parámetros actuales
    this.isInitialLoad = false;
    this.route.queryParams.subscribe(params => {
      this.handleQueryParams(params);
    });
  }
}