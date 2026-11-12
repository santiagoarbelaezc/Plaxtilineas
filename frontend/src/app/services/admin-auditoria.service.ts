import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface AuditoriaLogItem {
  id: number;
  sesion_id: number | null;
  admin_id: number;
  admin_nombre: string;
  admin_correo: string;
  modulo: string;
  accion: string;
  descripcion: string;
  entidad_tipo: string | null;
  entidad_id: string | null;
  datos_anteriores: Record<string, any> | null;
  datos_nuevos: Record<string, any> | null;
  ip_address: string | null;
  fecha: string;
  fecha_formateada: string;
  hora_formateada: string;
  sesion_activa: boolean;
  sesion_duracion_segundos: number;
  sesion_duracion_formateada: string;
}

export interface AdminSesionActualInfo {
  id: number;
  inicio_sesion_at: string;
  inicio_formateado: string;
  ultima_actividad_at: string;
  duracion_segundos: number;
  duracion_formateada: string;
  ip_address: string | null;
  activa: boolean;
}

export interface AuditoriaEstadisticas {
  total_operaciones: number;
  operaciones_hoy: number;
  total_sesiones: number;
  sesiones_activas: number;
  eliminaciones_totales: number;
  respuestas_pqr: number;
  gestiones_pedidos: number;
  tiempo_total_segundos: number;
  tiempo_total_formateado: string;
  tiempo_promedio_segundos: number;
  tiempo_promedio_formateado: string;
  por_modulo: Record<string, number>;
  sesion_actual: AdminSesionActualInfo | null;
}

export interface AuditoriaPaginacion {
  total: number;
  pagina_actual: number;
  total_paginas: number;
  por_pagina: number;
}

export interface AuditoriaResponse {
  estadisticas: AuditoriaEstadisticas;
  logs: AuditoriaLogItem[];
  paginacion: AuditoriaPaginacion;
}

export interface AdminSesionOperacionResumen {
  id: number;
  modulo: string;
  accion: string;
  descripcion: string;
  hora: string;
  fecha_formateada: string;
}

export interface AdminSesionItem {
  id: number;
  admin_id: number;
  admin_nombre: string;
  admin_correo: string;
  ip_address: string | null;
  user_agent: string | null;
  inicio_sesion_at: string;
  inicio_formateado: string;
  ultima_actividad_at: string | null;
  ultima_actividad_formateada: string | null;
  fin_sesion_at: string | null;
  fin_formateado: string | null;
  duracion_segundos: number;
  duracion_formateada: string;
  activa: boolean;
  total_operaciones: number;
  operaciones: AdminSesionOperacionResumen[];
}

export interface AuditoriaFiltros {
  modulo?: string;
  accion?: string;
  sesion_id?: number | null;
  fecha_inicio?: string;
  fecha_fin?: string;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/auditoria`;

  private getAuthHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  obtenerAuditoria(filtros: AuditoriaFiltros = {}): Observable<AuditoriaResponse> {
    let params = new HttpParams();
    if (filtros.modulo && filtros.modulo !== 'TODOS') {
      params = params.set('modulo', filtros.modulo);
    }
    if (filtros.accion && filtros.accion !== 'TODAS') {
      params = params.set('accion', filtros.accion);
    }
    if (filtros.sesion_id) {
      params = params.set('sesion_id', String(filtros.sesion_id));
    }
    if (filtros.fecha_inicio) {
      params = params.set('fecha_inicio', filtros.fecha_inicio);
    }
    if (filtros.fecha_fin) {
      params = params.set('fecha_fin', filtros.fecha_fin);
    }
    if (filtros.q && filtros.q.trim() !== '') {
      params = params.set('q', filtros.q.trim());
    }
    if (filtros.page) {
      params = params.set('page', String(filtros.page));
    }
    if (filtros.limit) {
      params = params.set('limit', String(filtros.limit));
    }

    return this.http.get<AuditoriaResponse>(this.apiUrl, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  obtenerSesiones(limit = 30): Observable<{ sesiones: AdminSesionItem[] }> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<{ sesiones: AdminSesionItem[] }>(`${this.apiUrl}/sesiones`, {
      headers: this.getAuthHeaders(),
      params
    });
  }
}

