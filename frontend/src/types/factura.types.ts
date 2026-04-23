// =============================================================
// factura.types.ts — Facturas, POS y detalles
// =============================================================

export type TipoFactura = 'FACTURA' | 'NOTA_CREDITO' | 'RECIBO'
export type EstadoFactura = 'EMITIDA' | 'ANULADA' | 'PENDIENTE'

export const TIPO_FACTURA_LABELS: Record<TipoFactura, string> = {
  FACTURA:      'Factura',
  NOTA_CREDITO: 'Nota de Crédito',
  RECIBO:       'Recibo',
}

export const ESTADO_FACTURA_COLOR: Record<EstadoFactura, string> = {
  EMITIDA:  'positive',
  ANULADA:  'negative',
  PENDIENTE:'warning',
}

export interface DetalleFactura {
  id: string
  facturaId: string
  productoId: string
  productoNombre: string
  productoSku: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type DetalleFacturaForm = Omit<DetalleFactura, 'id' | 'facturaId' | 'productoNombre' | 'productoSku'>

export interface Factura {
  id: string
  numero: string
  tipo: TipoFactura
  cliente: string
  sucursalId: string
  fecha: string
  subtotal: number
  impuesto: number
  total: number
  estado: EstadoFactura
  usuarioId: string
  notas: string
  detalles?: DetalleFactura[]
}

export type FacturaForm = {
  cliente: string
  sucursalId: string
  tipo?: TipoFactura
  notas?: string
  items: {
    productoId: string
    cantidad: number
    precioUnitario: number
  }[]
}

// ── POS ────────────────────────────────────────────────────────

export interface ItemCarrito {
  productoId: string
  sku: string
  nombre: string
  marca: string
  imagenUrl: string
  precioUnitario: number
  cantidad: number
  subtotal: number
  stockDisponible: number
}
