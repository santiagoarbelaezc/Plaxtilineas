import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { CartItem, CartItemDetalle } from '../models/cart.model';
import { Producto } from '../models/producto.model';
import { Variante } from '../models/variante.model';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private static readonly STORAGE_KEY = 'plaxtilineas_cart';
  /**
   * Mientras el backend del carrito no exista, el carrito vive solo en el frontend.
   * Ver docs/BACKEND_CARRITO.md para activar la sincronización.
   */
  private static readonly BACKEND_SYNC_ENABLED = false;

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
    items.forEach(item => item.detalle = this.construirDetalle(item));
    try {
      localStorage.setItem(CartService.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[Carrito] No se pudo persistir en localStorage', e);
    }
    this.itemsSubject.next([...items]);
    this.syncCartWithBackend(items);
  }

  /** Convierte el producto del catálogo (+ variante) en el detalle de la línea del carrito */
  private construirDetalle(item: CartItem): CartItemDetalle {
    const p = item.producto;
    const v = item.variante;
    const controla = p.controlar_stock === true || p.controlar_stock === 1;
    return {
      producto_id: p.id,
      variante_id: v?.id ?? null,
      nombre: p.nombre,
      variante_nombre: v?.nombre ?? null,
      sku: p.sku ?? null,
      slug: p.slug ?? null,
      categoria: p.categoria ?? null,
      subcategoria: p.subcategoria ?? null,
      material: p.material ?? null,
      marca: p.marca ?? null,
      imagen_url: p.imagen_url ?? null,
      unidad: p.unidad || 'unidad',
      precio_unitario: item.precioUnitario,
      cantidad: item.cantidad,
      minimo_compra: p.minimo_compra || 1,
      stock_disponible: controla && p.stock !== undefined ? p.stock : null,
      subtotal: item.precioUnitario * item.cantidad
    };
  }

  private syncCartWithBackend(items: CartItem[]) {
    if (!CartService.BACKEND_SYNC_ENABLED) return;
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
      error: (err) => this.stockError$.next('Error al sincronizar el carrito con el servidor.')
    });
  }

  private loadCart() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(CartService.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) this.itemsSubject.next(parsed);
      }
    } catch {
      localStorage.removeItem(CartService.STORAGE_KEY);
    }
  }

  generateItemId(productoId: number, varianteId?: number): string {
    return varianteId ? `${productoId}-${varianteId}` : `${productoId}`;
  }

  addToCart(producto: Producto, cantidad: number = 1, variante?: Variante): boolean {
    // Normalizar tipos que pueden llegar como string desde el catálogo/API
    producto = { ...producto, precio: Number(producto.precio) || 0 };
    if (variante) variante = { ...variante, precio: Number(variante.precio) || 0 };
    cantidad = Math.max(1, Math.floor(Number(cantidad) || 1));

    const items = this.itemsSubject.getValue();
    const id = this.generateItemId(producto.id, variante?.id);
    const existingIndex = items.findIndex(item => item.id === id);
    
    let cantidadResultante = cantidad;
    if (existingIndex > -1) {
      cantidadResultante = items[existingIndex].cantidad + cantidad;
    }

    // Validación de cantidad mínima por producto
    const minCompra = producto.minimo_compra || 1;
    if (cantidadResultante < minCompra) {
      this.stockError$.next(`La cantidad mínima de compra para ${producto.nombre} es ${minCompra}.`);
      return false;
    }

    // Validación estricta de stock
    const controlaStock = producto.controlar_stock === true || producto.controlar_stock === 1;
    if (controlaStock && producto.stock !== undefined) {
      if (cantidadResultante > producto.stock) {
        this.stockError$.next(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`);
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
        precioUnitario,
        sku: producto.sku,
        imagen_url: producto.imagen_url,
        categoria: producto.categoria,
        unidad_medida: producto.unidad,
        agregadoEn: new Date().toISOString()
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
      // Validación de cantidad mínima por producto
      const minCompra = item.producto.minimo_compra || 1;
      if (cantidad < minCompra) {
        this.stockError$.next(`La cantidad mínima de compra para ${item.producto.nombre} es ${minCompra}.`);
        return false;
      }

      // Validación estricta de stock
      const controlaStock = item.producto.controlar_stock === true || item.producto.controlar_stock === 1;
      if (controlaStock && item.producto.stock !== undefined) {
        if (cantidad > item.producto.stock) {
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

  // ─── Métodos de precio desglosado ───────────────────────────────────────────

  /** Suma de precio × cantidad de todos los ítems (sin IVA ni envío) */
  getSubtotal(): number {
    return this.itemsSubject.getValue().reduce(
      (acc, item) => acc + item.precioUnitario * item.cantidad, 0
    );
  }

  /** IVA ya incluido en el precio */
  getIVA(): number {
    return 0;
  }

  /** Tarifa plana de envío */
  getCostoEnvio(): number {
    return 10_000;
  }

  /** Total final = subtotal + IVA + envío */
  getTotalFinal(): number {
    return this.getSubtotal() + this.getIVA() + this.getCostoEnvio();
  }

  /** @deprecated Usar getTotalFinal() */
  getTotalPrice(): number {
    return this.getTotalFinal();
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
