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

const STORAGE_KEY_PRODUCTOS = 'plaxti_catalogo_cache_v2';
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
  private eventSource: EventSource | null = null;
  private pollTimer: any = null;

  constructor(private http: HttpClient) {
    this.hidratarDesdeCache();

    if (typeof window !== 'undefined') {
      this.iniciarSincronizacionTiempoReal();

      window.addEventListener('focus', () => {
        if (this.productosCargados) {
          console.log('[CatalogoService] Ventana re-enfocada: refrescando stock silenciosamente...');
          this.sincronizarCambiosInventario();
          this.refrescar();
        }
      });
    }
  }

  /**
   * Conecta con los endpoints de tiempo real del catálogo (/inventario/cambios y /inventario/stream)
   * para mantener el stock 100% sincrónico sin recargar la página.
   */
  private iniciarSincronizacionTiempoReal(): void {
    this.http
      .get<CatalogoRespuesta<{ ultimo_evento_id: number; eventos: any[] }>>(
        `${this.baseUrl}/inventario/cambios?desde=0`
      )
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res?.success && res.data && typeof res.data.ultimo_evento_id === 'number') {
          this.ultimoEventoId = res.data.ultimo_evento_id;
        }
        this.conectarStreamInventario();
        this.iniciarPollingInventario();
      });
  }

  private conectarStreamInventario(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    try {
      const url = `${this.baseUrl}/inventario/stream?desde=${this.ultimoEventoId}`;
      const es = new EventSource(url);
      this.eventSource = es;

      es.addEventListener('stock', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.procesarEventoInventario(payload);
        } catch {}
      });

      es.onerror = () => {
        try {
          es.close();
        } catch {}
        this.eventSource = null;
      };
    } catch {
      this.eventSource = null;
    }
  }

  private iniciarPollingInventario(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      this.sincronizarCambiosInventario();
    }, 4000);
  }

  /** Consulta incrementalmente GET /inventario/cambios?desde={ultimoEventoId} */
  public sincronizarCambiosInventario(): void {
    this.http
      .get<CatalogoRespuesta<{ ultimo_evento_id: number; eventos: any[] }>>(
        `${this.baseUrl}/inventario/cambios?desde=${this.ultimoEventoId}`
      )
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (!res?.success || !res.data) return;
        const eventos = res.data.eventos ?? [];
        for (const ev of eventos) {
          this.procesarEventoInventario(ev);
        }
        if (typeof res.data.ultimo_evento_id === 'number' && res.data.ultimo_evento_id > this.ultimoEventoId) {
          this.ultimoEventoId = res.data.ultimo_evento_id;
        }
      });
  }

  private procesarEventoInventario(raw: any): void {
    if (!raw || typeof raw !== 'object') return;
    const id = Number(raw.id ?? 0);
    const productoId = Number(raw.producto_id ?? 0);
    const stock = Number(raw.stock);
    if (!Number.isFinite(productoId) || productoId <= 0 || !Number.isFinite(stock) || stock < 0) {
      return;
    }
    if (id > this.ultimoEventoId) {
      this.ultimoEventoId = id;
    }
    this.actualizarStockLocal(productoId, stock);
  }

  private persistirCache(productos: ProductoEditable[]): void {
    try {
      if (typeof window !== 'undefined' && productos.length > 0) {
        const serialized = JSON.stringify(productos);
        sessionStorage.setItem(STORAGE_KEY_PRODUCTOS, serialized);
        localStorage.setItem(STORAGE_KEY_PRODUCTOS, serialized);
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
   * Hidratación instantánea desde almacenamiento local.
   */
  private hidratarDesdeCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_PRODUCTOS) || localStorage.getItem(STORAGE_KEY_PRODUCTOS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.productosSubject.next(parsed);
          this.productosCargados = true;
        }
      }
    } catch {
      // Ignorar fallos de parseo
    }
  }

  /** Todos los productos de la marca configurada con emisión reactiva. */
  getProductos(forzar = false): Observable<ProductoEditable[]> {
    if (!this.productosCargados || forzar) {
      this.cargarProductos();
    }
    return this.productosSubject.asObservable().pipe(
      filter(() => this.productosCargados)
    );
  }

  private cargarProductos(): void {
    if (this.cargando) return;
    this.cargando = true;

    const url = `${this.baseUrl}/productos/categoria/${encodeURIComponent(this.marca)}`;
    this.http.get<CatalogoRespuesta<CatalogoProductoApi[]>>(url).pipe(
      map(res => (res?.data ?? []).map(p => this.mapProducto(p))),
      catchError(err => {
        console.error('Error al cargar el catálogo externo:', err);
        return of([] as ProductoEditable[]);
      })
    ).subscribe(productos => {
      this.cargando = false;
      if (productos.length > 0) {
        this.productosCargados = true;
        this.productosSubject.next(productos);
        this.persistirCache(productos);
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
      console.log(`[CatalogoService] Stock local actualizado para producto #${productoId}: ${stockSanitizado}`);
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
      console.log(`[CatalogoService] Stock local ajustado (delta ${delta}) para producto #${productoId}: ${nuevo}`);
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
      .filter(v => v.available === undefined || Number(v.available) === 1)
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
    const precioDesde = preciosValidos.length ? Math.min(...preciosValidos) : 0;

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
      subcategoria: p.subcategory_name ?? '',
      categoria: p.category_name ?? '',
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
