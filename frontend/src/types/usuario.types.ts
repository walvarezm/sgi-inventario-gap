// =============================================================
// Usuario Types — Usuarios, roles y sesión
// =============================================================

export type Rol =
  | 'ADMINISTRADOR'
  | 'SUPERVISOR'
  | 'BODEGUERO'
  | 'VENDEDOR'
  | 'CONTADOR'

export const ROL_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  BODEGUERO: 'Bodeguero',
  VENDEDOR: 'Vendedor',
  CONTADOR: 'Contador',
}

/** Roles con acceso global a todas las sucursales */
export const ROLES_GLOBALES: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR']

/** Roles que pueden usar el POS */
export const ROLES_POS: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'VENDEDOR']

/** Roles que pueden gestionar inventario */
export const ROLES_INVENTARIO: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'BODEGUERO']

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  /** ID de la sucursal asignada. 'ALL' para Administrador */
  sucursalId: string
  activo: boolean
  fechaCreacion: string
}

export type UsuarioForm = Omit<Usuario, 'id' | 'fechaCreacion'>

export interface SesionUsuario {
  userId: string
  nombre: string
  email: string
  rol: Rol
  sucursalId: string
  token: string
  expiresAt: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  sesion: SesionUsuario
}
