import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { CartItem } from '../models/cart.model';
import { Producto } from '../models/producto.model';
import { Variante } from '../models/variante.model';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();
  
  // Señal para saber si queremos abrir forzosamente el cart-drawer (feedback de añadir al carril)
  isOpenDrawer = new BehaviorSubject<boolean>(false);

  // Nuevos Observables
  lastAddedItem$ = new BehaviorSubject<CartItem | null>(null);
  stockError$ = new Subject<string>();

  constructor() {
    this.loadCart();
  }

  private saveCart(items: CartItem[]) {
    localStorage.setItem('plaxtilineas_cart', JSON.stringify(items));
    this.itemsSubject.next([...items]);
    this.syncCartWithBackend(items);
  }

  private syncCartWithBackend(items: CartItem[]) {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = {
      items: items.map(item => ({
        producto_id: item.producto.id,
        variante_id: item.variante?.id || null,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario
      }))
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    this.http.post(`${environment.apiUrl}/carrito/sync`, payload, { headers }).subscribe({
      error: (err) => console.warn('Error al sincronizar carrito con backend:', err)
    });
  }

  private loadCart() {
    const saved = localStorage.getItem('plaxtilineas_cart');
    if (saved) {
      this.itemsSubject.next(JSON.parse(saved));
    }
  }

  generateItemId(productoId: number, varianteId?: number): string {
    return varianteId ? `${productoId}-${varianteId}` : `${productoId}`;
  }

  addToCart(producto: Producto, cantidad: number = 1, variante?: Variante): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        title: 'Acceso Requerido',
        text: 'Debes iniciar sesión o registrarte como usuario para añadir productos al carrito.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Sesión',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#368C44',
        cancelButtonColor: '#6c757d'
      }).then(result => {
        if (result.isConfirmed) {
          window.location.href = '/login?returnUrl=' + encodeURIComponent(window.location.pathname);
        }
      });
      return false;
    }

    const items = this.itemsSubject.getValue();
    const id = this.generateItemId(producto.id, variante?.id);
    const existingIndex = items.findIndex(item => item.id === id);
    
    let cantidadResultante = cantidad;
    if (existingIndex > -1) {
      cantidadResultante = items[existingIndex].cantidad + cantidad;
    }

    // Validación estricta de stock
    // (Asumimos controlar_stock true/1 si la base de datos lo manda)
    const controlaStock = producto.controlar_stock === true || producto.controlar_stock === 1;
    if (controlaStock && producto.stock !== undefined) {
      if (cantidadResultante > producto.stock) {
        console.warn(`[Seguridad] Intento de añadir más cantidad (${cantidadResultante}) del stock disponible (${producto.stock}).`);
        this.stockError$.next(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`);
        // Bloqueamos la acción devolviendo falso
        return false;
      }
    }

    let nuevoItem: CartItem;
    if (existingIndex > -1) {
      items[existingIndex].cantidad = cantidadResultante;
      nuevoItem = items[existingIndex];
    } else {
      const precioUnitario = variante ? variante.precio : producto.precio;
      nuevoItem = {
        id,
        producto,
        variante,
        cantidad,
        precioUnitario
      };
      items.push(nuevoItem);
    }

    this.saveCart(items);
    this.lastAddedItem$.next(nuevoItem);
    // Disparar evento para abrir el drawer automáticamente
    this.openDrawer();
    return true;
  }

  removeFromCart(id: string) {
    const items = this.itemsSubject.getValue();
    const updated = items.filter(item => item.id !== id);
    this.saveCart(updated);
  }

  updateQuantity(id: string, cantidad: number): boolean {
    if (cantidad < 1) return false;
    const items = this.itemsSubject.getValue();
    const item = items.find(i => i.id === id);
    if (item) {
      // Validación estricta de stock
      const controlaStock = item.producto.controlar_stock === true || item.producto.controlar_stock === 1;
      if (controlaStock && item.producto.stock !== undefined) {
        if (cantidad > item.producto.stock) {
          console.warn(`[Seguridad] Intento de actualizar a una cantidad (${cantidad}) mayor al stock (${item.producto.stock}).`);
          this.stockError$.next(`Stock insuficiente para ${item.producto.nombre}. Disponible: ${item.producto.stock}`);
          return false;
        }
      }

      item.cantidad = cantidad;
      this.saveCart(items);
      return true;
    }
    return false;
  }

  clearCart() {
    this.saveCart([]);
  }

  getTotalItems(): number {
    return this.itemsSubject.getValue().reduce((acc, item) => acc + item.cantidad, 0);
  }

  getTotalPrice(): number {
    return this.itemsSubject.getValue().reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  }
  
  openDrawer() {
    this.isOpenDrawer.next(true);
  }
  
  closeDrawer() {
    this.isOpenDrawer.next(false);
  }

  getStockDisponible(producto: Producto, varianteId?: number): number {
    const id = this.generateItemId(producto.id, varianteId);
    const item = this.itemsSubject.getValue().find(i => i.id === id);
    const stockTotal = producto.stock ?? Infinity;
    if (!item) return stockTotal;
    return stockTotal - item.cantidad;
  }

  isAtMaxStock(item: CartItem): boolean {
    const controlaStock = item.producto.controlar_stock === true || item.producto.controlar_stock === 1;
    if (!controlaStock || item.producto.stock === undefined) return false;
    return item.cantidad >= item.producto.stock;
  }

  verificarStockEnBackend(items: { producto_id: number, variante_id?: number, cantidad: number }[]): Observable<{ valido: boolean, items_con_error: any[] }> {
    return this.http.post<{ valido: boolean, items_con_error: any[] }>(`${environment.apiUrl}/productos/verificar-stock`, { items });
  }
}
