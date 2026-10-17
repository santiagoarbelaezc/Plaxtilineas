import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
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

export interface CatalogoCategoria {
  id: number;
  nombre: string;
  marca: string;
  icono_url: string;
  subcategorias: { id: number; nombre: string; categoria_id: number }[];
}

/**
 * Única puerta de entrada al catálogo externo.
 * - Solo GET público (sin token). No existe ninguna operación de escritura.
 * - Una sola petición HTTP cacheada (shareReplay) para toda la app.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly baseUrl = environment.apiCatalogoUrl;
  private readonly marca = environment.catalogoMarca;

  private productos$?: Observable<ProductoEditable[]>;
  private categorias$?: Observable<CatalogoCategoria[]>;

  constructor(private http: HttpClient) {}

  /** Todos los productos de la marca configurada. */
  getProductos(): Observable<ProductoEditable[]> {
    if (!this.productos$) {
      const url = `${this.baseUrl}/productos/categoria/${encodeURIComponent(this.marca)}`;
      this.productos$ = this.http.get<CatalogoRespuesta<CatalogoProductoApi[]>>(url).pipe(
        map(res => (res?.data ?? []).map(p => this.mapProducto(p))),
        catchError(err => {
          console.error('Error al cargar el catálogo externo:', err);
          this.productos$ = undefined; // permitir reintento en la próxima llamada
          return of([] as ProductoEditable[]);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.productos$;
  }

  /** Categorías (y subcategorías) de la marca configurada. */
  getCategorias(): Observable<CatalogoCategoria[]> {
    if (!this.categorias$) {
      this.categorias$ = this.http
        .get<CatalogoRespuesta<any[]>>(`${this.baseUrl}/categorias`)
        .pipe(
          map(res =>
            (res?.data ?? [])
              .filter(c => this.mismaMarca(c.brand))
              .map(c => ({
                id: Number(c.id),
                nombre: String(c.name ?? '').trim(),
                marca: c.brand,
                icono_url: '',
                subcategorias: (c.subcategories ?? []).map((s: any) => ({
                  id: Number(s.id),
                  nombre: String(s.name ?? '').trim(),
                  categoria_id: Number(s.category_id ?? c.id)
                }))
              }))
          ),
          catchError(err => {
            console.error('Error al cargar categorías del catálogo externo:', err);
            this.categorias$ = undefined;
            return of([] as CatalogoCategoria[]);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.categorias$;
  }

  /** Fuerza una nueva lectura del catálogo en la próxima consulta. */
  refrescar(): void {
    this.productos$ = undefined;
    this.categorias$ = undefined;
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
        stock: v.stock !== undefined ? Number(v.stock) : undefined
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
      stock: Number(p.stock) || 0,
      // El catálogo externo no controla inventario en la tienda.
      controlar_stock: 0,
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
