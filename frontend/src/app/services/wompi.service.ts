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
   * Abre el Web Checkout de Wompi mediante redirección directa.
   * Esto evita errores 403 por restricciones de origen en el Widget (iframe).
   * Wompi redirigirá al usuario a redirect_url al terminar.
   */
  abrirWidget(datos: WompiDatosPago): void {
    console.log('[Wompi] Redirigiendo a Web Checkout con datos:', datos);

    // Construir la URL de checkout de Wompi con los parámetros requeridos
    const params = new URLSearchParams();
    params.set('public-key', datos.public_key);
    params.set('currency', datos.moneda);
    params.set('amount-in-cents', String(datos.monto_centavos));
    params.set('reference', datos.referencia);
    params.set('redirect-url', datos.redirect_url);

    // La firma de integridad usa ":" en el nombre del parámetro
    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}&signature%3Aintegrity=${datos.firma}`;

    console.log('[Wompi] URL de checkout:', checkoutUrl);

    // Redirigir al checkout de Wompi
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
