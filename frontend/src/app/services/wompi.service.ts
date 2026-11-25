import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { WompiDatosPago } from '../models/pedido.model';
import { CartService } from './cart.service';

const IVA_RATE = 0.0;
const COSTO_ENVIO_COP = 10_000;
const WOMPI_WIDGET_SCRIPT_URL = 'https://checkout.wompi.co/widget.js';
export const WOMPI_LAST_ORDER_STORAGE_KEY = 'plx_ultimo_pedido_wompi';

declare global {
  interface Window {
    WidgetCheckout?: new (config: Record<string, any>) => {
      open: (callback: (result: any) => void) => void;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class WompiService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cartService = inject(CartService);
  private widgetScriptPromise: Promise<void> | null = null;

  /**
   * Obtiene los parámetros del checkout y la firma SHA-256 generada en el backend.
   * El secreto de integridad NUNCA viaja al frontend.
   */
  obtenerDatosPago(pedidoId: number): Observable<WompiDatosPago> {
    return this.http.post<WompiDatosPago>(
      `${environment.apiUrl}/wompi/datos-pago`,
      { pedido_id: pedidoId }
    );
  }

  /**
   * Abre el Widget oficial de Wompi (https://checkout.wompi.co/widget.js) con
   * `signature: { integrity }` y `bootstrapTransport: 'postmessage'`.
   * Evita los bloqueos 403 de CloudFront WAF en GET /p/ con parámetros codificados o http://localhost.
   */
  abrirWidget(datos: WompiDatosPago): void {
    const integritySignature = datos.firma_integridad || datos.firma;

    if (!datos.public_key || !datos.referencia || !datos.monto_centavos || !integritySignature) {
      console.error('[Wompi] Faltan parámetros obligatorios firmados para abrir el Widget.');
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

    this.cargarWidgetScript()
      .then(() => {
        if (!window.WidgetCheckout) {
          throw new Error('WidgetCheckout no disponible tras cargar widget.js');
        }

        const config: Record<string, any> = {
          currency: datos.moneda || 'COP',
          amountInCents: Number(datos.monto_centavos),
          reference: datos.referencia,
          publicKey: datos.public_key,
          signature: { integrity: integritySignature },
          bootstrapTransport: 'postmessage'
        };

        // Solo enviar redirectUrl si es HTTPS (evita rechazos cuando se prueba en http://localhost)
        if (datos.redirect_url && datos.redirect_url.startsWith('https://')) {
          config['redirectUrl'] = datos.redirect_url;
        }

        if (datos.customer_data) {
          const customerData: Record<string, string> = {};
          if (datos.customer_data.email) customerData['email'] = datos.customer_data.email;
          if (datos.customer_data.full_name) customerData['fullName'] = datos.customer_data.full_name;
          if (datos.customer_data.phone_number) customerData['phoneNumber'] = datos.customer_data.phone_number;
          if (datos.customer_data.phone_number_prefix) {
            customerData['phoneNumberPrefix'] = datos.customer_data.phone_number_prefix;
          }
          if (Object.keys(customerData).length > 0) {
            config['customerData'] = customerData;
          }
        }

        const checkout = new window.WidgetCheckout(config);
        checkout.open((result: any) => {
          // Solo informativo: la confirmación real ocurre vía Webhook en el backend.
          const txId = result?.transaction?.id || '';
          this.ngZone.run(() => {
            this.cartService.clearCart();
            this.router.navigate(['/perfil'], {
              queryParams: {
                tab: 'pedidos',
                ref: datos.referencia,
                ...(txId ? { tx: txId } : {})
              }
            });
          });
        });
      })
      .catch((err) => {
        console.error('[Wompi] Error cargando WidgetCheckout:', err);
      });
  }

  private cargarWidgetScript(): Promise<void> {
    if (window.WidgetCheckout) {
      return Promise.resolve();
    }

    if (this.widgetScriptPromise) {
      return this.widgetScriptPromise;
    }

    this.widgetScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${WOMPI_WIDGET_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', (e) => reject(e), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = WOMPI_WIDGET_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => {
        this.widgetScriptPromise = null;
        reject(e);
      };
      document.head.appendChild(script);
    });

    return this.widgetScriptPromise;
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
