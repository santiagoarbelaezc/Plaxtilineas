export interface PQR {
  id: string;
  tipo: 'PETICION' | 'QUEJA' | 'RECLAMO' | 'SUGERENCIA';
  nombre_completo: string;
  email: string;
  telefono: string;
  producto_relacionado?: string;
  descripcion: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO';
  numero_ticket: string;
  fecha_creacion_formateada?: string;
  fecha_actualizacion_formateada?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  tiene_archivos?: boolean;
  tiene_respuestas?: boolean;
}

export interface PQRArchivo {
  id: string;
  nombre_archivo: string;
  url_archivo: string;
  tipo_archivo: string;
  fecha_subida?: string;
}

export interface PQRRespuesta {
  id: string;
  mensaje: string;
  tipo: 'CLIENTE' | 'ADMINISTRACION';
  fecha_respuesta?: string;
  fecha_creacion?: string;
}

export interface PQRDetalle extends PQR {
  archivos: PQRArchivo[];
  respuestas: PQRRespuesta[];
}

export interface CrearPQRRequest {
  tipo: 'PETICION' | 'QUEJA' | 'RECLAMO' | 'SUGERENCIA';
  nombre_completo: string;
  email: string;
  telefono: string;
  producto_relacionado?: string;
  descripcion: string;
  archivos?: File[];
}

export interface CrearPQRResponse {
  mensaje: string;
  numero_ticket: string;
  id: string;
  archivos_subidos: number;
  detalles_archivos: Array<{
    nombre: string;
    url: string;
    public_id: string;
    tipo: string;
  }>;
  detalles: {
    tipo: string;
    fecha_creacion: string;
    estado: string;
  };
}

export interface ActualizarEstadoRequest {
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO';
  mensaje_respuesta?: string;
}

export interface AgregarRespuestaRequest {
  mensaje: string;
  tipo?: 'CLIENTE' | 'ADMINISTRACION';
}

export interface PQRPaginacion {
  total: number;
  pagina_actual: number;
  total_paginas: number;
  por_pagina: number;
}

export interface PQRListado {
  data: PQR[];
  paginacion: PQRPaginacion;
}

export interface PQREstadisticas {
  estadisticas: {
    total: number;
    pendientes: number;
    en_proceso: number;
    resueltas: number;
    cerradas: number;
    peticiones: number;
    quejas: number;
    reclamos: number;
    sugerencias: number;
    tiempo_promedio_horas: number;
  };
  tendencia_30_dias: Array<{
    fecha: string;
    cantidad: number;
    tipos: string;
  }>;
  distribucion_por_tipo: Array<{
    tipo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  ultima_actualizacion: string;
}

export interface PQRBusquedaResult {
  resultados: PQR[];
  total: number;
  termino_busqueda: string;
  campo_busqueda?: string;
}