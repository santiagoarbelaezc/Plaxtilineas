import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../enviroments/environment';
import { ProductoEditable } from '../models/producto.model';
import { Variante } from '../models/variante.model';

/** Respuesta cruda del catálogo externo (solo lectura). */
interface CatalogoRespuesta<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface CatalogoVarianteApi {
  id: number;
  product_id: number;
  name: string;
  sku?: string;
  available?: number;
  stock?: number;
  price: string | number;
  created_at?: string;
}

interface CatalogoProductoApi {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  material?: string | null;
  category?: string;
  stock?: number;
  price?: string | number;
  marca?: string | null;
  created_at?: string;
  category_id?: number | null;
  subcategory_id?: number | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  images?: { url: string; description?: string; is_primary?: boolean }[];
  colors?: string[];
  variants?: CatalogoVarianteApi[];
}

const STORAGE_KEY_PRODUCTOS = 'plaxti_catalogo_cache_v3';
const STORAGE_KEY_PRODUCTOS_TS = 'plaxti_catalogo_cache_v3_ts';
const LEGACY_STORAGE_KEYS_PRODUCTOS = ['plaxti_catalogo_cache_v2', 'plaxti_catalogo_cache_v1', 'plaxti_catalogo_cache'];
const STORAGE_KEY_CATEGORIAS = 'plaxti_categorias_cache_v2';

export interface CatalogoCategoria {
  id: number;
  nombre: string;
  marca: string;
  icono_url: string;
  created_at?: string;
  updated_at?: string;
  subcategorias: { id: number; nombre: string; categoria_id: number; created_at?: string; updated_at?: string }[];
}

