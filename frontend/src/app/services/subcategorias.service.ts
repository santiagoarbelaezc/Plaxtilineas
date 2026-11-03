import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Subcategoria } from '../models/subcategoria.model';
import { CatalogoService } from './catalogo.service';

/** Subcategorías de la tienda. SOLO LECTURA (catálogo externo). */
@Injectable({ providedIn: 'root' })
export class SubcategoriasService {
  constructor(private catalogo: CatalogoService) {}

  getSubcategorias(): Observable<Subcategoria[]> {
    return this.catalogo.getCategorias().pipe(
      map(categorias =>
        categorias.flatMap(c =>
          c.subcategorias.map(s => ({
            id: s.id,
            nombre: s.nombre,
            categoria_id: c.id,
            categoria: c.nombre
          }))
        )
      )
    );
  }
}
