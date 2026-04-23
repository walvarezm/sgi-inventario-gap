// =============================================================
// Producto Types — Productos, catálogo y categorías
// =============================================================

export interface Categoria {
  id: string
  nombre: string
  descripcion: string
  activo: boolean
}

export interface Producto {
  id: string
  sku: string
  marca: string
  nombre: string
  descripcion: string
  categoriaId: string
  unidad: string
  precioCompra: number
  /** Precio de lista / referencia antes de descuento */
  precioOfrecido: number
  /** Precio de venta efectivo al cliente */
  precioFinal: number
  stockMinimo: number
  /** URL pública del archivo en Google Drive */
  imagenUrl: string
  /** Cadena codificada en el QR (SKU o URL de consulta) */
  qrCode: string
  activo: boolean
  fechaCreacion: string
}

export type ProductoForm = Omit<Producto, 'id' | 'fechaCreacion'>

/** Vista de producto para el catálogo de una sucursal */
export interface ProductoCatalogo {
  id: string
  sku: string
  marca: string
  nombre: string
  descripcion: string
  categoriaId: string
  precioOfrecido: number
  precioFinal: number
  /** Stock disponible en la sucursal consultada */
  stock: number
  imagenUrl: string
  qrCode: string
  /** true cuando stock <= stockMinimo */
  stockBajo: boolean
}

/** Payload para subida de imagen al backend */
export interface ImagenUploadPayload {
  base64: string
  mimeType: string
  nombre: string
  productoId?: string
}
