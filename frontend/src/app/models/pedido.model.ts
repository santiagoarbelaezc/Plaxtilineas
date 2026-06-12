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
  estado: 'pendiente' | 'confirmado' | 'en_preparacion' | 'en_camino' | 'entregado' | 'cancelado';
  direccion_envio: string;
  ciudad: string | null;
  departamento: string | null;
  telefono_contacto: string | null;
  metodo_pago: string;
  notas: string | null;
  fecha_actualizacion: string;
  detalles: PedidoDetalle[];
  total_items: number;
  // Admin fields
  cliente_nombre?: string;
  cliente_correo?: string;
}

export interface CrearPedidoRequest {
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

export interface CrearPedidoResponse {
  mensaje: string;
  codigo_pedido: string;
  pedido_id: number;
  total: number;
}

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

export type EstadoPedido = Pedido['estado'];

export const ESTADOS_PEDIDO: { key: EstadoPedido; label: string; icon: string; color: string }[] = [
  { key: 'pendiente', label: 'Pendiente', icon: '🕐', color: '#f59e0b' },
  { key: 'confirmado', label: 'Confirmado', icon: '✅', color: '#3b82f6' },
  { key: 'en_preparacion', label: 'En Preparación', icon: '📦', color: '#8b5cf6' },
  { key: 'en_camino', label: 'En Camino', icon: '🚚', color: '#06b6d4' },
  { key: 'entregado', label: 'Entregado', icon: '🎉', color: '#10b981' },
  { key: 'cancelado', label: 'Cancelado', icon: '❌', color: '#ef4444' },
];
