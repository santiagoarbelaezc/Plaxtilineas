import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrecioCantidadService {

  constructor() { }

  /**
   * Calcula el precio total basado en el precio unitario y la cantidad
   * @param precioUnitario - Precio base del producto o variante
   * @param cantidad - Cantidad seleccionada (número entero)
   * @returns Precio total
   */
  calcularPrecioTotal(precioUnitario: number, cantidad: number): number {
    if (!precioUnitario || precioUnitario <= 0) {
      return 0;
    }

    if (!cantidad || cantidad <= 0) {
      return precioUnitario;
    }

    // Asegurar que cantidad sea un entero
    const cantidadEntera = Math.floor(cantidad);
    
    // Calcular precio total
    return precioUnitario * cantidadEntera;
  }

  /**
   * Valida que la cantidad sea un entero válido
   * @param cantidad - Valor a validar
   * @param maxLimit - Límite máximo (por defecto 99)
   * @returns Cantidad válida (entero positivo)
   */
  validarCantidad(cantidad: number, maxLimit: number = 99): number {
    // Convertir a entero
    let cantidadEntera = Math.floor(cantidad);
    
    // Asegurar que sea al menos 1
    if (cantidadEntera < 1) {
      cantidadEntera = 1;
    }
    
    // Validar límite máximo
    if (cantidadEntera > maxLimit) {
      cantidadEntera = maxLimit;
    }
    
    return cantidadEntera;
  }

  /**
   * Obtiene el rango válido de cantidades predeterminado
   * @param max - Límite máximo (por defecto 10)
   * @returns Array con valores de 1 a max
   */
  obtenerOpcionesCantidad(max: number = 10): number[] {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  /**
   * Calcula el precio por unidad (útil para mostrar desglose)
   * @param precioTotal - Precio total
   * @param cantidad - Cantidad
   * @returns Precio unitario
   */
  calcularPrecioUnitario(precioTotal: number, cantidad: number): number {
    if (!cantidad || cantidad <= 0) {
      return precioTotal;
    }

    return precioTotal / cantidad;
  }
}
