import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface DashboardStats {
  resumen: {
    visitas_hoy: number;
    visitas_ayer: number;
    visitas_semana: number;
    visitas_mes: number;
    sesiones_unicas: number;
    diferencia_hoy: number;
    total_productos: number;
    total_categorias: number;
    total_subcats: number;
    total_leads: number;
    leads_hoy: number;
    leads_semana: number;
  };
  grafico_visitas: { fecha: string; total: number; sesiones_unicas: number }[];
  top_productos: { nombre: string; imagen_url: string; visitas: number }[];
  visitas_categoria: { categoria: string; visitas: number }[];
  visitas_subcategoria: { subcategoria: string; categoria: string; visitas: number }[];
  paginas_top: { url: string; visitas: number }[];
  leads_recientes: { nombre: string; telefono: string; fuente: string; created_at: string }[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private apiUrl = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtener todas las estadísticas del dashboard
   */
  getDashboardStats(): Observable<{ data: DashboardStats }> {
    return this.http.get<{ data: DashboardStats }>(`${this.apiUrl}/dashboard`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Registrar visita a una página (sin autenticación)
   */
  trackVisita(url: string, sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/track`, {
      tipo: 'pagina',
      url,
      session_id: sessionId
    }, { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) });
  }

  /**
   * Registrar visita a un producto (sin autenticación)
   */
  trackProducto(productoId: number, sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/track`, {
      tipo: 'producto',
      producto_id: productoId,
      session_id: sessionId
    }, { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) });
  }
}
