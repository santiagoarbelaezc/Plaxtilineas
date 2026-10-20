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
  /** Snapshot del producto del catálogo al momento de agregarlo (detalle del carrito) */
  detalle?: CartItemDetalle;
  agregadoEn?: string;
}

/** Detalle de línea del carrito, derivado del producto del catálogo */
export interface CartItemDetalle {
  producto_id: number;
  variante_id: number | null;
  nombre: string;
  variante_nombre: string | null;
  sku: string | null;
  slug: string | null;
  categoria: string | null;
  subcategoria: string | null;
  material: string | null;
  marca: string | null;
  imagen_url: string | null;
  unidad: string;
  precio_unitario: number;
  cantidad: number;
  minimo_compra: number;
  stock_disponible: number | null;
  subtotal: number;
}

export interface CartOrder {
  items: CartItem[];
  subtotal: number;
  IVA: number;
  costoEnvio: number;
  total: number;
  referencia: string;
}
