// =============================================================
// marcaService.ts — CRUD de Marcas contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, Marca, MarcaForm } from 'src/types'

export const marcaService = {
  async getAll(soloActivas = true): Promise<Marca[]> {
    const { data } = await api.post<ApiResponse<Marca[]>>('', {
      action: 'getMarcas',
      payload: { todos: !soloActivas },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Marca> {
    const { data } = await api.post<ApiResponse<Marca>>('', {
      action: 'getMarcaById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(form: MarcaForm): Promise<Marca> {
    const { data } = await api.post<ApiResponse<Marca>>('', {
      action: 'createMarca',
      payload: form,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<MarcaForm>): Promise<Marca> {
    const { data } = await api.post<ApiResponse<Marca>>('', {
      action: 'updateMarca',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteMarca',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
