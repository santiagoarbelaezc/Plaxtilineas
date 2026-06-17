import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import {
  CrearDraftRequest,
  CrearDraftResponse,
  MisPedidosResponse,
  AdminPedidosResponse,
  VerificarEstadoResponse,
} from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/pedidos`;

  /**
   * Fase 1 del Two-Phase Commit: crea el pedido como DRAFT.
   * NO toca stock ni envía email. Solo reserva la intención de compra.
   */
  crearDraft(datos: CrearDraftRequest): Observable<CrearDraftResponse> {
    return this.http.post<CrearDraftResponse>(`${this.baseUrl}/draft`, datos);
  }

  /**
   * Verificar estado de pago por referencia Wompi o ID de transacción (polling post-pago)
   */
  verificarEstado(referencia: string, id: string = ''): Observable<VerificarEstadoResponse> {
    const params: any = {};
    if (referencia) params.ref = referencia;
    if (id) params.id = id;

    return this.http.get<VerificarEstadoResponse>(
      `${this.baseUrl}/estado`,
      { params }
    );
  }

  /**
   * Obtener los pedidos del usuario autenticado (excluye drafts)
   */
  obtenerMisPedidos(): Observable<MisPedidosResponse> {
    return this.http.get<MisPedidosResponse>(`${this.baseUrl}/mis-pedidos`);
  }

  /**
   * Admin: obtener todos los pedidos del sistema (excluye drafts)
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

  /**
   * Cancelar un pedido propio (solo si no está pagado)
   */
  cancelarPedido(pedidoId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/cancelar/${pedidoId}`, {});
  }

  /**
   * Eliminar un pedido propio (solo si no está pagado)
   */
  eliminarPedido(pedidoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/eliminar/${pedidoId}`);
  }
}
