// =============================================================
// guards.ts — Navigation guards con validación de rol y sucursal
// =============================================================
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import type { Rol } from 'src/types'

function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAuthStore } = require('src/stores/authStore')
  return useAuthStore()
}

export function authGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  const auth = getAuthStore()
  if (!auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: _to.fullPath } })
    return
  }
  next()
}

export function guestGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  const auth = getAuthStore()
  if (auth.isAuthenticated) { next({ name: 'dashboard' }); return }
  next()
}

export function roleGuard(roles: Rol[]) {
  return (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): void => {
    const auth = getAuthStore()
    if (!auth.isAuthenticated) { next({ name: 'login' }); return }
    if (!auth.hasRole(roles)) { next({ name: 'sin-permiso' }); return }
    next()
  }
}

export function sucursalGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  const auth = getAuthStore()
  const sucursalId = to.query.sucursalId as string | undefined
  if (!auth.isAuthenticated) { next({ name: 'login' }); return }
  if (sucursalId && !auth.canAccessSucursal(sucursalId)) { next({ name: 'sin-permiso' }); return }
  next()
}
