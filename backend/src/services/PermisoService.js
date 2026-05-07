// =============================================================
// PermisoService.gs — Consulta del catálogo de permisos
// =============================================================

const PermisoService = {
  getAll(_payload, session) {
    AccessService.assert(session, 'roles.ver', 'Sin permiso para ver permisos')
    return AccessService.getAllPermissions()
  },
}
