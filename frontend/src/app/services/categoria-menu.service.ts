import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoriaConSubcategorias } from '../models/categoriaMenu.model';
import { environment } from '../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaMenuService {
  private apiUrl = `${environment.apiUrl}/categorias/con-subcategorias`; // Ajusta si usas proxy o URL completa

  constructor(private http: HttpClient) {}

  obtenerCategorias(): Observable<CategoriaConSubcategorias[]> {
    return this.http.get<CategoriaConSubcategorias[]>(this.apiUrl);
  }
}
