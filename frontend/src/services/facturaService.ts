// =============================================================
// facturaService.ts — Facturación contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, Factura, FacturaForm } from 'src/types'

export const facturaService = {
  async getAll(filtros?: {
    sucursalId?: string
    estado?: string
    tipo?: string
    desde?: string
    hasta?: string
  }): Promise<Factura[]> {
    const { data } = await api.post<ApiResponse<Factura[]>>('', {
      action: 'getFacturas',
      payload: filtros ?? {},
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Factura> {
    const { data } = await api.post<ApiResponse<Factura>>('', {
      action: 'getFacturaById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(form: FacturaForm): Promise<Factura> {
    const { data } = await api.post<ApiResponse<Factura>>('', {
      action: 'createFactura',
      payload: form,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async anular(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'anularFactura',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async generarHtml(id: string): Promise<string> {
    const { data } = await api.post<ApiResponse<string>>('', {
      action: 'generarHtmlFactura',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
