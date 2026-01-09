import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoriaIndex } from '../models/categoriaIndex.model';
import { environment } from '../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private apiUrl = `${environment.apiUrl}categorias`;

  constructor(private http: HttpClient) {}

  obtenerCategorias(): Observable<CategoriaIndex[]> {
    return this.http.get<CategoriaIndex[]>(this.apiUrl);
  }
}
