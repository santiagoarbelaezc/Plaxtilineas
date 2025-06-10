export interface Categoria {
  id: number;
  nombre: string;
  icono_url: string;
}

export interface CategoriaEditable extends Categoria {
  editando: boolean;
  nuevoIcono: File | null;
}
