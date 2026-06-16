import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';

export interface UsuarioDetalle {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  edad: number | null;
  direccion: string | null;
  ciudad: string | null;
  rol: string;
  email_verificado: number;
  total_compras: number;
  cantidad_pedidos: number;
  pedidos: {
    id: number;
    codigo_pedido: string;
    fecha: string;
    total: number;
    estado: string;
  }[];
  carrito: {
    id: number;
    cantidad: number;
    precio_unitario: number;
    producto_nombre: string;
    imagen_url: string | null;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsuariosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/usuarios-detalle`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Obtiene la lista completa de usuarios detallados con sus carritos y compras
   */
  obtenerUsuariosDetalle(): Observable<UsuarioDetalle[]> {
    return this.http.get<UsuarioDetalle[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    });
  }
}
