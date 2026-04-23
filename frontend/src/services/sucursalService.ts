// =============================================================
// sucursalService.ts — CRUD de Sucursales contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, Sucursal, SucursalForm } from 'src/types'

export const sucursalService = {
  async getAll(): Promise<Sucursal[]> {
    const { data } = await api.post<ApiResponse<Sucursal[]>>('', {
      action: 'getSucursales',
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Sucursal> {
    const { data } = await api.post<ApiResponse<Sucursal>>('', {
      action: 'getSucursalById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(sucursal: SucursalForm): Promise<Sucursal> {
    const { data } = await api.post<ApiResponse<Sucursal>>('', {
      action: 'createSucursal',
      payload: sucursal,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<SucursalForm>): Promise<Sucursal> {
    const { data } = await api.post<ApiResponse<Sucursal>>('', {
      action: 'updateSucursal',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteSucursal',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async toggleActivo(id: string, activo: boolean): Promise<Sucursal> {
    return sucursalService.update(id, { activo })
  },
}
