export interface ProductoMenu {
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
  nuevaImagen?: File;   // para carga de nueva imagen (opcional)
}

export interface ProductoMenuEditable extends ProductoMenu {
  editando: boolean;
}
