import { Producto } from './producto.model';
import { Variante } from './variante.model';

export interface CartItem {
  id: string; // Unique identifier for the cart item (usually producto.id + "-" + variante.id)
  producto: Producto;
  variante?: Variante;
  cantidad: number;
  precioUnitario: number; 
  // Campos específicos requeridos
  sku?: string;
  imagen_url?: string | null;
  categoria?: string;
  unidad_medida?: 'kg' | 'rollo' | 'unidad' | 'caja' | string;
}

export interface CartOrder {
  items: CartItem[];
  subtotal: number;
  IVA: number;
  costoEnvio: number;
  total: number;
  referencia: string;
}
