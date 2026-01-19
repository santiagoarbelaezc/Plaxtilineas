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
   * @returns Cantidad válida (entero positivo)
   */
  validarCantidad(cantidad: number): number {
    // Convertir a entero
    let cantidadEntera = Math.floor(cantidad);
    
    // Asegurar que sea al menos 1
    if (cantidadEntera < 1) {
      cantidadEntera = 1;
    }
    
    // Máximo 6
    if (cantidadEntera > 6) {
      cantidadEntera = 6;
    }
    
    return cantidadEntera;
  }

  /**
   * Obtiene el rango válido de cantidades
   * @returns Array con valores de 1 a 6
   */
  obtenerOpcionesCantidad(): number[] {
    return [1, 2, 3, 4, 5, 6];
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
