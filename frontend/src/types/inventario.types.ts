// =============================================================
// Inventario Types — Stock, movimientos y transferencias
// =============================================================

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE'
export type ModoMovimiento = 'UNITARIO' | 'MASIVO'
export type ReferenciaMovimientoTipo =
  | 'INICIO_INVENTARIO'
  | 'CIERRE_INVENTARIO'
  | 'REPOSICION_PRODUCTO'
  | 'BAJA_PRODUCTO'
  | 'OTRO'

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

export interface InventarioRow extends InventarioItem  {
  stockMinimo: number
  stockBajo: boolean
  sku: string
  nombre: string
  marca: string
  marcaId: string
  categoriaId: string
  unidad: string
  imagenUrl: string
  imagenLocation: string
}

export interface Movimiento {
  id: string
  cabeceraId?: string
  tipo: TipoMovimiento
  modo?: ModoMovimiento
  productoId: string
  productoSku?: string
  productoNombre?: string
  sucursalOrigen: string | null
  sucursalDestino: string | null
  cantidad: number
  referencia: string
  referenciaTipo?: ReferenciaMovimientoTipo
  referenciaTexto?: string
  fechaRegistro?: string
  precioOfrecido?: number
  precioFinal?: number
  detalleAccion?: string
  editable?: boolean
  usuarioId: string
  fecha: string
  notas: string
}

export type MovimientoForm = Omit<Movimiento, 'id' | 'fecha' | 'usuarioId'>

export interface MovimientoCabecera {
  id: string
  tipo: TipoMovimiento
  modo: ModoMovimiento
  sucursalOrigen: string | null
  sucursalDestino: string | null
  fechaRegistro: string
  referenciaTipo: ReferenciaMovimientoTipo
  referenciaTexto: string
  referencia: string
  notas: string
  usuarioId: string
  estado: 'ACTIVO' | 'EDITADO' | 'ANULADO'
  fechaCreacion: string
  fechaActualizacion: string
  cantidadTotal: number
  totalLineas: number
  editable: boolean
  items?: MovimientoDetalleItem[]
}

export interface MovimientoDetalleItem {
  id?: string
  movimientoOrigenId?: string
  productoId: string
  productoSku?: string
  productoNombre?: string
  cantidad: number
  precioOfrecido: number
  precioFinal: number
  detalleAccion?: string
  secuencial?: number
}

export interface MovimientoPayloadBase {
  tipo: TipoMovimiento
  modo?: ModoMovimiento
  fechaRegistro: string
  referenciaTipo: ReferenciaMovimientoTipo
  referenciaTexto: string
  notas?: string
}

export interface EntradaPayload extends MovimientoPayloadBase {
  sucursalId: string
  productoId: string
  cantidad: number
  precioOfrecido?: number
  precioFinal?: number
  detalleAccion?: string
}

export interface SalidaPayload extends MovimientoPayloadBase {
  sucursalId: string
  productoId: string
  cantidad: number
  precioOfrecido?: number
  precioFinal?: number
  detalleAccion?: string
}

export interface TransferenciaPayload extends MovimientoPayloadBase {
  productoId: string
  sucursalOrigen: string
  sucursalDestino: string
  cantidad: number
  precioOfrecido?: number
  precioFinal?: number
  detalleAccion?: string
}

export interface MovimientoMasivoPayload extends MovimientoPayloadBase {
  sucursalId?: string
  sucursalOrigen?: string
  sucursalDestino?: string
  items: MovimientoDetalleItem[]
}

export interface MovimientoUpdatePayload extends MovimientoMasivoPayload {
  cabeceraId: string
}

export interface StockResumen {
  productoId: string
  sucursalId: string
  stockActual: number
  stockMinimo: number
  stockBajo: boolean
}

export interface ReferenciaMovimientoTemplate {
  tipo: ReferenciaMovimientoTipo
  textoBase: string
  detalleLabel: string
}
