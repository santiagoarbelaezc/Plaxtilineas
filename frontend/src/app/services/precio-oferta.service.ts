import { Injectable } from '@angular/core';

export interface PreciosCalculados {
  precioReal: number;
  precioReferencia: number;
  precioRealFormateado: string;
  precioReferenciaFormateado: string;
  porcentajeDescuento: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrecioOfertaService {

  private readonly DEFAULT_PORCENTAJE_AUMENTO = 25; // 25% más sobre el precio real

  constructor() {}

  /**
   * Calcula el precio tachado de referencia con un porcentaje de incremento (por defecto 25%)
   * @param precioReal Precio de venta actual
   * @param porcentaje Porcentaje adicional sobre el precio real (default: 25)
   * @returns Precio de referencia redondeado
   */
  calcularPrecioReferencia(precioReal: number, porcentaje: number = this.DEFAULT_PORCENTAJE_AUMENTO): number {
    if (!precioReal || precioReal <= 0) return 0;
    
    // Cálculo con el 25% adicional
    const precioBruto = precioReal * (1 + porcentaje / 100);

    // Redondear a la centena más cercana para estética de moneda COP (ej. $4.875 -> $4.900)
    // Si la diferencia es menor a 100, se deja al entero más cercano
    if (precioBruto > 1000) {
      return Math.round(precioBruto / 50) * 50;
    }
    return Math.round(precioBruto);
  }

  /**
   * Formatea un número al estándar monetario colombiano ($ 4.900)
   * @param precio Valor numérico
   */
  formatearPrecio(precio: number): string {
    if (precio === null || precio === undefined || isNaN(precio)) {
      return '$ 0';
    }
    const entero = Math.round(precio);
    const formateado = entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${formateado}`;
  }

  /**
   * Genera el desglose completo de precios para un producto
   * @param precioReal Precio de venta actual
   * @param porcentaje Porcentaje de referencia (default: 25%)
   */
  generarPrecios(precioReal: number, porcentaje: number = this.DEFAULT_PORCENTAJE_AUMENTO): PreciosCalculados {
    const precioReferencia = this.calcularPrecioReferencia(precioReal, porcentaje);
    const porcentajeDescuento = precioReferencia > 0 
      ? Math.round(((precioReferencia - precioReal) / precioReferencia) * 100)
      : 0;

    return {
      precioReal,
      precioReferencia,
      precioRealFormateado: this.formatearPrecio(precioReal),
      precioReferenciaFormateado: this.formatearPrecio(precioReferencia),
      porcentajeDescuento
    };
  }
}
