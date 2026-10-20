import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CategoriaConSubcategorias } from '../models/categoriaMenu.model';
import { CatalogoService } from './catalogo.service';
import { environment } from '../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaMenuService {
  private apiUrl = `${environment.apiUrl}/categorias/con-subcategorias`;

  constructor(
    private http: HttpClient,
    private catalogoService: CatalogoService
  ) {}

  obtenerCategorias(): Observable<CategoriaConSubcategorias[]> {
    return forkJoin({
      cats: this.catalogoService.getCategorias(),
      prods: this.catalogoService.getProductos()
    }).pipe(
      map(({ cats, prods }) => {
        // Filtrar exclusivamente categorías oficiales de Plaxtilineas
        const plaxtiCats = (cats ?? []).filter(c =>
          (c.marca ?? 'Plaxtilineas').trim().toLowerCase() === 'plaxtilineas'
        );

        return plaxtiCats.map(c => {
          const prodsCat = (prods ?? []).filter(p =>
            p.categoria_id === c.id ||
            (p.categoria && p.categoria.trim().toLowerCase() === c.nombre.trim().toLowerCase())
          );

          const subcategorias = (c.subcategorias || []).map(s => {
            const count = prodsCat.filter(p =>
              p.subcategoria_id === s.id ||
              (p.subcategoria && p.subcategoria.trim().toLowerCase() === s.nombre.trim().toLowerCase())
            ).length;

            return {
              id: s.id,
              nombre: s.nombre,
              cantidad: count
            };
          });

          return {
            id: c.id,
            nombre: c.nombre,
            cantidad: prodsCat.length,
            subcategorias: subcategorias
          };
        });
      }),
      catchError(err => {
        console.error('Error cargando categorías desde catálogo central, usando fallback local:', err);
        return this.http.get<CategoriaConSubcategorias[]>(this.apiUrl).pipe(
          catchError(() => of([] as CategoriaConSubcategorias[]))
        );
      })
    );
  }
}
