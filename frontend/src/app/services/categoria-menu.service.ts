import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CategoriaConSubcategorias } from '../models/categoriaMenu.model';
import { CatalogoService } from './catalogo.service';
import { ProductosService } from './productos.service';
import { environment } from '../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaMenuService {
  private apiUrl = `${environment.apiUrl}/categorias/con-subcategorias`;

  constructor(
    private http: HttpClient,
    private catalogoService: CatalogoService,
    private productosService: ProductosService
  ) {}

  private normalizar(texto: string): string {
    return (texto ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  obtenerCategorias(): Observable<CategoriaConSubcategorias[]> {
    return combineLatest([
      this.catalogoService.getCategorias(),
      this.productosService.obtenerProductos()
    ]).pipe(
      map(([cats, prods]) => {
        // Filtrar estrictamente solo marca Plaxtilineas (igual que en admin-categorias)
        const plaxtiCats = (cats ?? []).filter(c =>
          (c.marca ?? 'Plaxtilineas').trim().toLowerCase() === 'plaxtilineas'
        );

        return plaxtiCats.map(c => {
          // Cruzar productos por ID o por nombre normalizado (igual que en admin-categorias)
          const prodsCat = (prods ?? []).filter(p =>
            (p.categoria_id && p.categoria_id === c.id) ||
            (p.categoria && this.normalizar(p.categoria) === this.normalizar(c.nombre))
          );

          const subcategorias = (c.subcategorias || []).map(s => {
            const count = prodsCat.filter(p =>
              (p.subcategoria_id && p.subcategoria_id === s.id) ||
              (p.subcategoria && this.normalizar(p.subcategoria) === this.normalizar(s.nombre))
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
