// =============================================================
// Usuario Types — Usuarios, roles y sesión
// =============================================================

export type Rol =
  | 'ADMINISTRADOR'
  | 'SUPERVISOR'
  | 'BODEGUERO'
  | 'VENDEDOR'
  | 'CONTADOR'
  | 'CONSULTA_CATALOGO'
  | 'COMPRAS'
  | 'AUDITOR'
  | (string & {})

export type PermissionCode = string

export interface PermissionScope {
  scopeType: string
  scopeValue: string
  allow?: boolean
}

export const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  BODEGUERO: 'Bodeguero',
  VENDEDOR: 'Vendedor',
  CONTADOR: 'Contador',
  CONSULTA_CATALOGO: 'Consulta catálogo',
  COMPRAS: 'Compras',
  AUDITOR: 'Auditor',
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
  roles?: Rol[]
  permissions?: PermissionCode[]
  /** ID de la sucursal asignada. 'ALL' para Administrador */
  sucursalId: string
  sucursalDefault?: string
  scopeType?: string
  accessibleSucursales?: string[]
  activo: boolean
  fechaCreacion: string
}

export type UsuarioForm = Omit<Usuario, 'id' | 'fechaCreacion'>

export interface RoleEntity {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  activo: boolean
  esSistema: boolean
  fechaCreacion: string
}

export interface PermissionEntity {
  id: string
  codigo: string
  modulo: string
  accion: string
  descripcion: string
  activo: boolean
  fechaCreacion: string
}

export interface SesionUsuario {
  userId: string
  nombre: string
  email: string
  rol: Rol
  roles: Rol[]
  permissions: PermissionCode[]
  permissionScopes: Record<string, PermissionScope[]>
  sucursalId: string
  accessibleSucursales: string[]
  isGlobal: boolean
  scopeType: string
  scopeValues: string[]
  token: string
  expiresAt: number
  expiresAtEnd: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  sesion: SesionUsuario
}
