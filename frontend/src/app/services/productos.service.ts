import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { ProductoEditable } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private apiUrl = '/api/productos';

  constructor(private http: HttpClient) {}

  obtenerProductos(subcategoriaId?: number): Observable<ProductoEditable[]> {
    let params = new HttpParams();
    if (subcategoriaId !== undefined) {
      params = params.set('subcategoria_id', subcategoriaId.toString());
    }
    return this.http.get<ProductoEditable[]>(this.apiUrl, { params });
  }

  // NUEVO: Obtener productos por subcategoría (todos los productos de una subcategoría)
  obtenerProductosPorSubcategoria(subcategoriaId: number): Observable<ProductoEditable[]> {
    return this.http.get<ProductoEditable[]>(`${this.apiUrl}/subcategoria/${subcategoriaId}`).pipe(
      catchError(error => {
        console.error('Error al obtener productos por subcategoría:', error);
        return of([]); // Retorna un array vacío en caso de error
      })
    );
  }

  obtenerProductosPorCategoriaId(categoriaId: number): Observable<ProductoEditable[]> {
    return this.http.get<ProductoEditable[]>(`${this.apiUrl}/categoria/${categoriaId}`).pipe(
      catchError(error => {
        console.error('Error al obtener productos por categoría ID:', error);
        return of([]); // Retorna un array vacío en caso de error
      })
    );
  }

  // NUEVO: Obtener productos aleatorios (productos de interés)
  obtenerProductosAleatorios(limite: number = 8): Observable<ProductoEditable[]> {
    let params = new HttpParams();
    if (limite !== 8) { // Solo agregar el parámetro si es diferente al valor por defecto
      params = params.set('limite', limite.toString());
    }
    return this.http.get<ProductoEditable[]>(`${this.apiUrl}/interes/aleatorios`, { params }).pipe(
      catchError(error => {
        console.error('Error al obtener productos aleatorios:', error);
        return of([]); // Retorna un array vacío en caso de error
      })
    );
  }

  // NUEVO: Obtener productos relacionados (misma subcategoría excluyendo producto actual)
  obtenerProductosRelacionados(productoId: number, limite: number = 4): Observable<ProductoEditable[]> {
    let params = new HttpParams()
      .set('producto_id', productoId.toString())
      .set('limite', limite.toString());
    
    return this.http.get<ProductoEditable[]>(`${this.apiUrl}/relacionados/por-producto`, { params }).pipe(
      catchError(error => {
        console.error('Error al obtener productos relacionados:', error);
        return of([]); // Retorna un array vacío en caso de error
      })
    );
  }

  crearProducto(token: string, data: FormData): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  actualizarProducto(token: string, id: number, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  eliminarProducto(token: string, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  obtenerProductoPorId(id: number): Observable<ProductoEditable | null> {
    return this.http.get<ProductoEditable>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Error al obtener producto por ID:', error);
        return of(null);
      })
    );
  }
  // Versión simple (siempre 2 productos)
obtenerUltimosProductos(): Observable<ProductoEditable[]> {
  return this.http.get<ProductoEditable[]>(`${this.apiUrl}/novedades/ultimos`).pipe(
    catchError(error => {
      console.error('Error al obtener los últimos productos:', error);
      return of([]);
    })
  );
}
}