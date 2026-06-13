// =============================================================
// Producto Types — Productos, catálogo y categorías
// =============================================================

export interface Categoria {
  id: string
  nombre: string
  descripcion: string
  activo: boolean
  fechaCreacion: string
}

export type CategoriaForm = Omit<Categoria, 'id' | 'fechaCreacion'>

// ── Marca ──────────────────────────────────────────────────────

export interface Marca {
  id: string
  nombre: string
  descripcion: string
  activo: boolean
  fechaCreacion: string
}

export type MarcaForm = Omit<Marca, 'id' | 'fechaCreacion'>

// ── Producto ───────────────────────────────────────────────────

export interface Producto {
  id: string
  sku: string
  marcaId?: string   // referencia a Marca.id
  marca: string   // referencia a Marca.id
  nombre: string
  descripcion: string
  categoriaId: string
  unidad: string
  precioCompra?: number | null
  /** Precio de lista / referencia antes de descuento */
  precioOfrecido: number
  /** Precio de venta efectivo al cliente */
  precioFinal: number
  stockMinimo: number
  /** URL pública del archivo en Google Drive */
  imagenUrl: string
  imagenLocation: string
  /** Cadena codificada en el QR (SKU o URL de consulta) */
  qrCode: string
  activo: boolean
  fechaCreacion: string
}

export type ProductoForm = Omit<Producto, 'id' | 'fechaCreacion'>

/** Vista de producto para el catálogo de una sucursal */
export interface ProductoCatalogo extends Producto{
  id: string
  sku: string
  marcaId?: string
  marca: string          // nombre de la marca (desnormalizado)
  nombre: string
  descripcion: string
  categoriaId: string
  precioCompra?: number | null
  precioOfrecido: number
  precioFinal: number
  /** Stock disponible en la sucursal consultada */
  stock: number
  imagenUrl: string
  qrCode: string
  /** true cuando stock <= stockMinimo */
  stockBajo: boolean
  sucursalId: string
  /**
   * true  → precio heredado del producto base.
   * false → precio independiente para esta sucursal.
   */
  precioUsaBase: boolean
  /** Fecha en que se registraron los precios en el inventario de la sucursal */
  fechaPrecio: string
}

/** Payload para subida de imagen al backend */
export interface ImagenUploadPayload {
  base64: string
  mimeType: string
  nombre: string
  productoId?: string
}

export interface ImportProductoRow {
  sku: string
  marca: string
  nombre: string
  descripcion?: string
  categoria?: string
  unidad?: string
  precioCompra?: number
  precioOfrecido?: number
  precioFinal: number
  stockMinimo?: number
  imagenUrl?: string
  activo?: boolean
  __rowNumber?: number
}

export interface ImportStockRow {
  sku: string
  sucursal: string
  stockInicial: number
  referencia?: string
  notas?: string
  __rowNumber?: number
}

export interface ImportResultItem {
  rowNumber: number
  sku: string
  action: 'created' | 'updated' | 'skipped' | 'error' | 'imported'
  message: string
}

export interface ImportProductosSummary {
  total: number
  created: number
  updated: number
  skipped: number
  errors: number
}

export interface ImportStockSummary {
  total: number
  imported: number
  skipped: number
  errors: number
}

export interface ImportProductosResponse {
  dryRun: boolean
  summary: ImportProductosSummary
  results: ImportResultItem[]
}

export interface ImportStockResponse {
  dryRun: boolean
  summary: ImportStockSummary
  results: ImportResultItem[]
}
