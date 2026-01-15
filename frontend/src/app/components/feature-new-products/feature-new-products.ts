import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductosService } from '../../services/productos.service';
import { MenuStateService } from '../../services/menu-state.service';
import { ProductoEditable } from '../../models/producto.model';

@Component({
  selector: 'app-feature-new-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './feature-new-products.html',
  styleUrls: ['./feature-new-products.css']
})
export class FeatureNewProducts implements OnInit {
  productos: ProductoEditable[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private productosService: ProductosService,
    private router: Router,
    private menuStateService: MenuStateService
  ) {}

  ngOnInit(): void {
    this.cargarUltimosProductos();
    this.inicializarAOS();
  }

  cargarUltimosProductos(): void {
    this.loading = true;
    this.error = null;
    
    this.productosService.obtenerUltimosProductos().subscribe({
      next: (productos) => {
        this.productos = productos.map(p => ({
          ...p,
          editando: false
        }));
        this.loading = false;
        console.log('Productos cargados:', this.productos);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.error = 'No se pudieron cargar los productos. Por favor, intenta más tarde.';
        this.loading = false;
      }
    });
  }

  verDetalles(productoId: number): void {
    console.log('Navegando a detalles del producto:', productoId);
    
    // Limpiar la última subcategoría seleccionada
    this.menuStateService.clearLastSelectedSubcategory();
    
    // Navegar a la ruta /producto/{id}
    this.router.navigate(['/producto', productoId]);
  }

  /**
   * Ver todos los productos sin filtros
   */
  verTodosProductos(): void {
    console.log('🔍 Ver todos los productos');
    this.menuStateService.clearLastSelectedSubcategory();
    this.router.navigate(['/productos']);
  }


  inicializarAOS(): void {
    // Inicializar AOS (Animate On Scroll) si está disponible
    if (typeof (window as any).AOS !== 'undefined') {
      (window as any).AOS.init({
        duration: 600,
        easing: 'ease-in-out-cubic',
        once: true,
        offset: 100
      });
    }
  }

   formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined) return '$ 0';
    
    // Redondear el precio a entero si tiene decimales
    const precioEntero = Math.round(precio);
    
    // Formatear sin decimales
    const precioFormateado = precioEntero.toLocaleString('es-ES');
    
    return `$ ${precioFormateado}`;
}

  reload(): void {
    this.cargarUltimosProductos();
  }
}