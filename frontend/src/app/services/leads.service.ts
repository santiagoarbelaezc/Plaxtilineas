import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface Lead {
  id?: number;
  nombre: string;
  telefono: string;
  fuente?: string;
  ip_address?: string;
  created_at?: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

export interface LeadsStats {
  total: number;
  hoy: number;
  esta_semana: number;
  por_dia: { fecha: string; total: number }[];
  por_fuente: { fuente: string; total: number }[];
}

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private apiUrl = `${environment.apiUrl}/leads`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Registrar un nuevo lead (modal de bienvenida) — SIN autenticación
   */
  registrarLead(nombre: string, telefono: string, fuente: string = 'modal_bienvenida'): Observable<any> {
    return this.http.post(this.apiUrl, { nombre, telefono, fuente }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * Obtener todos los leads (solo admin)
   */
  getLeads(pagina: number = 1, limite: number = 20, buscar: string = ''): Observable<LeadsResponse> {
    let params = `?pagina=${pagina}&limite=${limite}`;
    if (buscar) params += `&buscar=${encodeURIComponent(buscar)}`;
    return this.http.get<LeadsResponse>(`${this.apiUrl}${params}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtener estadísticas de leads (solo admin)
   */
  getLeadsStats(): Observable<LeadsStats> {
    return this.http.get<LeadsStats>(`${this.apiUrl}/stats`, {
      headers: this.getAuthHeaders()
    });
  }
}