/**
 * Única puerta de entrada al catálogo externo.
 * - Soporta actualización reactiva de stock en tiempo real (sin recargar la página).
 * - Consume /inventario/cambios y /inventario/stream del catálogo externo para mantener el stock 100% sincrónico.
 * - Implementa Stale-While-Revalidate con caché persistente para despliegue instantáneo.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly baseUrl = environment.apiCatalogoUrl;
  private readonly marca = environment.catalogoMarca;

  private productosSubject = new BehaviorSubject<ProductoEditable[]>([]);
  public productos$ = this.productosSubject.asObservable();
  private productosCargados = false;
  private cargando = false;

  private categorias$?: Observable<CatalogoCategoria[]>;

  private ultimoEventoId = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private erroresConsecutivosSync = 0;
  private backoffHasta = 0;
  private ultimoFocusRefresh = 0;
  private ultimaCargaProductosMs = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
  private readonly POLL_INTERVAL_MS = 60_000;
  private readonly FOCUS_COOLDOWN_MS = 60_000;

  constructor(private http: HttpClient) {
    this.hidratarDesdeCache();

    if (typeof window !== 'undefined') {
      this.iniciarPollingInventario();

      window.addEventListener('focus', () => {
        const ahora = Date.now();
        if (
          this.productosCargados &&
          ahora >= this.backoffHasta &&
          ahora - this.ultimoFocusRefresh >= this.FOCUS_COOLDOWN_MS
        ) {
          this.ultimoFocusRefresh = ahora;
          if (this.estaCacheExpirada()) {
            this.categorias$ = undefined;
            this.cargarProductos();
          } else {
            this.sincronizarCambiosInventario();
          }
        }
      });
    }
  }

  private estaCacheExpirada(): boolean {
    return Date.now() - this.ultimaCargaProductosMs >= this.CACHE_TTL_MS;
  }

  private iniciarPollingInventario(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (Date.now() < this.backoffHasta) {
        return;
      }
      if (this.productosCargados && this.estaCacheExpirada()) {
        this.categorias$ = undefined;
        this.cargarProductos();
      } else {
        this.sincronizarCambiosInventario();
      }
    }, this.POLL_INTERVAL_MS);
  }

  /** Consulta incrementalmente GET /inventario/cambios?since_id={ultimoEventoId} con circuit-breaker ante 5xx */
  public sincronizarCambiosInventario(): void {
    if (Date.now() < this.backoffHasta) {
      return;
    }

    this.http
      .get<CatalogoRespuesta<{
        enabled?: boolean;
        reset?: boolean;
        last_id?: number;
        events?: any[];
        ultimo_evento_id?: number;
        eventos?: any[];
      }>>(
        `${this.baseUrl}/inventario/cambios?since_id=${this.ultimoEventoId}`
      )
      .subscribe({
        next: res => {
          this.erroresConsecutivosSync = 0;
          this.backoffHasta = 0;
          if (!res?.success || !res.data) return;

          const data = res.data;
          const lastId = Number(data.last_id ?? data.ultimo_evento_id ?? 0);

          if (data.reset) {
            this.ultimoEventoId = lastId;
            return;
          }

          const eventos = Array.isArray(data.events)
            ? data.events
            : (Array.isArray(data.eventos) ? data.eventos : []);

          for (const ev of eventos) {
            this.procesarEventoInventario(ev);
          }

          if (Number.isFinite(lastId) && lastId > this.ultimoEventoId) {
            this.ultimoEventoId = lastId;
          }
        },
        error: () => {
          this.erroresConsecutivosSync++;
          const esperaMs = Math.min(300_000, 15_000 * Math.pow(2, this.erroresConsecutivosSync - 1));
          this.backoffHasta = Date.now() + esperaMs;
        }
      });
  }

  private procesarEventoInventario(raw: any): void {
    if (!raw || typeof raw !== 'object') return;
    const id = Number(raw.id ?? 0);
    const productoId = Number(raw.producto_id ?? 0);
    const stock = Number(raw.stock_nuevo ?? raw.stock);
    if (!Number.isFinite(productoId) || productoId <= 0 || !Number.isFinite(stock) || stock < 0) {
      return;
    }
    if (id > this.ultimoEventoId) {
      this.ultimoEventoId = id;
    }
    this.actualizarStockLocal(productoId, stock);
  }

  /**
   * Verifica estrictamente si un producto tiene un precio válido (> 0)
   * ya sea en su precio base o en al menos una variante activa.
   */
  public tienePrecioValido(p: Partial<ProductoEditable> | null | undefined): boolean {
    if (!p) return false;
    const precioDirecto = Number(p.precio ?? 0);
    if (Number.isFinite(precioDirecto) && precioDirecto > 0) {
      return true;
    }
    if (Array.isArray(p.variantes) && p.variantes.length > 0) {
      return p.variantes.some(v => {
        const pv = Number(v?.precio ?? 0);
        return Number.isFinite(pv) && pv > 0;
      });
    }
    return false;
  }

  /**
   * Limpia variantes sin precio (<= 0) y recalcula el precio base del producto.
   * Retorna null si el producto no cuenta con ningún precio válido (> 0).
   */
  public sanitizarProductoConPrecio(p: ProductoEditable | null | undefined): ProductoEditable | null {
    if (!p) return null;
    const variantesValidas = Array.isArray(p.variantes)
      ? p.variantes.filter(v => {
          const pv = Number(v?.precio ?? 0);
          return Number.isFinite(pv) && pv > 0;
        })
      : [];

    const preciosVariantes = variantesValidas.map(v => Number(v.precio));
    const precioDirecto = Number(p.precio ?? 0);
    const precioFinal = preciosVariantes.length > 0
      ? Math.min(...preciosVariantes)
      : (Number.isFinite(precioDirecto) && precioDirecto > 0 ? precioDirecto : 0);

    if (precioFinal <= 0) {
      return null;
    }

    return {
      ...p,
      precio: precioFinal,
      variantes: variantesValidas
    };
  }

  private persistirCache(productos: ProductoEditable[], actualizarTimestamp = false): void {
    try {
      if (typeof window !== 'undefined') {
        const soloConPrecio = productos
          .map(p => this.sanitizarProductoConPrecio(p))
          .filter((p): p is ProductoEditable => p !== null);

        if (soloConPrecio.length > 0) {
          const serialized = JSON.stringify(soloConPrecio);
          sessionStorage.setItem(STORAGE_KEY_PRODUCTOS, serialized);
          localStorage.setItem(STORAGE_KEY_PRODUCTOS, serialized);
          if (actualizarTimestamp) {
            const ts = String(this.ultimaCargaProductosMs || Date.now());
            sessionStorage.setItem(STORAGE_KEY_PRODUCTOS_TS, ts);
            localStorage.setItem(STORAGE_KEY_PRODUCTOS_TS, ts);
          }
        } else {
          sessionStorage.removeItem(STORAGE_KEY_PRODUCTOS);
          localStorage.removeItem(STORAGE_KEY_PRODUCTOS);
          sessionStorage.removeItem(STORAGE_KEY_PRODUCTOS_TS);
          localStorage.removeItem(STORAGE_KEY_PRODUCTOS_TS);
        }
      }
    } catch {
      // Si quotaExceeded, continuar sin romper
    }
  }

  /** Obtiene el stock actual en memoria de un producto del catálogo */
  getStockActual(productoId: number): number | undefined {
    const p = this.productosSubject.value.find(item => Number(item.id) === Number(productoId));
    if (p && p.stock !== undefined && p.stock !== null) {
      return Number(p.stock);
    }
    return undefined;
  }

  /**
   * Hidratación instantánea desde almacenamiento local (filtrando estrictamente productos sin precio).
   * Si la caché tiene más de 5 minutos, se muestra de inmediato y se revalida en segundo plano.
   */
  private hidratarDesdeCache(): void {
    if (typeof window === 'undefined') return;
    try {
      for (const oldKey of LEGACY_STORAGE_KEYS_PRODUCTOS) {
        sessionStorage.removeItem(oldKey);
        localStorage.removeItem(oldKey);
      }

      const rawTs = sessionStorage.getItem(STORAGE_KEY_PRODUCTOS_TS) || localStorage.getItem(STORAGE_KEY_PRODUCTOS_TS);
      const parsedTs = rawTs ? Number(rawTs) : 0;
      if (Number.isFinite(parsedTs) && parsedTs > 0) {
        this.ultimaCargaProductosMs = parsedTs;
      }

      const raw = sessionStorage.getItem(STORAGE_KEY_PRODUCTOS) || localStorage.getItem(STORAGE_KEY_PRODUCTOS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const productosValidos = parsed
            .map((p: ProductoEditable) => this.sanitizarProductoConPrecio(p))
            .filter((p): p is ProductoEditable => p !== null);

          if (productosValidos.length > 0) {
            this.productosSubject.next(productosValidos);
            this.productosCargados = true;
          }
        }
      }
    } catch {
      // Ignorar fallos de parseo
    }
  }

  /**
   * Todos los productos de la marca configurada con emisión reactiva.
   * Garantiza que NINGÚN componente reciba productos con precio <= 0.
   * Renueva silenciosamente si la caché local superó el TTL de 5 minutos.
   */
  getProductos(forzar = false): Observable<ProductoEditable[]> {
    const debeRenovar = !this.productosCargados || forzar || (this.estaCacheExpirada() && Date.now() >= this.backoffHasta);
    if (debeRenovar) {
      this.cargarProductos();
    }
    return this.productosSubject.asObservable().pipe(
      filter(() => this.productosCargados),
      map(lista => lista.filter(p => this.tienePrecioValido(p)))
    );
  }

  private cargarProductos(): void {
    if (this.cargando) return;
    this.cargando = true;

    const url = `${this.baseUrl}/productos/categoria/${encodeURIComponent(this.marca)}`;
    this.http.get<CatalogoRespuesta<CatalogoProductoApi[]>>(url).pipe(
      map(res => ({
        ok: true,
        productos: (res?.data ?? [])
          .map(p => this.mapProducto(p))
          .map(p => this.sanitizarProductoConPrecio(p))
          .filter((p): p is ProductoEditable => p !== null)
      })),
      catchError(err => {
        console.error('Error al cargar el catálogo externo:', err);
        this.erroresConsecutivosSync++;
        const esperaMs = Math.min(300_000, 15_000 * Math.pow(2, this.erroresConsecutivosSync - 1));
        this.backoffHasta = Date.now() + esperaMs;
        return of({ ok: false, productos: [] as ProductoEditable[] });
      })
    ).subscribe(({ ok, productos }) => {
      this.cargando = false;
      if (ok && productos.length > 0) {
        this.erroresConsecutivosSync = 0;
        this.backoffHasta = 0;
        this.ultimaCargaProductosMs = Date.now();
        this.productosCargados = true;
        this.productosSubject.next(productos);
        this.persistirCache(productos, true);
      } else if (!this.productosCargados) {
        this.productosCargados = true;
        this.productosSubject.next([]);
      }
    });
  }

  /** Actualiza inmediatamente el stock de un producto en memoria sin F5 */
  actualizarStockLocal(productoId: number, nuevoStock: number): void {
    const actuales = this.productosSubject.value;
    const p = actuales.find(item => Number(item.id) === Number(productoId));
    if (p) {
      const stockSanitizado = Math.max(0, Number(nuevoStock) || 0);
      p.stock = stockSanitizado;
      p.cantidad = stockSanitizado;
      if (p.variantes) {
        p.variantes.forEach(v => (v.stock = stockSanitizado));
      }
      this.productosSubject.next([...actuales]);
      this.persistirCache(actuales);
    }
  }

  /** Ajusta el stock sumando o restando unidades en memoria */
  ajustarStockLocal(productoId: number, delta: number): void {
    const actuales = this.productosSubject.value;
    const p = actuales.find(item => Number(item.id) === Number(productoId));
    if (p) {
      const nuevo = Math.max(0, (Number(p.stock) || 0) + delta);
      p.stock = nuevo;
      p.cantidad = nuevo;
      if (p.variantes) {
        p.variantes.forEach(v => (v.stock = nuevo));
      }
      this.productosSubject.next([...actuales]);
      this.persistirCache(actuales);
    }
  }

  /** Categorías (y subcategorías) de la marca configurada. */
  getCategorias(): Observable<CatalogoCategoria[]> {
    if (!this.categorias$) {
      this.categorias$ = this.http
        .get<CatalogoRespuesta<any[]>>(`${this.baseUrl}/categorias`)
        .pipe(
          map(res => {
            const list = (res?.data ?? [])
              .filter(c => this.mismaMarca(c.brand))
              .map(c => ({
                id: Number(c.id),
                nombre: String(c.name ?? '').trim(),
                marca: c.brand,
                icono_url: '',
                created_at: c.created_at,
                updated_at: c.updated_at,
                subcategorias: (c.subcategories ?? []).map((s: any) => ({
                  id: Number(s.id),
                  nombre: String(s.name ?? '').trim(),
                  categoria_id: Number(s.category_id ?? c.id),
                  created_at: s.created_at,
                  updated_at: s.updated_at
                }))
              }));
            try {
              if (typeof window !== 'undefined' && list.length > 0) {
                sessionStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(list));
                localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(list));
              }
            } catch {}
            return list;
          }),
          catchError(err => {
            console.error('Error al cargar categorías del catálogo externo:', err);
            try {
              if (typeof window !== 'undefined') {
                const cached = sessionStorage.getItem(STORAGE_KEY_CATEGORIAS) || localStorage.getItem(STORAGE_KEY_CATEGORIAS);
                if (cached) return of(JSON.parse(cached) as CatalogoCategoria[]);
              }
            } catch {}
            this.categorias$ = undefined;
            return of([] as CatalogoCategoria[]);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.categorias$;
  }

  /** Retorna todas las categorías del catálogo sin filtrar por marca (para el dashboard). */
  getTodasLasCategorias(): Observable<CatalogoCategoria[]> {
    return this.http
      .get<CatalogoRespuesta<any[]>>(`${this.baseUrl}/categorias`)
      .pipe(
        map(res =>
          (res?.data ?? []).map(c => ({
            id: Number(c.id),
            nombre: String(c.name ?? '').trim(),
            marca: c.brand ?? 'Plaxtilineas',
            icono_url: '',
            created_at: c.created_at,
            updated_at: c.updated_at,
            subcategorias: (c.subcategories ?? []).map((s: any) => ({
              id: Number(s.id),
              nombre: String(s.name ?? '').trim(),
              categoria_id: Number(s.category_id ?? c.id),
              created_at: s.created_at,
              updated_at: s.updated_at
            }))
          }))
        ),
        catchError(err => {
          console.error('Error al cargar todas las categorías del catálogo externo:', err);
          return of([] as CatalogoCategoria[]);
        })
      );
  }

  /** Fuerza una nueva lectura del catálogo en segundo plano sin recargar página. */
  refrescar(): void {
    this.categorias$ = undefined;
    this.cargando = false;
    this.cargarProductos();
  }

  private mismaMarca(brand?: string | null): boolean {
    return (brand ?? '').trim().toLowerCase() === this.marca.trim().toLowerCase();
  }

  private mapProducto(p: CatalogoProductoApi): ProductoEditable {
    const stockProducto = p.stock !== undefined && p.stock !== null ? Number(p.stock) : undefined;
    const variantes: Variante[] = (p.variants ?? [])
      .filter(v => (v.available === undefined || Number(v.available) === 1) && (Number(v.price) || 0) > 0)
      .map(v => ({
        id: v.id,
        nombre: (v.name ?? '').trim(),
        precio: Number(v.price) || 0,
        producto_id: p.id,
        creado_en: v.created_at ?? '',
        sku: v.sku,
        stock: stockProducto !== undefined ? stockProducto : (v.stock !== undefined && v.stock !== null ? Number(v.stock) : undefined)
      }));

    const preciosValidos = variantes.map(v => v.precio).filter(n => n > 0);
    const precioDirecto = Number(p.price) || 0;
    const precioDesde = preciosValidos.length
      ? Math.min(...preciosValidos)
      : (precioDirecto > 0 ? precioDirecto : 0);

    const imagenes = (p.images ?? []).map(i => ({
      url: i.url,
      descripcion: i.description,
      principal: !!i.is_primary
    }));
    const principal = imagenes.find(i => i.principal) ?? imagenes[0];

    return {
      id: p.id,
      nombre: (p.name ?? '').trim(),
      descripcion: p.description ?? '',
      cantidad: Number(p.stock) || 0,
      precio: precioDesde,
      imagen_url: principal?.url ?? '',
      subcategoria_id: Number(p.subcategory_id) || 0,
      subcategoria: (p.subcategory_name ?? '').trim(),
      categoria: (p.category_name ?? p.category ?? '').trim(),
      stock: stockProducto ?? 0,
      controlar_stock: 1,
      slug: p.slug,
      material: p.material && p.material !== 'null' ? p.material : undefined,
      marca: p.marca ?? undefined,
      colores: p.colors ?? [],
      imagenes,
      creado_en: p.created_at,
      categoria_id: Number(p.category_id) || 0,
      variantes,
      editando: false
    };
  }
}
