import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Variante } from '../models/variante.model';
import { CatalogoService } from './catalogo.service';

/** Variantes de producto. SOLO LECTURA (vienen embebidas en cada producto del catálogo externo). */
@Injectable({ providedIn: 'root' })
export class VariantesService {
  constructor(private catalogo: CatalogoService) {}

  getVariantesPorProducto(producto_id: number): Observable<Variante[]> {
    return this.catalogo
      .getProductos()
      .pipe(map(lista => lista.find(p => p.id === Number(producto_id))?.variantes ?? []));
  }

  getVariantePorId(id: number): Observable<Variante | null> {
    return this.catalogo.getProductos().pipe(
      map(lista => {
        for (const p of lista) {
          const v = p.variantes?.find(x => x.id === Number(id));
          if (v) return v;
        }
        return null;
      })
    );
  }
}