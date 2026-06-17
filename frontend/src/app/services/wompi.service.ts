import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { WompiDatosPago } from '../models/pedido.model';

// Constantes de precios — deben coincidir con config.php del backend
// IVA_PORCENTAJE = 0.0 (IVA ya incluido en el precio del producto)
const IVA_RATE = 0.0;
const COSTO_ENVIO_COP = 10_000;

@Injectable({ providedIn: 'root' })
export class WompiService {
  private http = inject(HttpClient);

  /**
   * Obtiene la firma SHA-256 y los datos del widget desde el backend.
   * La integrity_key NUNCA sale al frontend; el backend la usa para firmar.
   */
  obtenerDatosPago(pedidoId: number): Observable<WompiDatosPago> {
    return this.http.post<WompiDatosPago>(
      `${environment.apiUrl}/wompi/datos-pago`,
      { pedido_id: pedidoId }
    );
  }

  /**
   * Redirige al usuario al Link de Pago de Wompi.
   * El backend crea el link via la API de Wompi y devuelve la URL directa.
   */
  abrirWidget(datos: WompiDatosPago): void {
    // El backend ahora devuelve checkout_url con la URL del link de pago
    const checkoutUrl = (datos as any).checkout_url || datos.redirect_url;
    
    console.log('[Wompi] Redirigiendo a Link de Pago:', checkoutUrl);

    if (!checkoutUrl || !checkoutUrl.startsWith('https://checkout.wompi.co')) {
      console.error('[Wompi] URL de checkout inválida:', checkoutUrl);
      return;
    }

    window.location.href = checkoutUrl;
  }

  /** Helpers de precio (mirror del backend, para mostrar en UI) */
  calcularIVA(subtotal: number): number {
    return Math.round(subtotal * IVA_RATE);
  }

  calcularCostoEnvio(): number {
    return COSTO_ENVIO_COP;
  }

  calcularTotal(subtotal: number): number {
    return subtotal + this.calcularIVA(subtotal) + COSTO_ENVIO_COP;
  }
}
