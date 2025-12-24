import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProductoMenu } from '../models/productoMenu.model';

@Injectable({
  providedIn: 'root'
})
export class ProductSelectService {
  private productoSeleccionadoSubject = new BehaviorSubject<ProductoMenu | null>(null);
  private historialProductosSubject = new BehaviorSubject<ProductoMenu[]>([]);
  
  productoSeleccionado$: Observable<ProductoMenu | null> = 
    this.productoSeleccionadoSubject.asObservable();
  
  historialProductos$: Observable<ProductoMenu[]> = 
    this.historialProductosSubject.asObservable();

  constructor(private router: Router) {
    // Restaurar historial al iniciar
    this.restaurarHistorial();
  }

  /**
   * Navegar a la página de detalles del producto
   */
  verDetallesProducto(producto: ProductoMenu): void {
    // Guardar el producto seleccionado
    this.productoSeleccionadoSubject.next(producto);
    
    // Agregar al historial
    this.agregarAlHistorial(producto);
    
    // Navegar a la página de detalles
    this.router.navigate(['/producto', producto.id], {
      state: { producto: producto }
    });
  }

  /**
   * Seleccionar producto (para casos donde no se navega inmediatamente)
   */
  seleccionarProducto(producto: ProductoMenu): void {
    this.productoSeleccionadoSubject.next(producto);
    this.agregarAlHistorial(producto);
  }

  /**
   * Agregar producto al historial
   */
  private agregarAlHistorial(producto: ProductoMenu): void {
    const historialActual = this.historialProductosSubject.value;
    
    // Filtrar para evitar duplicados
    const nuevoHistorial = historialActual.filter(p => p.id !== producto.id);
    
    // Agregar al inicio del historial
    nuevoHistorial.unshift(producto);
    
    // Mantener solo los últimos 10 productos
    const historialLimitado = nuevoHistorial.slice(0, 10);
    
    this.historialProductosSubject.next(historialLimitado);
    
    // Guardar en sessionStorage
    sessionStorage.setItem('historialProductos', JSON.stringify(historialLimitado));
  }

  /**
   * Obtener producto por ID
   */
  obtenerProductoPorId(id: number, productosDisponibles: ProductoMenu[]): ProductoMenu | undefined {
    return productosDisponibles.find(producto => producto.id === id);
  }

  /**
   * Obtener producto actualmente seleccionado
   */
  getProductoSeleccionado(): ProductoMenu | null {
    return this.productoSeleccionadoSubject.value;
  }

  /**
   * Limpiar selección
   */
  limpiarSeleccion(): void {
    this.productoSeleccionadoSubject.next(null);
  }

  /**
   * Restaurar historial desde sessionStorage
   */
  restaurarHistorial(): void {
    const historialGuardado = sessionStorage.getItem('historialProductos');
    if (historialGuardado) {
      try {
        const historial = JSON.parse(historialGuardado) as ProductoMenu[];
        this.historialProductosSubject.next(historial);
      } catch (error) {
        console.error('Error al restaurar historial:', error);
        sessionStorage.removeItem('historialProductos');
      }
    }
  }

  /**
   * Obtener historial completo
   */
  getHistorial(): ProductoMenu[] {
    return this.historialProductosSubject.value;
  }
}