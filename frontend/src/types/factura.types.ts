// =============================================================
// factura.types.ts — Compatibilidad histórica con documentos de venta
// =============================================================

export * from './documento-venta.types'

import type {
  DetalleDocumentoVenta,
  DocumentoVenta,
  DocumentoVentaForm,
  EstadoDocumentoVenta,
  ItemCarrito as ItemCarritoDocumento,
  TipoDocumentoVenta,
} from './documento-venta.types'
import {
  ESTADO_DOCUMENTO_VENTA_COLOR,
  TIPO_DOCUMENTO_VENTA_LABELS,
} from './documento-venta.types'

export type TipoFactura = TipoDocumentoVenta
export type EstadoFactura = EstadoDocumentoVenta
export type Factura = DocumentoVenta
export type FacturaForm = DocumentoVentaForm
export type DetalleFactura = DetalleDocumentoVenta
export type DetalleFacturaForm = Omit<
  DetalleFactura,
  'id' | 'documentoId' | 'productoNombre' | 'productoSku'
>
export type ItemCarrito = ItemCarritoDocumento

export const TIPO_FACTURA_LABELS: Record<TipoFactura, string> = TIPO_DOCUMENTO_VENTA_LABELS
export const ESTADO_FACTURA_COLOR: Record<EstadoFactura, string> = ESTADO_DOCUMENTO_VENTA_COLOR
