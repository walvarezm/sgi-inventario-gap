// =============================================================
// authStore.ts — Gestión de sesión y autenticación
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LocalStorage } from 'quasar'
import type { SesionUsuario, LoginCredentials, Rol } from 'src/types'
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
    if (!sesion.value) return false
    return Date.now() < sesion.value.expiresAt
  })

  const token = computed(() => sesion.value?.token ?? null)
  const rol = computed(() => sesion.value?.rol ?? null)
  const sucursalId = computed(() => sesion.value?.sucursalId ?? null)
  const nombreUsuario = computed(() => sesion.value?.nombre ?? '')

  const isGlobal = computed(() =>
    sesion.value ? ROLES_GLOBALES.includes(sesion.value.rol as Rol) : false,
  )

  // ── Actions ──────────────────────────────────────────────
  async function login(credentials: LoginCredentials): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { sesion: nuevaSesion } = await authService.login(credentials)
      sesion.value = nuevaSesion
      LocalStorage.set(SESSION_KEY, nuevaSesion)
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
    return sesion.value ? roles.includes(sesion.value.rol) : false
  }

  function canAccessSucursal(id: string): boolean {
    if (!sesion.value) return false
    if (isGlobal.value) return true
    return sesion.value.sucursalId === id
  }

  return {
    sesion, loading, error, isAuthenticated, token, rol,
    sucursalId, nombreUsuario, isGlobal, login, logout, hasRole, canAccessSucursal,
  }
})
