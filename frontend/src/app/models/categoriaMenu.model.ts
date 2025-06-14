// src/app/models/categoriaMenu.model.ts

export interface SubcategoriaConCantidad {
  id: number;
  nombre: string;
  cantidad: number;
}

export interface CategoriaConSubcategorias {
  id: number;
  nombre: string;
  subcategorias: SubcategoriaConCantidad[];
}
