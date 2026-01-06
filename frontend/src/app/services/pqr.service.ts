import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PqrService {
  private apiUrl = '/api/pqrs';

  constructor(private http: HttpClient) {}

  // ==================== RUTAS PÚBLICAS ====================

  /**
   * Crear nueva PQR (público)
   */
  crearPQR(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  /**
   * Consultar PQR por ID o número de ticket (público)
   */
  consultarPQR(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/consulta/${id}`);
  }

  // ==================== RUTAS PROTEGIDAS (ADMIN) ====================

  /**
   * Obtener todas las PQRS con paginación
   */
  getPQRS(token: string, params?: any): Observable<any> {
    let url = this.apiUrl;
    if (params) {
      const queryParams = new URLSearchParams(params).toString();
      url += `?${queryParams}`;
    }
    
    return this.http.get(url, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Buscar PQRS por diferentes criterios
   */
  buscarPQRS(token: string, termino: string, campo: string = 'todo'): Observable<any> {
    return this.http.get(`${this.apiUrl}/buscar?q=${encodeURIComponent(termino)}&campo=${campo}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Obtener estadísticas de PQRS
   */
  getEstadisticas(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Obtener últimas 5 PQRS
   */
  getUltimasPQRS(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ultimas`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Actualizar estado de una PQR
   */
  actualizarEstadoPQR(token: string, id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, data, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Agregar respuesta a una PQR
   */
  agregarRespuesta(token: string, id: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/respuestas`, data, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Eliminar una PQR
   */
  eliminarPQR(token: string, id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }
}