// =============================================================
// proveedor.types.ts — Tipos de proveedores y órdenes de compra
// =============================================================

export interface Proveedor {
  id: string
  nombre: string
  rucNit: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  ciudad: string
  notas: string
  activo: boolean
  fechaCreacion: string
}

export type ProveedorForm = Omit<Proveedor, 'id' | 'fechaCreacion'>

// ── Órdenes de Compra ──────────────────────────────────────────

export type EstadoOrden = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA'

export const ESTADO_ORDEN_LABELS: Record<EstadoOrden, string> = {
  PENDIENTE:  'Pendiente',
  PARCIAL:    'Recepción parcial',
  COMPLETADA: 'Completada',
  CANCELADA:  'Cancelada',
}

export const ESTADO_ORDEN_COLOR: Record<EstadoOrden, string> = {
  PENDIENTE:  'warning',
  PARCIAL:    'info',
  COMPLETADA: 'positive',
  CANCELADA:  'grey',
}

export interface DetalleOrden {
  id: string
  productoId: string
  productoNombre: string
  productoSku: string
  cantidadPedida: number
  cantidadRecibida: number
  precioUnitario: number
  subtotal: number
}

export type DetalleOrdenForm = {
  productoId: string
  cantidadPedida: number
  precioUnitario: number
}

export interface OrdenCompra {
  id: string
  numero: string
  proveedorId: string
  proveedorNombre: string
  sucursalId: string
  fechaEmision: string
  fechaEstimada: string
  estado: EstadoOrden
  subtotal: number
  total: number
  notas: string
  usuarioId: string
  detalles?: DetalleOrden[]
}

export type OrdenCompraForm = {
  proveedorId: string
  sucursalId: string
  fechaEstimada?: string
  notas?: string
  detalles: DetalleOrdenForm[]
}

export interface RecepcionPayload {
  ordenId: string
  detallesRecibidos: { detalleId: string; cantidadRecibida: number }[]
  notas?: string
}
