// =============================================================
// reporte.types.ts — Tipos para KPIs y reportes
// =============================================================

export interface KPIs {
  ventasHoy: number
  ventasMes: number
  facturasCantidadHoy: number
  facturasCantidadMes: number
  productosActivos: number
  stockBajo: number
  valorInventario: number
  movimientosHoy: number
  sucursalesActivas: number
}

export interface PuntoVentas {
  fecha: string
  total: number
  cantidad: number
}

export interface TopProducto {
  productoId: string
  sku: string
  nombre: string
  marca: string
  cantidadVendida: number
  totalVendido: number
}

export interface ReporteStockItem {
  productoId: string
  sucursalId: string
  sku: string
  nombre: string
  marca: string
  categoria: string
  unidad: string
  stockActual: number
  stockMinimo: number
  stockBajo: boolean
  precioCompra: number
  precioFinal: number
  valorCosto: number
  valorVenta: number
  fechaActualizacion: string
}

export interface FiltroReporte {
  sucursalId?: string
  desde?: string
  hasta?: string
  agruparPor?: 'dia' | 'mes'
  limite?: number
}
