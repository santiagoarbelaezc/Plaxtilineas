// src/app/services/producto-menu.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoMenu } from '../models/productoMenu.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoMenuService {
  private apiUrl = '/api/productos'; // Ajusta si tienes proxy o prod

  constructor(private http: HttpClient) {}

  obtenerPorSubcategoria(subcategoriaId: number): Observable<ProductoMenu[]> {
    const params = new HttpParams().set('subcategoria_id', subcategoriaId.toString());
    return this.http.get<ProductoMenu[]>(this.apiUrl, { params });
  }

  // Opcional: obtener por categoría completa (sin subcategoría)
  obtenerPorCategoria(categoriaId: number): Observable<ProductoMenu[]> {
    const params = new HttpParams().set('categoria_id', categoriaId.toString());
    return this.http.get<ProductoMenu[]>(this.apiUrl, { params });
  }
}
