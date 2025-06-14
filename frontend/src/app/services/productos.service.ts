import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
