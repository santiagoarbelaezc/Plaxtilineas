import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subcategoria } from '../models/subcategoria.model';
import { environment } from '../../enviroments/environment';

@Injectable({ providedIn: 'root' })
export class SubcategoriasService {
  private apiUrl = `${environment.apiUrl}/subcategorias`;

  constructor(private http: HttpClient) {}

  getSubcategorias(): Observable<Subcategoria[]> {
    return this.http.get<Subcategoria[]>(this.apiUrl);
  }

  crearSubcategoria(token: string, data: { nombre: string; categoria_id: number }): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  actualizarSubcategoria(token: string, id: number, data: { nombre: string; categoria_id: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  eliminarSubcategoria(token: string, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }
}
