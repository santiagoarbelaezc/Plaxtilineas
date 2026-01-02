export interface Variante {
  id: number;
  nombre: string;
  precio: number;
  producto_id: number;
  creado_en: string;
}

// Para formularios de edición
export interface VarianteEditable extends Variante {
  editando: boolean;
  precioOriginal?: number;
}

// DTOs
export interface CrearVarianteDTO {
  nombre: string;
  precio: number;
  producto_id: number;
}

export interface ActualizarVarianteDTO {
  nombre?: string;
  precio?: number;
}

// Respuestas de la API
export interface CrearVarianteResponse {
  mensaje: string;
  id: number;
}

export interface ActualizarVarianteResponse {
  mensaje: string;
  variante: Variante;
}

export interface EliminarVarianteResponse {
  mensaje: string;
}