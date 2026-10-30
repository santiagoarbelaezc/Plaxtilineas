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
 * - Sincroniza en memoria y mediante peticiones silenciosas en segundo plano.
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

  constructor(private http: HttpClient) {
    this.hidratarDesdeCache();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.productosCargados) {
          console.log('[CatalogoService] Ventana re-enfocada: refrescando stock silenciosamente...');
          this.refrescar();
        }
      });
    }
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
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(productos));
            localStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(productos));
          }
        } catch {
          // Si quotaExceeded, continuar sin romper
        }
      } else if (!this.productosCargados) {
        this.productosCargados = true;
        this.productosSubject.next([]);
      }
    });
  }

  /** Actualiza inmediatamente el stock de un producto en memoria sin F5 */
  actualizarStockLocal(productoId: number, nuevoStock: number): void {
    const actuales = this.productosSubject.value;
    const p = actuales.find(item => item.id === productoId);
    if (p) {
      p.stock = nuevoStock;
      p.cantidad = nuevoStock;
      if (p.variantes) {
        p.variantes.forEach(v => v.stock = nuevoStock);
      }
      this.productosSubject.next([...actuales]);
      console.log(`[CatalogoService] Stock local actualizado para producto #${productoId}: ${nuevoStock}`);
    }
  }

  /** Ajusta el stock sumando o restando unidades en memoria */
  ajustarStockLocal(productoId: number, delta: number): void {
    const actuales = this.productosSubject.value;
    const p = actuales.find(item => item.id === productoId);
    if (p) {
      const nuevo = Math.max(0, (p.stock ?? 0) + delta);
      p.stock = nuevo;
      p.cantidad = nuevo;
      if (p.variantes) {
        p.variantes.forEach(v => v.stock = nuevo);
      }
      this.productosSubject.next([...actuales]);
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
    const variantes: Variante[] = (p.variants ?? [])
      .filter(v => v.available === undefined || Number(v.available) === 1)
      .map(v => ({
        id: v.id,
        nombre: (v.name ?? '').trim(),
        precio: Number(v.price) || 0,
        producto_id: p.id,
        creado_en: v.created_at ?? '',
        sku: v.sku,
        stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : (p.stock !== undefined && p.stock !== null ? Number(p.stock) : undefined)
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
      stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0,
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
