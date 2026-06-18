// =============================================================
// categoriaService.ts — CRUD de Categorías contra GAS
// =============================================================
import { api } from './api'
import type { ApiResponse, Categoria } from 'src/types'

export type CategoriaForm = Omit<Categoria, 'id' | 'fechaCreacion'>

export const categoriaService = {
  async getAll(soloActivas = true): Promise<Categoria[]> {
    const { data } = await api.post<ApiResponse<Categoria[]>>('', {
      action: 'getCategorias',
      payload: { todos: !soloActivas },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Categoria> {
    const { data } = await api.post<ApiResponse<Categoria>>('', {
      action: 'getCategoriaById',
      payload: { id },
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

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteCategoria',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
