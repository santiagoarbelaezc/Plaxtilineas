export interface Subcategoria {
  id: number;
  nombre: string;
  categoria_id: number;
  categoria: string; // nombre de la categoría (viene del JOIN)
}

export interface SubcategoriaEditable extends Subcategoria {
  editando: boolean;
}
