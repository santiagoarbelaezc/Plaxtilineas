import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImportProductsService {
  // Backend en puerto 3000 (local) o el servidor correspondiente
  private apiUrl = 'http://localhost:3000/api/importar';

  constructor(private http: HttpClient) {
    console.log('📡 API Base URL:', this.apiUrl);
  }

  /**
   * Obtener headers con token de autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('🔐 Token obtenido:', token ? 'Sí' : 'No');
    
    if (!token) {
      console.warn('⚠️ No hay token de autenticación');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtener preview de productos de Hostinger SIN importarlos
   */
  obtenerPreview(limite: number = 5): Observable<any> {
    const url = `${this.apiUrl}/preview?limite=${limite}`;
    console.log('🔍 GET:', url);
    return this.http.get(url, { headers: this.getHeaders() });
  }

  /**
   * Obtener estadísticas de productos en Hostinger
   */
  obtenerEstadisticas(): Observable<any> {
    const url = `${this.apiUrl}/estadisticas`;
    console.log('🔍 GET:', url);
    return this.http.get(url, { headers: this.getHeaders() });
  }

  /**
   * Ejecutar la importación completa de productos
   */
  ejecutarImportacion(): Observable<any> {
    const url = `${this.apiUrl}/ejecutar`;
    console.log('📤 POST:', url);
    return this.http.post(url, {}, { headers: this.getHeaders() });
  }
}
