import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductoEditable } from '../models/producto.model';
import { CatalogoService } from './catalogo.service';

type ResultadoBusqueda = {
  resultados: ProductoEditable[];
  total: number;
  termino_buscado: string;
  mensaje?: string;
  sugerencias?: ProductoEditable[];
};

/**
 * Productos de la tienda. SOLO LECTURA: los datos vienen del catálogo externo
 * (ver CatalogoService). No existen métodos para crear, editar ni eliminar.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  constructor(private catalogo: CatalogoService) {}

  /** Normaliza texto para comparar sin tildes ni mayúsculas. */
  private normalizar(texto: string): string {
    return (texto ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private mezclar<T>(lista: T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  obtenerProductos(subcategoriaId?: number): Observable<ProductoEditable[]> {
    return this.catalogo.getProductos().pipe(
      map(lista =>
        subcategoriaId !== undefined
          ? lista.filter(p => p.subcategoria_id === subcategoriaId)
          : lista
      )
    );
  }

  obtenerProductosPorSubcategoria(subcategoriaId: number): Observable<ProductoEditable[]> {
    return this.obtenerProductos(subcategoriaId);
  }

  obtenerProductosPorCategoriaId(categoriaId: number): Observable<ProductoEditable[]> {
    return this.catalogo
      .getProductos()
      .pipe(map(lista => lista.filter(p => p.categoria_id === categoriaId)));
  }

  /** Productos de interés (selección aleatoria). */
  obtenerProductosAleatorios(limite: number = 8): Observable<ProductoEditable[]> {
    return this.catalogo
      .getProductos()
      .pipe(map(lista => this.mezclar(lista).slice(0, limite)));
  }

  /** Misma subcategoría (o categoría si no hay subcategoría), excluyendo el producto actual. */
  obtenerProductosRelacionados(productoId: number, limite: number = 4): Observable<ProductoEditable[]> {
    return this.catalogo.getProductos().pipe(
      map(lista => {
        const actual = lista.find(p => p.id === productoId);
        let candidatos = lista.filter(p => p.id !== productoId);
        if (actual?.subcategoria_id) {
          candidatos = candidatos.filter(p => p.subcategoria_id === actual.subcategoria_id);
        } else if (actual?.categoria_id) {
          candidatos = candidatos.filter(p => p.categoria_id === actual.categoria_id);
        }
        return this.mezclar(candidatos).slice(0, limite);
      })
    );
  }

  obtenerProductoPorId(id: number): Observable<ProductoEditable | null> {
    return this.catalogo
      .getProductos()
      .pipe(map(lista => lista.find(p => p.id === Number(id)) ?? null));
  }

  /** Últimos productos agregados al catálogo (más recientes primero). */
  obtenerUltimosProductos(): Observable<ProductoEditable[]> {
    return this.catalogo.getProductos().pipe(
      map(lista =>
        [...lista]
          .sort((a, b) => (b.creado_en ?? '').localeCompare(a.creado_en ?? ''))
          .slice(0, 2)
      )
    );
  }

  buscarProductosPorNombre(nombre: string): Observable<ResultadoBusqueda> {
    if (!nombre || nombre.trim() === '') {
      return of({
        resultados: [],
        total: 0,
        termino_buscado: '',
        mensaje: 'Por favor ingresa un término de búsqueda'
      });
    }

    const termino = this.normalizar(nombre);
    const palabras = termino.split(/\s+/).filter(Boolean);

    return this.catalogo.getProductos().pipe(
      map(lista => {
        const coincide = (p: ProductoEditable, requerirTodas: boolean) => {
          const texto = this.normalizar(
            [p.nombre, p.descripcion, p.categoria, p.subcategoria, p.material, p.marca].join(' ')
          );
          return requerirTodas
            ? palabras.every(w => texto.includes(w))
            : palabras.some(w => texto.includes(w));
        };

        const resultados = lista.filter(p => coincide(p, true));
        if (resultados.length > 0) {
          return { resultados, total: resultados.length, termino_buscado: nombre.trim() };
        }

        const sugerencias = lista.filter(p => coincide(p, false)).slice(0, 6);
        return {
          resultados: [],
          total: 0,
          termino_buscado: nombre.trim(),
          mensaje: 'No se encontraron productos para tu búsqueda',
          sugerencias
        };
      })
    );
  }

  busquedaAvanzada(filtros: {
    nombre?: string;
    categoria_id?: number;
    precio_min?: number;
    precio_max?: number;
    orden?: 'relevancia' | 'precio_asc' | 'precio_desc' | 'nombre';
    limite?: number;
  }): Observable<ProductoEditable[]> {
    return this.catalogo.getProductos().pipe(
      map(lista => {
        let res = [...lista];

        if (filtros.nombre) {
          const t = this.normalizar(filtros.nombre);
          res = res.filter(p => this.normalizar(`${p.nombre} ${p.descripcion}`).includes(t));
        }
        if (filtros.categoria_id) {
          res = res.filter(p => p.categoria_id === filtros.categoria_id);
        }
        if (filtros.precio_min !== undefined) {
          res = res.filter(p => p.precio >= filtros.precio_min!);
        }
        if (filtros.precio_max !== undefined) {
          res = res.filter(p => p.precio <= filtros.precio_max!);
        }

        switch (filtros.orden) {
          case 'precio_asc':
            res.sort((a, b) => a.precio - b.precio);
            break;
          case 'precio_desc':
            res.sort((a, b) => b.precio - a.precio);
            break;
          case 'nombre':
            res.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        }

        return filtros.limite ? res.slice(0, filtros.limite) : res;
      })
    );
  }
}