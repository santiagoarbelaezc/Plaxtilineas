import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, Observable, take } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { CartItem, CartItemDetalle } from '../models/cart.model';
import { Producto } from '../models/producto.model';
import { Variante } from '../models/variante.model';
import { CatalogoService } from './catalogo.service';
import { AuthService } from './auth.service';

export interface PendingCartAction {
  producto?: Producto;
  cantidad: number;
  variante?: Variante;
  returnUrl: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private static readonly STORAGE_KEY = 'plaxtilineas_cart';
  private static readonly PENDING_ACTION_KEY = 'plaxtilineas_pending_cart_action';
  private static readonly PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutos
  /**
   * Sincronización activa con el backend Laravel y catálogo de producción.
   */
  private static readonly BACKEND_SYNC_ENABLED = true;

  private http = inject(HttpClient);
  private router = inject(Router);
  private catalogoService = inject(CatalogoService);
  private authService = inject(AuthService);

  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();

  // Señal para abrir forzosamente el cart-drawer
  isOpenDrawer = new BehaviorSubject<boolean>(false);

  // Observables de estado y notificaciones
  lastAddedItem$ = new BehaviorSubject<CartItem | null>(null);
  stockError$ = new Subject<string>();

  // Modal global cuando un usuario sin sesión intenta agregar productos al carrito
  authRequiredModal$ = new BehaviorSubject<PendingCartAction | null>(null);

  // Razón del último rechazo en addToCart ('auth_required' | 'stock_error' | null)
  lastRejectReason: 'auth_required' | 'stock_error' | null = null;

  constructor() {
    this.loadCart();

    // Escuchar cambios de sesión para limpiar al salir o hidratar/procesar pendientes al entrar
    this.authService.isLoggedIn.subscribe((loggedIn) => {
      if (!loggedIn) {
        this.clearLocalStateOnly();
      } else {
        this.loadCart();
        this.hydrateCartFromBackendAndProcessPending();
      }
    });
  }

