// =============================================================
// rolService.ts — CRUD de roles y permisos
// =============================================================
import { api } from './api'
import type { ApiResponse, PermissionEntity, RoleEntity } from 'src/types'

export const rolService = {
  async getAll(): Promise<RoleEntity[]> {
    const { data } = await api.post<ApiResponse<RoleEntity[]>>('', {
      action: 'getRoles',
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getById(id: string): Promise<RoleEntity> {
    const { data } = await api.post<ApiResponse<RoleEntity>>('', {
      action: 'getRoleById',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(role: Partial<RoleEntity>): Promise<RoleEntity> {
    const { data } = await api.post<ApiResponse<RoleEntity>>('', {
      action: 'createRole',
      payload: role,
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<RoleEntity>): Promise<RoleEntity> {
    const { data } = await api.post<ApiResponse<RoleEntity>>('', {
      action: 'updateRole',
      payload: { id, ...changes },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async remove(id: string): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'deleteRole',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getPermisos(): Promise<PermissionEntity[]> {
    const { data } = await api.post<ApiResponse<PermissionEntity[]>>('', {
      action: 'getPermisos',
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async getRolePermisos(id: string): Promise<Array<{ id: string; permisoId: string; codigo: string; allow: boolean }>> {
    const { data } = await api.post<ApiResponse<Array<{ id: string; permisoId: string; codigo: string; allow: boolean }>>>('', {
      action: 'getRolePermisos',
      payload: { id },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async setRolePermisos(id: string, permisos: string[]): Promise<Array<{ id: string; permisoId: string; codigo: string; allow: boolean }>> {
    const { data } = await api.post<ApiResponse<Array<{ id: string; permisoId: string; codigo: string; allow: boolean }>>>('', {
      action: 'setRolePermisos',
      payload: { id, permisos },
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },
}
