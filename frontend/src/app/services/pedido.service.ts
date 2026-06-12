import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import {
  CrearPedidoRequest,
  CrearPedidoResponse,
  MisPedidosResponse,
  AdminPedidosResponse,
} from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/pedidos`;

  /**
   * Crear un nuevo pedido (cliente autenticado)
   */
  crearPedido(datos: CrearPedidoRequest): Observable<CrearPedidoResponse> {
    return this.http.post<CrearPedidoResponse>(this.baseUrl, datos);
  }

  /**
   * Obtener los pedidos del usuario autenticado
   */
  obtenerMisPedidos(): Observable<MisPedidosResponse> {
    return this.http.get<MisPedidosResponse>(`${this.baseUrl}/mis-pedidos`);
  }

  /**
   * Admin: obtener todos los pedidos del sistema
   */
  adminObtenerTodos(): Observable<AdminPedidosResponse> {
    return this.http.get<AdminPedidosResponse>(`${this.baseUrl}/admin/todos`);
  }

  /**
   * Admin: actualizar el estado de un pedido
   */
  adminActualizarEstado(pedidoId: number, estado: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/actualizar-estado/${pedidoId}`, { estado });
  }
}
