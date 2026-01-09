import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

   getIdCategoriaPorNombre(nombre: string): Observable<{ id: number, nombre: string }> {
    return this.http.get<{ id: number, nombre: string }>(
      `${this.apiUrl}/id-por-nombre/${encodeURIComponent(nombre)}`
    );
  }

  crearCategoria(token: string, formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  eliminarCategoria(token: string, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  actualizarCategoria(token: string, id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }
}
