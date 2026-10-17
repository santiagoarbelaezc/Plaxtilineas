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
  categoria_id?: number; // id de categoría del catálogo externo
  unidad?: string; // ej: kg, litros, metros, piezas
  sku?: string;
  stock?: number;
  stock_minimo?: number;
  minimo_compra?: number;
  controlar_stock?: boolean | number;
  vistas?: number;
  nuevaImagen?: File;
  // Campos del catálogo externo (solo lectura)
  slug?: string;
  material?: string;
  marca?: string;
  colores?: string[];
  imagenes?: { url: string; descripcion?: string; principal?: boolean }[];
  creado_en?: string;
}

export interface ProductoEditable extends Producto {
  editando: boolean;
  seleccionado?: boolean; // Para selección masiva
  variantes?: Variante[]; // Agregar variantes al producto
}