// =============================================================
// documento-venta.types.ts — Documentos comerciales y POS
// =============================================================

export type TipoDocumentoVenta =
  | 'FACTURA'
  | 'VENTA_SIN_FACTURA'
  | 'PROFORMA'
  | 'COTIZACION'
  | 'NOTA_CREDITO'

export type EstadoDocumentoVenta =
  | 'BORRADOR'
  | 'EMITIDA'
  | 'ANULADA'
  | 'VENCIDA'
  | 'CONVERTIDA'

export type TipoDescuento = 'NINGUNO' | 'MONTO' | 'PORCENTAJE'

export type MetodoPago =
  | 'EFECTIVO'
  | 'QR'
  | 'TRANSFERENCIA'
  | 'TARJETA'
  | 'CREDITO'
  | 'MIXTO'

export const TIPO_DOCUMENTO_VENTA_LABELS: Record<TipoDocumentoVenta, string> = {
  FACTURA: 'Factura',
  VENTA_SIN_FACTURA: 'Venta sin factura',
  PROFORMA: 'Proforma',
  COTIZACION: 'Cotización',
  NOTA_CREDITO: 'Nota de Crédito',
}

export const TIPO_DOCUMENTO_LABELS = TIPO_DOCUMENTO_VENTA_LABELS

export const ESTADO_DOCUMENTO_VENTA_COLOR: Record<EstadoDocumentoVenta, string> = {
  BORRADOR: 'grey-6',
  EMITIDA: 'positive',
  ANULADA: 'negative',
  VENCIDA: 'warning',
  CONVERTIDA: 'info',
}

export const ESTADO_DOCUMENTO_COLOR = ESTADO_DOCUMENTO_VENTA_COLOR

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  QR: 'QR',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  CREDITO: 'Crédito',
  MIXTO: 'Mixto',
}

export interface ClienteDocumento {
  nombre: string
  nitCi: string
  telefono: string
  email: string
}

export interface PagoDocumentoForm {
  metodoPago: MetodoPago
  monto: number
  referencia?: string
  moneda?: string
  detalle?: string
}

export interface PagoDocumentoVenta extends PagoDocumentoForm {
  id: string
  documentoId: string
  fecha: string
  usuarioId: string
}

export interface ItemDocumentoForm {
  productoId: string
  cantidad: number
  precioLista: number
  precioUnitario: number
  descuentoTipo: TipoDescuento
  descuentoValor: number
  descuentoMonto: number
  subtotal: number
  notas?: string
}

export interface DetalleDocumentoVenta extends ItemDocumentoForm {
  id: string
  documentoId: string
  productoSku: string
  productoNombre: string
}

export interface DocumentoVentaForm {
  tipo: TipoDocumentoVenta
  sucursalId: string
  cliente: ClienteDocumento
  items: ItemDocumentoForm[]
  descuentoGlobalTipo?: TipoDescuento
  descuentoGlobalValor?: number
  descuentoGlobalMonto?: number
  notas?: string
  observaciones?: string
  vigenciaHasta?: string
  pagos?: PagoDocumentoForm[]
  documentoOrigenId?: string
}

export interface DocumentoVenta {
  id: string
  numero: string
  tipo: TipoDocumentoVenta
  estado: EstadoDocumentoVenta
  cliente: string
  clienteNombre: string
  clienteNitCi: string
  clienteTelefono: string
  clienteEmail: string
  sucursalId: string
  fecha: string
  vigenciaHasta: string
  moneda: string
  subtotal: number
  descuentoGlobalMonto: number
  descuentoGlobalPorcentaje: number
  descuentoTotal: number
  impuesto: number
  total: number
  saldoPendiente: number
  usuarioId: string
  notas: string
  observaciones: string
  documentoOrigenId: string
  requierePago: boolean
  afectaStock: boolean
  esFiscal: boolean
  detalles?: DetalleDocumentoVenta[]
  pagos?: PagoDocumentoVenta[]
}

export interface ItemCarrito {
  productoId: string
  sku: string
  nombre: string
  marca: string
  imagenUrl: string
  imagenLocation: string
  stockDisponible: number
  precioLista: number
  precioUnitario: number
  descuentoTipo: TipoDescuento
  descuentoValor: number
  descuentoMonto: number
  cantidad: number
  subtotal: number
  notas?: string
}
