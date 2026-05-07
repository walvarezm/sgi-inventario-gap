// =============================================================
// usuarioService.ts — CRUD de usuarios y seguridad
// =============================================================
import { api } from './api'
import type { ApiResponse, Usuario, UsuarioForm } from 'src/types'

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const { data } = await api.post<ApiResponse<Usuario[]>>('', {
      action: 'getUsuarios',
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<Usuario> {
    const { data } = await api.post<ApiResponse<Usuario>>('', {
      action: 'getUsuarioById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(usuario: UsuarioForm & { password?: string; roles?: string[]; scopeValues?: string[] }): Promise<Usuario> {
    const { data } = await api.post<ApiResponse<Usuario>>('', {
      action: 'createUsuario',
      payload: usuario,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<UsuarioForm> & { password?: string; roles?: string[]; scopeValues?: string[] }): Promise<Usuario> {
    const { data } = await api.post<ApiResponse<Usuario>>('', {
      action: 'updateUsuario',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteUsuario',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
