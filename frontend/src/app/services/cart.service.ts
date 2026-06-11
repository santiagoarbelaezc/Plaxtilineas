import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from '../models/cart.model';
import { Producto } from '../models/producto.model';
import { Variante } from '../models/variante.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();
  
  // Señal para saber si queremos abrir forzosamente el cart-drawer (feedback de añadir al carril)
  isOpenDrawer = new BehaviorSubject<boolean>(false);

  constructor() {
    this.loadCart();
  }

  private saveCart(items: CartItem[]) {
    localStorage.setItem('plaxtilineas_cart', JSON.stringify(items));
    this.itemsSubject.next(items);
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
        // Bloqueamos la acción devolviendo falso
        return false;
      }
    }

    if (existingIndex > -1) {
      items[existingIndex].cantidad = cantidadResultante;
    } else {
      const precioUnitario = variante ? variante.precio : producto.precio;
      items.push({
        id,
        producto,
        variante,
        cantidad,
        precioUnitario
      });
    }

    this.saveCart(items);
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
}
