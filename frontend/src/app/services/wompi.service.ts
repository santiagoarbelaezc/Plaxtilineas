import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { WompiDatosPago } from '../models/pedido.model';

const IVA_RATE = 0.0;
const COSTO_ENVIO_COP = 10_000;
export const WOMPI_LAST_ORDER_STORAGE_KEY = 'plx_ultimo_pedido_wompi';

@Injectable({ providedIn: 'root' })
export class WompiService {
  private http = inject(HttpClient);

  /**
   * Obtiene los parámetros del Web Checkout y la firma SHA-256 generada en el backend.
   * El secreto de integridad NUNCA viaja al frontend.
   */
  obtenerDatosPago(pedidoId: number): Observable<WompiDatosPago> {
    return this.http.post<WompiDatosPago>(
      `${environment.apiUrl}/wompi/datos-pago`,
      { pedido_id: pedidoId }
    );
  }

  /**
   * Redirige al Web Checkout oficial de Wompi (https://checkout.wompi.co/p/)
   * enviando los parámetros firmados con `signature:integrity` mediante un formulario GET,
   * exactamente como especifica la documentación oficial de Wompi.
   */
  abrirWidget(datos: WompiDatosPago): void {
    const integritySignature = datos.firma_integridad || datos.firma;
    const checkoutActionUrl = datos.checkout_url || 'https://checkout.wompi.co/p/';

    if (!datos.public_key || !datos.referencia || !datos.monto_centavos || !integritySignature) {
      console.error('[Wompi] Faltan parámetros obligatorios firmados para iniciar el Web Checkout.');
      return;
    }

    try {
      sessionStorage.setItem(
        WOMPI_LAST_ORDER_STORAGE_KEY,
        JSON.stringify({
          pedido_id: datos.pedido_id,
          codigo_pedido: datos.codigo_pedido || '',
          referencia: datos.referencia,
          total: Math.round(datos.monto_centavos / 100),
          created_at: Date.now()
        })
      );
    } catch {
      // Ignorar si sessionStorage no está disponible
    }

    // Construir y enviar formulario oculto GET hacia https://checkout.wompi.co/p/
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = checkoutActionUrl;
    form.style.display = 'none';

    const params: Record<string, string> = {
      'public-key': datos.public_key,
      'currency': datos.moneda || 'COP',
      'amount-in-cents': String(datos.monto_centavos),
      'reference': datos.referencia,
      'signature:integrity': integritySignature,
      'redirect-url': datos.redirect_url
    };

    if (datos.customer_data?.email) {
      params['customer-data:email'] = datos.customer_data.email;
    }
    if (datos.customer_data?.full_name) {
      params['customer-data:full-name'] = datos.customer_data.full_name;
    }
    if (datos.customer_data?.phone_number) {
      params['customer-data:phone-number'] = datos.customer_data.phone_number;
    }
    if (datos.customer_data?.phone_number_prefix) {
      params['customer-data:phone-number-prefix'] = datos.customer_data.phone_number_prefix;
    }

    Object.entries(params).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

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
