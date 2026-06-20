// =============================================================
// useSucursalCatalog.ts — Constantes y helpers compartidos del
// selector de sucursal en el catálogo.
// =============================================================

/** Token especial que representa la vista global de todas las sucursales. */
export const TODAS_LAS_SUCURSALES = '__ALL__'

/** ¿El identificador recibido representa la vista global consolidada? */
export function esTodasLasSucursales(id: string | null | undefined): boolean {
  return id === TODAS_LAS_SUCURSALES
}
