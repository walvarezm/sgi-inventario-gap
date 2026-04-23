// =============================================================
// inventarioService.ts — Movimientos e inventario por sucursal
// =============================================================
import { api } from './api'
import type {
  ApiResponse,
  InventarioItem,
  Movimiento,
  EntradaPayload,
  SalidaPayload,
  TransferenciaPayload,
  StockResumen,
} from 'src/types'

export const inventarioService = {
  async getStockPorSucursal(sucursalId: string): Promise<InventarioItem[]> {
    const { data } = await api.post<ApiResponse<InventarioItem[]>>('', {
      action: 'getStockPorSucursal',
      payload: { sucursalId },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getStockProducto(productoId: string, sucursalId: string): Promise<InventarioItem> {
    const { data } = await api.post<ApiResponse<InventarioItem>>('', {
      action: 'getStockProducto',
      payload: { productoId, sucursalId },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getMovimientos(
    sucursalId: string,
    desde?: string,
    hasta?: string,
  ): Promise<Movimiento[]> {
    const { data } = await api.post<ApiResponse<Movimiento[]>>('', {
      action: 'getMovimientos',
      payload: { sucursalId, desde, hasta },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async registrarEntrada(payload: EntradaPayload): Promise<Movimiento> {
    const { data } = await api.post<ApiResponse<Movimiento>>('', {
      action: 'registrarEntrada',
      payload,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async registrarSalida(payload: SalidaPayload): Promise<Movimiento> {
    const { data } = await api.post<ApiResponse<Movimiento>>('', {
      action: 'registrarSalida',
      payload,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async transferir(payload: TransferenciaPayload): Promise<Movimiento> {
    const { data } = await api.post<ApiResponse<Movimiento>>('', {
      action: 'transferir',
      payload,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getAlertasStock(sucursalId: string): Promise<StockResumen[]> {
    const { data } = await api.post<ApiResponse<StockResumen[]>>('', {
      action: 'getAlertasStock',
      payload: { sucursalId },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
