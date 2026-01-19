import { Variante } from "./variante.model";

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  imagen_url: string;
  subcategoria_id: number;
  subcategoria: string; // nombre de la subcategoría
  categoria: string;    // nombre de la categoría (viene del JOIN)
  unidad?: string; // ej: kg, litros, metros, piezas
  nuevaImagen?: File;
}

export interface ProductoEditable extends Producto {
  editando: boolean;
  variantes?: Variante[]; // Agregar variantes al producto
}