// =============================================================
// cataloService.ts — Consulta de catálogo por sucursal
// =============================================================
import { api } from './api'
import type { ApiResponse, ProductoCatalogo } from 'src/types'

export const cataloService = {
  async getBySucursal(sucursalId: string): Promise<ProductoCatalogo[]> {
    const { data } = await api.post<ApiResponse<ProductoCatalogo[]>>('', {
      action: 'getCatalogo',
      payload: { sucursal_id: sucursalId },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
