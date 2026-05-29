// =============================================================
// guards.ts — Navigation guards con validación de rol y sucursal
// =============================================================
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import type { Rol } from 'src/types'
import { useAuthStore } from 'src/stores/authStore'

export function authGuard(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  // Las rutas con meta.public no requieren autenticación
  if (_to.meta?.public) { next(); return }
  const auth = useAuthStore()
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
  const auth = useAuthStore()
  if (auth.isAuthenticated) { next({ name: 'dashboard' }); return }
  next()
}

export function roleGuard(roles: Rol[]) {
  return (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): void => {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) { next({ name: 'login' }); return }
    if (!auth.hasRole(roles)) { next({ name: 'sin-permiso' }); return }
    next()
  }
}

export function permissionGuard(permission: string) {
  return (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): void => {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) { next({ name: 'login' }); return }
    if (!auth.can(permission)) { next({ name: 'sin-permiso' }); return }
    next()
  }
}

export function anyPermissionGuard(permissions: string[]) {
  return (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): void => {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) { next({ name: 'login' }); return }
    if (!auth.canAny(permissions)) { next({ name: 'sin-permiso' }); return }
    next()
  }
}

export function sucursalGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): void {
  const auth = useAuthStore()
  const sucursalId = to.query.sucursalId as string | undefined
  if (!auth.isAuthenticated) { next({ name: 'login' }); return }
  if (sucursalId && !auth.canAccessSucursal(sucursalId)) { next({ name: 'sin-permiso' }); return }
  next()
}
