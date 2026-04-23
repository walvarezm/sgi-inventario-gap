// =============================================================
// LogService.gs — Registro de acciones críticas
// =============================================================

const LogService = {
  registrar(usuarioId, accion, modulo, sucursalId, detalle) {
    try {
      Sheets.insert('LogAcciones', {
        id: Sheets.generateId(),
        usuario_id: usuarioId || 'SYSTEM',
        accion: accion,
        modulo: modulo,
        sucursal_id: sucursalId || '',
        detalle: detalle || '',
        fecha: new Date().toISOString(),
      })
    } catch (e) {
      // No lanzar error por fallo en log
      Logger.log('LogService error: ' + e.message)
    }
  },
}