  /**
   * Limpia únicamente la memoria local del navegador (al cerrar sesión o sin sesión)
   * sin enviar un sync vacío al servidor.
   */
  private clearLocalStateOnly(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CartService.STORAGE_KEY);
    }
    this.itemsSubject.next([]);
    this.closeDrawer();
  }

  private saveCart(items: CartItem[], syncBackend = true) {
    if (!this.authService.isAuthenticated()) {
      this.clearLocalStateOnly();
      return;
    }

    items.forEach(item => item.detalle = this.construirDetalle(item));
    try {
      localStorage.setItem(CartService.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[Carrito] No se pudo persistir en localStorage', e);
    }
    this.itemsSubject.next([...items]);
    if (syncBackend) {
      this.syncCartWithBackend(items);
    }
  }

  /** Convierte el producto del catálogo (+ variante) en el detalle de la línea del carrito */
  private construirDetalle(item: CartItem): CartItemDetalle {
    const p = item.producto;
    const v = item.variante;
    const stockMax = this.getItemStock(p, v);
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
      stock_disponible: stockMax ?? null,
      subtotal: item.precioUnitario * item.cantidad
    };
  }


  private syncCartWithBackend(items: CartItem[]) {
    if (!CartService.BACKEND_SYNC_ENABLED) {
      return;
    }
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token || !this.authService.isAuthenticated()) {
      return;
    }

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
      next: () => {
        // Refrescar inmediatamente el catálogo en memoria sin recargar página
        this.catalogoService.refrescar();
      },
      error: (err) => {
        console.error('[Carrito] Error al sincronizar con backend:', err);
        this.stockError$.next('Error al sincronizar el carrito con el servidor.');
      }
    });
  }

  /**
   * Hidrata el carrito desde el servidor al iniciar sesión y luego procesa
   * cualquier producto que el usuario haya intentado agregar antes de autenticarse.
   */
  private hydrateCartFromBackendAndProcessPending(): void {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token || !this.authService.isAuthenticated()) return;

    const currentItems = this.itemsSubject.getValue();
    if (currentItems.length > 0) {
      this.processPendingCartAction();
      return;
    }

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    this.http.get<{ data?: { items?: any[] }; items?: any[] }>(`${environment.apiUrl}/carrito`, { headers }).subscribe({
      next: (res) => {
        const backendItems = res?.data?.items || res?.items || [];
        if (Array.isArray(backendItems) && backendItems.length > 0 && this.itemsSubject.getValue().length === 0) {
          this.catalogoService.getProductos().pipe(take(1)).subscribe({
            next: (productosCatalogo: any[]) => {
              const reconstructed: CartItem[] = [];
              for (const bItem of backendItems) {
                const prod = productosCatalogo.find((p: any) => Number(p.id) === Number(bItem.producto_id));
                if (!prod) continue;
                const varianteId = bItem.variante_id ? Number(bItem.variante_id) : undefined;
                const variante = varianteId && Array.isArray((prod as any).variantes)
                  ? (prod as any).variantes.find((v: any) => Number(v.id) === varianteId)
                  : undefined;
                const id = this.generateItemId(prod.id, variante?.id);
                const precioUnitario = Number(bItem.precio_unitario) || (variante ? Number(variante.precio) : Number(prod.precio)) || 0;
                const cantidad = Math.max(1, Number(bItem.cantidad) || 1);

                reconstructed.push({
                  id,
                  producto: prod,
                  variante,
                  cantidad,
                  precioUnitario,
                  sku: prod.sku,
                  imagen_url: prod.imagen_url,
                  categoria: prod.categoria,
                  unidad_medida: prod.unidad,
                  agregadoEn: bItem.agregado_en || new Date().toISOString()
                });
              }

              if (reconstructed.length > 0) {
                this.saveCart(reconstructed, false);
              }
              this.processPendingCartAction();
            },
            error: () => this.processPendingCartAction()
          });
        } else {
          this.processPendingCartAction();
        }
      },
      error: () => {
        this.processPendingCartAction();
      }
    });
  }

  /**
   * Si el usuario intentó agregar un producto estando sin sesión y acaba de iniciar sesión,
   * ejecuta la adición automáticamente.
   */
  public processPendingCartAction(): void {
    if (typeof sessionStorage === 'undefined' || !this.authService.isAuthenticated()) return;
    try {
      const raw = sessionStorage.getItem(CartService.PENDING_ACTION_KEY);
      if (!raw) return;

      sessionStorage.removeItem(CartService.PENDING_ACTION_KEY);
      const pending: PendingCartAction = JSON.parse(raw);

      if (!pending || !pending.producto) return;
      if (Date.now() - (pending.timestamp || 0) > CartService.PENDING_TTL_MS) {
        return;
      }

      this.closeAuthModal();

      setTimeout(() => {
        if (this.authService.isAuthenticated() && pending.producto) {
          this.addToCart(pending.producto, pending.cantidad || 1, pending.variante);
        }
      }, 400);
    } catch {
      sessionStorage.removeItem(CartService.PENDING_ACTION_KEY);
    }
  }

  private loadCart() {
    if (typeof localStorage === 'undefined') return;
    // Si no está autenticado, no puede tener productos en el carrito local
    if (!this.authService.hasToken()) {
      localStorage.removeItem(CartService.STORAGE_KEY);
      this.itemsSubject.next([]);
      return;
    }

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

  /**
   * Abre el modal global solicitando iniciar sesión o registrarse para usar el carrito.
   */
  public requireAuthForCart(producto?: Producto, cantidad: number = 1, variante?: Variante): void {
    const currentUrl = this.router.url && !this.router.url.startsWith('/login')
      ? this.router.url
      : (producto?.id ? `/producto/${producto.id}` : '/productos');

    const pendingAction: PendingCartAction = {
      producto,
      cantidad,
      variante,
      returnUrl: currentUrl,
      timestamp: Date.now()
    };

    if (typeof sessionStorage !== 'undefined' && producto) {
      try {
        sessionStorage.setItem(CartService.PENDING_ACTION_KEY, JSON.stringify(pendingAction));
      } catch { }
    }

    this.authRequiredModal$.next(pendingAction);
  }

  public closeAuthModal(): void {
    this.authRequiredModal$.next(null);
  }

  public navigateToLoginFromModal(): void {
    const pending = this.authRequiredModal$.getValue();
    const returnUrl = pending?.returnUrl || this.router.url || '/';
    this.closeAuthModal();
    this.closeDrawer();
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  public navigateToRegisterFromModal(): void {
    const pending = this.authRequiredModal$.getValue();
    const returnUrl = pending?.returnUrl || this.router.url || '/';
    this.closeAuthModal();
    this.closeDrawer();
    this.router.navigate(['/login'], { queryParams: { mode: 'register', returnUrl } });
  }

  addToCart(producto: Producto, cantidad: number = 1, variante?: Variante): boolean {
    this.lastRejectReason = null;

    // 1. Validación obligatoria de sesión activa
    if (!this.authService.isAuthenticated()) {
      this.lastRejectReason = 'auth_required';
      this.requireAuthForCart(producto, cantidad, variante);
      return false;
    }

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
      this.lastRejectReason = 'stock_error';
      this.stockError$.next(`La cantidad mínima de compra para ${producto.nombre} es ${minCompra}.`);
      return false;
    }

    // Validación estricta de stock
    const stockMax = this.getItemStock(producto, variante);
    const controlaStock = this.isItemStockControlled(producto, variante);
    if (controlaStock && stockMax !== undefined) {
      if (cantidadResultante > stockMax) {
        this.lastRejectReason = 'stock_error';
        const nombreItem = variante ? `${producto.nombre} (${variante.nombre})` : producto.nombre;
        this.stockError$.next(`Stock insuficiente para ${nombreItem}. Disponible: ${stockMax}`);
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
    if (!this.authService.isAuthenticated()) {
      this.requireAuthForCart();
      return;
    }
    const items = this.itemsSubject.getValue();
    const updated = items.filter(item => item.id !== id);
    this.saveCart(updated);
  }

  updateQuantity(id: string, cantidad: number): boolean {
    if (!this.authService.isAuthenticated()) {
      this.requireAuthForCart();
      return false;
    }
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
      const stockMax = this.getItemStock(item.producto, item.variante);
      const controlaStock = this.isItemStockControlled(item.producto, item.variante);
      if (controlaStock && stockMax !== undefined) {
        if (cantidad > stockMax) {
          const nombreItem = item.variante ? `${item.producto.nombre} (${item.variante.nombre})` : item.producto.nombre;
          this.stockError$.next(`Stock insuficiente para ${nombreItem}. Disponible: ${stockMax}`);
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
    if (!this.authService.isAuthenticated()) {
      this.clearLocalStateOnly();
      return;
    }
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

  /** Obtiene el stock físico real aplicable al ítem (variante si existe, o producto base) */
  getItemStock(producto: Producto, variante?: Variante): number | undefined {
    if (variante && variante.stock !== undefined && variante.stock !== null) {
      return Number(variante.stock);
    }
    if (producto && producto.stock !== undefined && producto.stock !== null) {
      return Number(producto.stock);
    }
    return undefined;
  }

  /** Determina si el ítem debe validar stock físico */
  isItemStockControlled(producto: Producto, variante?: Variante): boolean {
    if (producto.controlar_stock === false) return false;
    const stock = this.getItemStock(producto, variante);
    return stock !== undefined;
  }

  getStockDisponible(producto: Producto, varianteId?: number): number {
    const id = this.generateItemId(producto.id, varianteId);
    const item = this.itemsSubject.getValue().find(i => i.id === id);
    const stockTotal = this.getItemStock(producto, item?.variante) ?? Infinity;
    if (!item) return stockTotal;
    return Math.max(0, stockTotal - item.cantidad);
  }

  isAtMaxStock(item: CartItem): boolean {
    const stockMax = this.getItemStock(item.producto, item.variante);
    const controlaStock = this.isItemStockControlled(item.producto, item.variante);
    if (!controlaStock || stockMax === undefined) return false;
    return item.cantidad >= stockMax;
  }

  getDisponible(item: CartItem): number | null {
    const stockMax = this.getItemStock(item.producto, item.variante);
    if (stockMax === undefined) return null;
    return Math.max(0, stockMax - item.cantidad);
  }

  verificarStockEnBackend(items: { producto_id: number, variante_id?: number, cantidad: number }[]): Observable<{ valido: boolean, items_con_error: any[] }> {
    return this.http.post<{ valido: boolean, items_con_error: any[] }>(`${environment.apiUrl}/productos/verificar-stock`, { items });
  }
}
