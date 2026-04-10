import { Producto } from './producto.model';
import { Variante } from './variante.model';

export interface CartItem {
  id: string; // Unique identifier for the cart item (usually producto.id + "-" + variante.id)
  producto: Producto;
  variante?: Variante;
  cantidad: number;
  precioUnitario: number; 
}
