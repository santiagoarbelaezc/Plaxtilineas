import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface SugerenciaSubcategoriaResponse {
  subcategoria_id: number | null;
  debug?: string;
}

export interface GenerarDescripcionResponse {
  descripcion: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/ia`;

  constructor(private http: HttpClient) {}

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  sugerirSubcategoria(token: string, nombre: string, descripcion: string, subcategorias: any[]): Observable<SugerenciaSubcategoriaResponse> {
    return this.http.post<SugerenciaSubcategoriaResponse>(
      `${this.apiUrl}/sugerir-subcategoria`,
      { nombre, descripcion, subcategorias },
      { headers: this.getHeaders(token) }
    );
  }

  generarDescripcion(token: string, nombre: string): Observable<GenerarDescripcionResponse> {
    return this.http.post<GenerarDescripcionResponse>(
      `${this.apiUrl}/generar-descripcion`,
      { nombre },
      { headers: this.getHeaders(token) }
    );
  }
}
