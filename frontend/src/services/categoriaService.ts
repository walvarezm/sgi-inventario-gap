// =============================================================
// categoriaService.ts — CRUD de Categorías contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, Categoria } from 'src/types'

export type CategoriaForm = Omit<Categoria, 'id' | 'fechaCreacion'>

export const categoriaService = {
  async getAll(): Promise<Categoria[]> {
    const { data } = await api.post<ApiResponse<Categoria[]>>('', {
      action: 'getCategorias',
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(form: CategoriaForm): Promise<Categoria> {
    const { data } = await api.post<ApiResponse<Categoria>>('', {
      action: 'createCategoria',
      payload: form,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<CategoriaForm>): Promise<Categoria> {
    const { data } = await api.post<ApiResponse<Categoria>>('', {
      action: 'updateCategoria',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
