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

  abrirWidget(datos: WompiDatosPago): void {
    // 1. Remover cualquier script de Wompi existente para evitar duplicidad o errores de inicialización
    const scriptsExistentes = document.querySelectorAll('script[src*="checkout.wompi.co/widget.js"]');
    scriptsExistentes.forEach(s => s.remove());

    // 2. Crear y configurar el nuevo script con los datos obligatorios requeridos por Wompi
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.setAttribute('data-public-key', datos.public_key);
    script.setAttribute('data-currency', datos.moneda);
    script.setAttribute('data-amount-in-cents', datos.monto_centavos.toString());
    script.setAttribute('data-reference', datos.referencia);
    
    script.onload = () => {
      try {
        const checkout = new (window as any).WidgetCheckout({
          currency:    datos.moneda,
          amountInCents: datos.monto_centavos,
          reference:   datos.referencia,
          publicKey:   datos.public_key,
          signature:   { integrity: datos.firma },
          redirectUrl: datos.redirect_url,
        });
        checkout.open((result: any) => {
          console.info('[Wompi] Resultado widget:', result);
        });
      } catch (err) {
        console.error('[Wompi] Error al instanciar WidgetCheckout:', err);
      }
    };

    script.onerror = (err) => {
      console.error('[Wompi] Error al cargar el script de Wompi:', err);
    };

    document.body.appendChild(script);
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
