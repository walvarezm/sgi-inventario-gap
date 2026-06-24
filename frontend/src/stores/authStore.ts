// =============================================================
// authStore.ts — Gestión de sesión y autenticación
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LocalStorage } from 'quasar'
import type { SesionUsuario, LoginCredentials, PermissionScope, Rol } from 'src/types'
import { ROLES_GLOBALES } from 'src/types'
import { authService } from 'src/services/authService'

const SESSION_KEY = 'sgi_session'

export const useAuthStore = defineStore('auth', () => {
  // ── State ────────────────────────────────────────────────
  const sesion = ref<SesionUsuario | null>(
    (LocalStorage.getItem(SESSION_KEY) as SesionUsuario | null) ?? null,
  )
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Getters ──────────────────────────────────────────────
  const isAuthenticated = computed(() => {
    console.log('sesion.value', sesion.value)
    if (!sesion.value) return false
    return Date.now() < sesion.value.expiresAt
  })

  const token = computed(() => sesion.value?.token ?? null)
  const rol = computed(() => sesion.value?.rol ?? null)
  const roles = computed<Rol[]>(() => {
    if (!sesion.value) return []
    if (sesion.value.roles && sesion.value.roles.length) return sesion.value.roles
    return sesion.value.rol ? [sesion.value.rol] : []
  })
  const sucursalId = computed(() => sesion.value?.sucursalId ?? null)
  const nombreUsuario = computed(() => sesion.value?.nombre ?? '')
  const permissions = computed(() => sesion.value?.permissions ?? [])

  const isGlobal = computed(() =>
    sesion.value ? (sesion.value.isGlobal === true || ROLES_GLOBALES.includes(sesion.value.rol as Rol)) : false,
  )

  // ── Actions ──────────────────────────────────────────────
  async function login(credentials: LoginCredentials): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { sesion: nuevaSesion } = await authService.login(credentials)
      sesion.value = nuevaSesion
      sesion.value.expiresAtEnd = new Date(nuevaSesion.expiresAt).toLocaleTimeString('es-BO')
      LocalStorage.set(SESSION_KEY, sesion.value || nuevaSesion)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    sesion.value = null
    LocalStorage.remove(SESSION_KEY)
  }

  function hasRole(roles: Rol[]): boolean {
    const currentSession = sesion.value
    if (!currentSession) return false
    const currentRoles = currentSession.roles && currentSession.roles.length
      ? currentSession.roles
      : [currentSession.rol]
    return roles.some(role => currentRoles.includes(role))
  }

  function can(permission: string, sucursalScopeId?: string): boolean {
    if (!sesion.value) return false
    if (permissions.value.includes('*') || permissions.value.includes(permission)) {
      if (!sucursalScopeId) return true
      if (isGlobal.value) return true

      const scopes = sesion.value.permissionScopes?.[permission] || sesion.value.permissionScopes?.['*'] || []
      if (!scopes.length) return canAccessSucursal(sucursalScopeId)
      return scopes.some(scope => scopeAllowsSucursal(scope, sucursalScopeId))
    }
    return false
  }

  function canAny(perms: string[], sucursalScopeId?: string): boolean {
    return perms.some(permission => can(permission, sucursalScopeId))
  }

  function canAccessSucursal(id: string): boolean {
    if (!sesion.value) return false
    if (isGlobal.value) return true
    const accesibles = sesion.value.accessibleSucursales || []
    if (accesibles.length) return accesibles.includes(id)
    return sesion.value.sucursalId === id
  }

  function scopeAllowsSucursal(scope: PermissionScope, sucursalScopeId: string): boolean {
    const scopeType = String(scope.scopeType || '').toUpperCase()
    const scopeValue = String(scope.scopeValue || '').toUpperCase()
    if (scopeType === 'GLOBAL' || scopeValue === 'ALL' || scopeValue === '*') return true
    if (scopeType === 'SUCURSAL_PROPIA') return sesion.value?.sucursalId === sucursalScopeId
    return String(scope.scopeValue || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .includes(sucursalScopeId)
  }

  return {
    sesion, loading, error, isAuthenticated, token, rol,
    roles, sucursalId, nombreUsuario, permissions, isGlobal,
    login, logout, hasRole, can, canAny, canAccessSucursal,
  }
})
