// =============================================================
// Sucursal Types — Sucursales y bodegas
// =============================================================

export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  ciudad: string
  telefono: string
  email: string
  responsableId: string
  activo: boolean
  fechaCreacion: string
}

export type SucursalForm = Omit<Sucursal, 'id' | 'fechaCreacion'>

export interface SucursalOption {
  id: string
  nombre: string
  ciudad: string
  activo: boolean
}
