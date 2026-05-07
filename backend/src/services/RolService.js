// =============================================================
// RolService.gs — CRUD de roles y asignación de permisos
// =============================================================

const RolService = {

  getAll(_payload, session) {
    AccessService.assert(session, 'roles.ver', 'Sin permiso para ver roles')
    if (!Sheets.getSpreadsheet().getSheetByName('Roles')) return []
    return Sheets.getAll('Roles').map(role => this._mapear(role))
  },

  getById(payload, session) {
    AccessService.assert(session, 'roles.ver', 'Sin permiso para ver roles')
    const role = Sheets.getBy('Roles', 'id', payload.id)
    if (!role) throw new Error('Rol no encontrado: ' + payload.id)
    return this._mapear(role)
  },

  create(payload, session) {
    AccessService.assert(session, 'roles.crear', 'Sin permiso para crear roles')
    if (!payload.codigo || !payload.codigo.trim()) throw new Error('Código de rol requerido')
    if (!payload.nombre || !payload.nombre.trim()) throw new Error('Nombre de rol requerido')
    this._validarCodigoUnico(payload.codigo)

    const nuevo = {
      id: Sheets.generateId(),
      codigo: payload.codigo.trim().toUpperCase(),
      nombre: payload.nombre.trim(),
      descripcion: payload.descripcion || '',
      activo: payload.activo !== undefined ? payload.activo : true,
      es_sistema: payload.esSistema !== undefined ? payload.esSistema : false,
      fecha_creacion: new Date().toISOString(),
    }
    Sheets.insert('Roles', nuevo)
    LogService.registrar(session.userId, 'CREATE', 'Roles', null, 'Rol creado: ' + nuevo.codigo)
    return this._mapear(nuevo)
  },

  update(payload, session) {
    AccessService.assert(session, 'roles.editar', 'Sin permiso para editar roles')
    const role = Sheets.getBy('Roles', 'id', payload.id)
    if (!role) throw new Error('Rol no encontrado: ' + payload.id)

    if (payload.codigo && payload.codigo.trim().toUpperCase() !== String(role.codigo || '').trim().toUpperCase()) {
      this._validarCodigoUnico(payload.codigo, payload.id)
    }

    const changes = {}
    if (payload.codigo !== undefined)       changes.codigo = payload.codigo.trim().toUpperCase()
    if (payload.nombre !== undefined)       changes.nombre = payload.nombre.trim()
    if (payload.descripcion !== undefined)  changes.descripcion = payload.descripcion
    if (payload.activo !== undefined)       changes.activo = payload.activo
    if (payload.esSistema !== undefined)    changes.es_sistema = payload.esSistema

    const updated = Sheets.update('Roles', payload.id, changes)
    LogService.registrar(session.userId, 'UPDATE', 'Roles', null, 'Rol actualizado: ' + updated.codigo)
    return this._mapear(updated)
  },

  remove(payload, session) {
    AccessService.assert(session, 'roles.desactivar', 'Sin permiso para desactivar roles')
    Sheets.update('Roles', payload.id, { activo: false })
    LogService.registrar(session.userId, 'DELETE', 'Roles', null, 'Rol desactivado: ' + payload.id)
    return true
  },

  getPermisos(payload, session) {
    AccessService.assert(session, 'roles.ver', 'Sin permiso para ver roles')
    const role = Sheets.getBy('Roles', 'id', payload.id)
    if (!role) throw new Error('Rol no encontrado: ' + payload.id)
    const permisosById = {}
    if (Sheets.getSpreadsheet().getSheetByName('Permisos')) {
      Sheets.getAll('Permisos').forEach(permiso => { permisosById[permiso.id] = permiso })
    }
    if (!Sheets.getSpreadsheet().getSheetByName('RolPermisos')) return []
    return Sheets.getAll('RolPermisos')
      .filter(item => String(item.rol_id) === String(payload.id))
      .map(item => {
        const permiso = permisosById[item.permiso_id] || {}
        return {
          id: item.id,
          permisoId: item.permiso_id,
          codigo: permiso.codigo || '',
          allow: !(item.allow === false || item.allow === 'FALSE' || item.allow === 0 || String(item.allow).trim() === '0'),
        }
      })
  },

  setPermisos(payload, session) {
    AccessService.assert(session, 'roles.asignar_permisos', 'Sin permiso para asignar permisos')
    if (!payload.id) throw new Error('Rol requerido')
    const permisos = payload.permisos || []
    if (!Sheets.getSpreadsheet().getSheetByName('RolPermisos')) return []

    const current = Sheets.getAll('RolPermisos').filter(item => String(item.rol_id) === String(payload.id))
    current.forEach(item => Sheets.delete('RolPermisos', item.id))

    permisos.forEach(codigo => {
      const permiso = Sheets.getAll('Permisos').find(p => String(p.codigo || '').trim() === String(codigo || '').trim())
      if (!permiso) return
      Sheets.insert('RolPermisos', {
        id: Sheets.generateId(),
        rol_id: payload.id,
        permiso_id: permiso.id,
        allow: true,
        fecha_creacion: new Date().toISOString(),
      })
    })

    LogService.registrar(session.userId, 'UPDATE', 'Roles', null, 'Permisos actualizados para rol: ' + payload.id)
    return this.getPermisos({ id: payload.id }, session)
  },

  _mapear(role) {
    return {
      id: role.id,
      codigo: role.codigo,
      nombre: role.nombre,
      descripcion: role.descripcion || '',
      activo: role.activo === true || role.activo === 'TRUE' || role.activo === 1 || role.activo === '',
      esSistema: role.es_sistema === true || role.es_sistema === 'TRUE' || role.es_sistema === 1,
      fechaCreacion: role.fecha_creacion || '',
    }
  },

  _validarCodigoUnico(codigo, excludeId) {
    const normalized = String(codigo || '').trim().toUpperCase()
    const existing = Sheets.getAll('Roles').find(role =>
      String(role.codigo || '').trim().toUpperCase() === normalized &&
      String(role.id) !== String(excludeId || '')
    )
    if (existing) throw new Error('Ya existe un rol con ese código')
  },
}
