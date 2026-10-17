import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CatalogoService } from './catalogo.service';

/**
 * Categorías de la tienda. SOLO LECTURA (catálogo externo).
 * El ícono se toma de la imagen del primer producto de cada categoría.
 */
@Injectable({ providedIn: 'root' })
export class CategoriasService {
  constructor(private catalogo: CatalogoService) { }

  getCategorias(): Observable<any[]> {
    return combineLatest([this.catalogo.getCategorias(), this.catalogo.getProductos()]).pipe(
      map(([categorias, productos]) =>
        categorias
          .map(c => {
            const delaCategoria = productos.filter(p => p.categoria_id === c.id);
            return {
              id: c.id,
              nombre: c.nombre,
              icono_url: delaCategoria.find(p => !!p.imagen_url)?.imagen_url ?? '',
              subcategorias: c.subcategorias,
              total_productos: delaCategoria.length
            };
          })
          // Solo categorías que realmente tienen productos de esta marca
          .filter(c => c.total_productos > 0)
      )
    );
  }

  getIdCategoriaPorNombre(nombre: string): Observable<{ success: boolean, categoria: { id: number, nombre: string } }> {
    const buscado = (nombre ?? '').trim().toLowerCase();
    return this.catalogo.getCategorias().pipe(
      map(categorias => {
        const c = categorias.find(x => x.nombre.toLowerCase() === buscado);
        return c
          ? { success: true, categoria: { id: c.id, nombre: c.nombre } }
          : { success: false, categoria: { id: 0, nombre } };
      })
    );
  }
}
