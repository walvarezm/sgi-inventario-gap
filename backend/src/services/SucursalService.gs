// =============================================================
// SucursalService.gs — CRUD de Sucursales
// =============================================================

const SucursalService = {

  getAll() {
    return Sheets.getAll('Sucursales')
      .map(this._mapear)
  },

  getById(payload) {
    const { id } = payload
    const s = Sheets.getBy('Sucursales', 'id', id)
    if (!s) throw new Error('Sucursal no encontrada: ' + id)
    return this._mapear(s)
  },

  create(payload, session) {
    this._validar(payload)

    // Solo Administrador puede crear sucursales
    if (session.rol !== 'ADMINISTRADOR') {
      throw new Error('Solo el Administrador puede crear sucursales')
    }

    const nueva = {
      id: Sheets.generateId(),
      nombre: payload.nombre.trim(),
      direccion: payload.direccion.trim(),
      ciudad: payload.ciudad.trim(),
      telefono: payload.telefono || '',
      email: payload.email || '',
      responsable_id: payload.responsableId || '',
      activo: payload.activo !== undefined ? payload.activo : true,
      fecha_creacion: new Date().toISOString(),
    }

    Sheets.insert('Sucursales', nueva)
    LogService.registrar(
      session.userId, 'CREATE', 'Sucursales', nueva.id,
      'Sucursal creada: ' + nueva.nombre
    )

    return this._mapear(nueva)
  },

  update(payload, session) {
    const { id } = payload
    if (!id) throw new Error('ID de sucursal requerido')

    // Solo Admin/Supervisor pueden actualizar sucursales
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para actualizar sucursales')
    }

    const existente = Sheets.getBy('Sucursales', 'id', id)
    if (!existente) throw new Error('Sucursal no encontrada: ' + id)

    const cambios = {}
    if (payload.nombre !== undefined)        cambios.nombre = payload.nombre.trim()
    if (payload.direccion !== undefined)     cambios.direccion = payload.direccion.trim()
    if (payload.ciudad !== undefined)        cambios.ciudad = payload.ciudad.trim()
    if (payload.telefono !== undefined)      cambios.telefono = payload.telefono
    if (payload.email !== undefined)         cambios.email = payload.email
    if (payload.responsableId !== undefined) cambios.responsable_id = payload.responsableId
    if (payload.activo !== undefined)        cambios.activo = payload.activo

    const actualizada = Sheets.update('Sucursales', id, cambios)
    LogService.registrar(
      session.userId, 'UPDATE', 'Sucursales', id,
      'Sucursal actualizada: ' + (cambios.nombre || existente.nombre)
    )

    return this._mapear(actualizada)
  },

  remove(payload, session) {
    const { id } = payload
    if (!id) throw new Error('ID requerido')

    if (session.rol !== 'ADMINISTRADOR') {
      throw new Error('Solo el Administrador puede eliminar sucursales')
    }

    // Soft delete: marcar como inactiva en lugar de eliminar físicamente
    Sheets.update('Sucursales', id, { activo: false })
    LogService.registrar(session.userId, 'DELETE', 'Sucursales', id, 'Sucursal eliminada')
    return true
  },

  /** Valida campos requeridos */
  _validar(payload) {
    if (!payload.nombre || !payload.nombre.trim()) throw new Error('Nombre es requerido')
    if (!payload.direccion || !payload.direccion.trim()) throw new Error('Dirección es requerida')
    if (!payload.ciudad || !payload.ciudad.trim()) throw new Error('Ciudad es requerida')
  },

  /** Mapea fila de Sheets al formato de la API */
  _mapear(s) {
    return {
      id: s.id,
      nombre: s.nombre,
      direccion: s.direccion,
      ciudad: s.ciudad,
      telefono: s.telefono || '',
      email: s.email || '',
      responsableId: s.responsable_id || '',
      activo: s.activo === true || s.activo === 'TRUE' || s.activo === 1,
      fechaCreacion: s.fecha_creacion || '',
    }
  },
}
