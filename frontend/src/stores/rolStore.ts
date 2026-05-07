// =============================================================
// rolStore.ts — Estado global de roles y permisos
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PermissionEntity, RoleEntity } from 'src/types'
import { rolService } from 'src/services/rolService'

export const useRolStore = defineStore('rol', () => {
  const roles = ref<RoleEntity[]>([])
  const permissions = ref<PermissionEntity[]>([])
  const rolePermissions = ref<Record<string, string[]>>({})
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const activos = computed(() => roles.value.filter((r) => r.activo))
  const roleOptions = computed(() => activos.value.map((r) => ({ label: r.nombre, value: r.codigo })))
  const permissionOptions = computed(() =>
    permissions.value.map((p) => ({
      label: `${p.codigo} — ${p.descripcion || p.modulo}`,
      value: p.codigo,
    })),
  )

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [rolesData, permissionsData] = await Promise.all([
        rolService.getAll(),
        rolService.getPermisos(),
      ])
      roles.value = rolesData
      permissions.value = permissionsData
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function loadRolePermissions(roleId: string): Promise<string[]> {
    const data = await rolService.getRolePermisos(roleId)
    rolePermissions.value[roleId] = data.filter((item) => item.allow).map((item) => item.codigo)
    return rolePermissions.value[roleId]
  }

  async function create(payload: Partial<RoleEntity>): Promise<RoleEntity> {
    saving.value = true
    error.value = null
    try {
      const nuevo = await rolService.create(payload)
      roles.value.push(nuevo)
      return nuevo
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, payload: Partial<RoleEntity>): Promise<RoleEntity> {
    saving.value = true
    error.value = null
    try {
      const actualizado = await rolService.update(id, payload)
      const idx = roles.value.findIndex((r) => r.id === id)
      if (idx !== -1) roles.value[idx] = actualizado
      return actualizado
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    saving.value = true
    error.value = null
    try {
      await rolService.remove(id)
      const idx = roles.value.findIndex((r) => r.id === id)
      if (idx !== -1) roles.value[idx] = { ...roles.value[idx], activo: false }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function saveRolePermissions(roleId: string, permisos: string[]): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const data = await rolService.setRolePermisos(roleId, permisos)
      rolePermissions.value[roleId] = data.filter((item) => item.allow).map((item) => item.codigo)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  function getRoleById(id: string): RoleEntity | undefined {
    return roles.value.find((r) => r.id === id)
  }

  return {
    roles, permissions, rolePermissions, loading, saving, error,
    activos, roleOptions, permissionOptions,
    fetchAll, loadRolePermissions, create, update, remove, saveRolePermissions, getRoleById,
  }
})
