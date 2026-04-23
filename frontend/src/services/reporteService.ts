// =============================================================
// reporteService.ts — KPIs y reportes desde GAS
// =============================================================
import { api } from './api'
import type {
  ApiResponse, KPIs, PuntoVentas, TopProducto,
  ReporteStockItem, FiltroReporte,
} from 'src/types'

export const reporteService = {
  async getKPIs(filtros?: { sucursalId?: string }): Promise<KPIs> {
    const { data } = await api.post<ApiResponse<KPIs>>('', {
      action: 'getKPIs',
      payload: filtros ?? {},
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getReporteVentas(filtros: FiltroReporte): Promise<PuntoVentas[]> {
    const { data } = await api.post<ApiResponse<PuntoVentas[]>>('', {
      action: 'getReporteVentas',
      payload: filtros,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getTopProductos(filtros: FiltroReporte): Promise<TopProducto[]> {
    const { data } = await api.post<ApiResponse<TopProducto[]>>('', {
      action: 'getTopProductos',
      payload: filtros,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getReporteStock(filtros: { sucursalId?: string }): Promise<ReporteStockItem[]> {
    const { data } = await api.post<ApiResponse<ReporteStockItem[]>>('', {
      action: 'getReporteStock',
      payload: filtros,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
