import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Variante, 
  CrearVarianteDTO, 
  ActualizarVarianteDTO,
  CrearVarianteResponse,
  ActualizarVarianteResponse,
  EliminarVarianteResponse
} from '../models/variante.model';
import { environment } from '../../enviroments/environment';

@Injectable({ providedIn: 'root' })
export class VariantesService {
  private apiUrl = `${environment.apiUrl}/variantes`;

  constructor(private http: HttpClient) {}

  // Obtener todas las variantes de un producto específico (RUTA PÚBLICA)
  getVariantesPorProducto(producto_id: number): Observable<Variante[]> {
    return this.http.get<Variante[]>(`${this.apiUrl}/producto/${producto_id}`);
  }

  // Obtener una variante por ID (RUTA PÚBLICA)
  getVariantePorId(id: number): Observable<Variante> {
    return this.http.get<Variante>(`${this.apiUrl}/${id}`);
  }

  // Crear una nueva variante (RUTA PROTEGIDA - Admin)
  crearVariante(token: string, data: CrearVarianteDTO): Observable<CrearVarianteResponse> {
    return this.http.post<CrearVarianteResponse>(this.apiUrl, data, {
      headers: this.getAuthHeaders(token)
    });
  }

  // Actualizar una variante (RUTA PROTEGIDA - Admin)
  actualizarVariante(token: string, id: number, data: ActualizarVarianteDTO): Observable<ActualizarVarianteResponse> {
    return this.http.put<ActualizarVarianteResponse>(`${this.apiUrl}/${id}`, data, {
      headers: this.getAuthHeaders(token)
    });
  }

  // Eliminar una variante (RUTA PROTEGIDA - Admin)
  eliminarVariante(token: string, id: number): Observable<EliminarVarianteResponse> {
    return this.http.delete<EliminarVarianteResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(token)
    });
  }

  // Método auxiliar para headers
  private getAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}