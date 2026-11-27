import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../enviroments/environment';
import {
  CrearDraftRequest,
  CrearDraftResponse,
  MisPedidosResponse,
  AdminPedidosResponse,
  VerificarEstadoResponse,
  ReglasEnvio,
} from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/pedidos`;
  private reglasEnvio$?: Observable<{ data?: ReglasEnvio } & Partial<ReglasEnvio>>;

  /**
   * Obtiene las reglas vigentes de envío a domicilio y recogida en tienda (con caché en memoria).
   */
  obtenerReglasEnvio(): Observable<{ data?: ReglasEnvio } & Partial<ReglasEnvio>> {
    if (!this.reglasEnvio$) {
      this.reglasEnvio$ = this.http
        .get<{ data?: ReglasEnvio } & Partial<ReglasEnvio>>(`${this.baseUrl}/reglas-envio`)
        .pipe(shareReplay(1));
    }
    return this.reglasEnvio$;
  }

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
  adminActualizarEstado(
    pedidoId: number,
    estado: string,
    extra: {
      guia_numero?: string;
      transportadora?: string;
      evidencia_envio_url?: string;
      evidencia_entrega_url?: string;
      solicitud_cliente?: boolean;
    } = {}
  ): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/actualizar-estado/${pedidoId}`, { estado, ...extra });
  }

  /**
   * Admin: subir foto de evidencia del envío a Cloudinary
   */
  adminSubirEvidenciaEnvio(pedidoId: number, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('evidencia', archivo);
    return this.http.post(`${environment.apiUrl}/admin/pedidos/${pedidoId}/evidencia-envio`, formData);
  }

  /**
   * Admin: subir foto de evidencia de la entrega a Cloudinary
   */
  adminSubirEvidenciaEntrega(pedidoId: number, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('evidencia', archivo);
    return this.http.post(`${environment.apiUrl}/admin/pedidos/${pedidoId}/evidencia-entrega`, formData);
  }

  adminEliminarPedido(pedidoId: number, confirmacion: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/admin/pedidos/${pedidoId}`, {
      body: { confirmacion }
    });
  }

  /**
   * Cancelar un pedido propio (solo si no está pagado)
   */
  cancelarPedido(pedidoId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${pedidoId}/cancelar`, {});
  }

  /**
   * Eliminar un pedido propio (solo si no está pagado)
   */
  eliminarPedido(pedidoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${pedidoId}`);
  }
}
