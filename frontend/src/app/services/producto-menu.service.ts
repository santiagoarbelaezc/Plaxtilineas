// src/app/services/producto-menu.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoMenu } from '../models/productoMenu.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoMenuService {
  private apiUrl = '/api/productos';

  constructor(private http: HttpClient) {}

  // ✅ Obtener por subcategoría usando query parameter
  obtenerPorSubcategoria(subcategoriaId: number): Observable<ProductoMenu[]> {
    const params = new HttpParams().set('subcategoria_id', subcategoriaId.toString());
    return this.http.get<ProductoMenu[]>(this.apiUrl, { params });
  }

  // ✅ Obtener por categoría usando ruta específica
  obtenerPorCategoria(categoriaId: number): Observable<ProductoMenu[]> {
    return this.http.get<ProductoMenu[]>(`${this.apiUrl}/categoria/${categoriaId}`);
  }

  // ✅ Obtener TODOS los productos (sin filtros)
  obtenerTodosLosProductos(): Observable<ProductoMenu[]> {
    return this.http.get<ProductoMenu[]>(this.apiUrl);
  }

  // ✅ Opcional: Obtener productos aleatorios
  obtenerAleatorios(limite: number = 8): Observable<ProductoMenu[]> {
    const params = new HttpParams().set('limite', limite.toString());
    return this.http.get<ProductoMenu[]>(`${this.apiUrl}/interes/aleatorios`, { params });
  }

  // ✅ Opcional: Obtener últimos productos (novedades)
  obtenerUltimosProductos(): Observable<ProductoMenu[]> {
    return this.http.get<ProductoMenu[]>(`${this.apiUrl}/novedades/ultimos`);
  }
}