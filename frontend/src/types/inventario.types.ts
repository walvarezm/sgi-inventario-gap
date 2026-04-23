// =============================================================
// Inventario Types — Stock, movimientos y transferencias
// =============================================================

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE'

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  TRANSFERENCIA: 'Transferencia',
  AJUSTE: 'Ajuste de inventario',
}

export interface InventarioItem {
  id: string
  productoId: string
  sucursalId: string
  stockActual: number
  fechaActualizacion: string
}

export interface Movimiento {
  id: string
  tipo: TipoMovimiento
  productoId: string
  sucursalOrigen: string | null
  sucursalDestino: string | null
  cantidad: number
  referencia: string
  usuarioId: string
  fecha: string
  notas: string
}

export type MovimientoForm = Omit<Movimiento, 'id' | 'fecha' | 'usuarioId'>

export interface EntradaPayload {
  productoId: string
  sucursalId: string
  cantidad: number
  referencia: string
  notas?: string
}

export interface SalidaPayload {
  productoId: string
  sucursalId: string
  cantidad: number
  referencia: string
  notas?: string
}

export interface TransferenciaPayload {
  productoId: string
  sucursalOrigen: string
  sucursalDestino: string
  cantidad: number
  notas?: string
}

export interface StockResumen {
  productoId: string
  sucursalId: string
  stockActual: number
  stockMinimo: number
  stockBajo: boolean
}
