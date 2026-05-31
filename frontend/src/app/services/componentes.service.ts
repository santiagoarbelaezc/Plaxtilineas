import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface ComponenteDinamico {
  id?: number;
  tipo: 'banner' | 'anuncio' | 'texto';
  orden: number;
  activo: boolean | number;
  contenido: any; // Mapeado a JSON dinámico según el tipo
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ComponentesService {
  private apiUrl = `${environment.apiUrl}/componentes`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Obtener todos los componentes dinámicos ordenados (público)
   */
  getComponentes(): Observable<{ data: ComponenteDinamico[] }> {
    return this.http.get<{ data: ComponenteDinamico[] }>(this.apiUrl);
  }

  /**
   * Crear un nuevo componente dinámico (solo admin)
   */
  crearComponente(componente: Partial<ComponenteDinamico>): Observable<any> {
    return this.http.post(this.apiUrl, componente, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Actualizar un componente dinámico por ID (solo admin)
   */
  actualizarComponente(id: number, componente: Partial<ComponenteDinamico>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, componente, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Reordenar en lote múltiples componentes enviando los IDs ordenados (solo admin)
   */
  reordenarComponentes(ordenIds: number[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/reordenar`, { orden_ids: ordenIds }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Eliminar un componente dinámico (solo admin)
   */
  eliminarComponente(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Subir una imagen a Cloudinary para un componente dinámico (solo admin)
   */
  subirImagen(file: File): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    const formData = new FormData();
    formData.append('imagen', file);

    return this.http.post(`${this.apiUrl}/upload`, formData, { headers });
  }
}
