import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoEditable } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private apiUrl = 'http://localhost:3000/api/productos'; // Cambia si usas otra URL

  constructor(private http: HttpClient) {}

  obtenerProductos(subcategoriaId?: number): Observable<ProductoEditable[]> {
    let params = new HttpParams();
    if (subcategoriaId !== undefined) {
      params = params.set('subcategoria_id', subcategoriaId.toString());
    }
    return this.http.get<ProductoEditable[]>(this.apiUrl, { params });
  }

  crearProducto(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  actualizarProducto(id: number, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
