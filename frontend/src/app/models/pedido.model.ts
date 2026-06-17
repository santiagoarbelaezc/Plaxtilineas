export interface PedidoDetalle {
  id: number;
  producto_id: number;
  variante_id: number | null;
  nombre_producto: string;
  imagen_url: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  codigo_pedido: string;
  fecha: string;
  total: number;
  subtotal: number;
  iva: number;
  costo_envio: number;
  estado: EstadoPedido;
  direccion_envio: string;
  ciudad: string | null;
  departamento: string | null;
  telefono_contacto: string | null;
  metodo_pago: string;
  notas: string | null;
  fecha_actualizacion: string;
  wompi_referencia?: string;
  wompi_pagado_at?: string | null;
  detalles: PedidoDetalle[];
  total_items: number;
  // Admin fields
  cliente_nombre?: string;
  cliente_correo?: string;
}

export interface CrearDraftRequest {
  items: {
    producto_id: number;
    variante_id?: number;
    cantidad: number;
  }[];
  direccion_envio: string;
  ciudad?: string;
  departamento?: string;
  telefono_contacto?: string;
  metodo_pago?: string;
  notas?: string;
}

export interface CrearDraftResponse {
  mensaje: string;
  pedido_id: number;
  codigo_pedido: string;
  wompi_referencia: string;
  subtotal: number;
  iva: number;
  costo_envio: number;
  total: number;
}

/** @deprecated Usar CrearDraftRequest */
export type CrearPedidoRequest = CrearDraftRequest;
/** @deprecated Usar CrearDraftResponse */
export type CrearPedidoResponse = CrearDraftResponse;

export interface MisPedidosResponse {
  pedidos: Pedido[];
  total_pedidos: number;
}

export interface AdminPedidosResponse {
  pedidos: Pedido[];
  estadisticas: {
    total_pedidos: number;
    ingresos_totales: number;
    pedidos_activos: number;
    pedidos_entregados: number;
    pedidos_cancelados: number;
  };
}

export interface WompiDatosPago {
  public_key: string;
  referencia: string;
  monto_centavos: number;
  moneda: string;
  firma: string;
  redirect_url: string;
  pedido_id: number;
}

export interface VerificarEstadoResponse {
  estado: string;
  codigo_pedido: string;
  total: number;
  wompi_pagado_at: string | null;
}

/** Estados del ciclo de vida del flujo de checkout en el frontend */
export type CartStatus = 'IDLE' | 'VALIDATING' | 'READY' | 'PAYING' | 'SUCCESS' | 'ERROR';

export type EstadoPedido =
  | 'draft'
  | 'pendiente_pago'
  | 'pagado'
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export const ESTADOS_PEDIDO: { key: EstadoPedido; label: string; icon: string; color: string }[] = [
  { key: 'pendiente_pago',  label: 'Pendiente de Pago', icon: '💳', color: '#f59e0b' },
  { key: 'pagado',          label: 'Pago Confirmado', icon: '💳', color: '#10b981' },
  { key: 'pendiente',       label: 'Pendiente',       icon: '🕐', color: '#f59e0b' },
  { key: 'confirmado',      label: 'Confirmado',      icon: '✅', color: '#3b82f6' },
  { key: 'en_preparacion',  label: 'En Preparación',  icon: '📦', color: '#8b5cf6' },
  { key: 'en_camino',       label: 'En Camino',       icon: '🚚', color: '#06b6d4' },
  { key: 'entregado',       label: 'Entregado',       icon: '🎉', color: '#10b981' },
  { key: 'cancelado',       label: 'Cancelado',       icon: '❌', color: '#ef4444' },
];
