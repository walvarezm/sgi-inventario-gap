// =============================================================
// UsuarioService.gs — CRUD de usuarios y asignación de roles
// =============================================================

const UsuarioService = {

  getAll(_payload, session) {
    AccessService.assert(session, 'usuarios.ver', 'Sin permiso para ver usuarios')
    return Sheets.getAll('Usuarios').map(user => this._mapearUsuario(user))
  },

  getById(payload, session) {
    AccessService.assert(session, 'usuarios.ver', 'Sin permiso para ver usuarios')
    const user = Sheets.getBy('Usuarios', 'id', payload.id)
    if (!user) throw new Error('Usuario no encontrado: ' + payload.id)
    return this._mapearUsuario(user)
  },

  create(payload, session) {
    AccessService.assert(session, 'usuarios.crear', 'Sin permiso para crear usuarios')
    this._validar(payload, false)
    this._validarEmailUnico(payload.email)

    const id = Sheets.generateId()
    const primaryRole = this._primaryRole(payload.roles, payload.rol)
    const scopeType = payload.scopeType || this._scopeTypeFromRole(primaryRole)
    const sucursalDefault = payload.sucursalDefault || payload.sucursalId || this._defaultSucursalForScope(scopeType)

    const nuevo = {
      id: id,
      nombre: payload.nombre.trim(),
      email: payload.email.trim().toLowerCase(),
      password_hash: payload.password ? this._sha256(payload.password + CONFIG.JWT_SECRET) : '',
      rol: primaryRole,
      sucursal_id: sucursalDefault,
      sucursal_default: sucursalDefault,
      scope_type: scopeType,
      activo: payload.activo !== undefined ? payload.activo : true,
      fecha_creacion: new Date().toISOString(),
    }

    Sheets.insert('Usuarios', nuevo)
    this._syncRoles(id, payload.roles || [primaryRole], scopeType, payload.scopeValues || [sucursalDefault])
    LogService.registrar(session.userId, 'CREATE', 'Usuarios', sucursalDefault || null,
      'Usuario creado: ' + nuevo.email)
    return this._mapearUsuario(nuevo)
  },

  update(payload, session) {
    AccessService.assert(session, 'usuarios.editar', 'Sin permiso para editar usuarios')
    if (!payload.id) throw new Error('ID de usuario requerido')

    const existente = Sheets.getBy('Usuarios', 'id', payload.id)
    if (!existente) throw new Error('Usuario no encontrado: ' + payload.id)

    if (payload.email && payload.email.trim().toLowerCase() !== String(existente.email || '').trim().toLowerCase()) {
      this._validarEmailUnico(payload.email, payload.id)
    }

    const changes = {}
    if (payload.nombre !== undefined)            changes.nombre = payload.nombre.trim()
    if (payload.email !== undefined)             changes.email = payload.email.trim().toLowerCase()
    if (payload.password !== undefined && payload.password !== '') {
      changes.password_hash = this._sha256(payload.password + CONFIG.JWT_SECRET)
    }
    if (payload.activo !== undefined)            changes.activo = payload.activo
    if (payload.sucursalDefault !== undefined)   changes.sucursal_default = payload.sucursalDefault
    if (payload.sucursalId !== undefined)        changes.sucursal_id = payload.sucursalId
    if (payload.scopeType !== undefined)         changes.scope_type = payload.scopeType

    if (payload.roles && payload.roles.length) {
      changes.rol = this._primaryRole(payload.roles, payload.rol)
    } else if (payload.rol !== undefined) {
      changes.rol = payload.rol
    }

    const updated = Sheets.update('Usuarios', payload.id, changes)

    if (payload.roles && payload.roles.length) {
      const scopeType = payload.scopeType || updated.scope_type || existente.scope_type || this._scopeTypeFromRole(changes.rol || existente.rol)
      const defaultValue = payload.sucursalDefault || payload.sucursalId || updated.sucursal_default || updated.sucursal_id || existente.sucursal_default || existente.sucursal_id
      this._syncRoles(payload.id, payload.roles, scopeType, payload.scopeValues || [defaultValue])
    }

    LogService.registrar(session.userId, 'UPDATE', 'Usuarios', updated.sucursal_default || updated.sucursal_id || null,
      'Usuario actualizado: ' + updated.email)
    return this._mapearUsuario(updated)
  },

  remove(payload, session) {
    AccessService.assert(session, 'usuarios.desactivar', 'Sin permiso para desactivar usuarios')
    if (!payload.id) throw new Error('ID de usuario requerido')
    Sheets.update('Usuarios', payload.id, { activo: false })
    this._deactivateRoleAssignments(payload.id)
    LogService.registrar(session.userId, 'DELETE', 'Usuarios', null, 'Usuario desactivado: ' + payload.id)
    return true
  },

  _mapearUsuario(user) {
    const sessionUser = AccessService.buildSessionUser(user)
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: sessionUser.rol,
      roles: sessionUser.roles,
      permissions: sessionUser.permissions,
      sucursalId: user.sucursal_default || user.sucursal_id || 'ALL',
      sucursalDefault: user.sucursal_default || user.sucursal_id || 'ALL',
      scopeType: user.scope_type || sessionUser.scopeType,
      accessibleSucursales: sessionUser.accessibleSucursales,
      activo: user.activo === true || user.activo === 'TRUE' || user.activo === 1,
      fechaCreacion: user.fecha_creacion || '',
    }
  },

  _syncRoles(userId, roles, scopeType, scopeValues) {
    if (!Sheets.getSpreadsheet().getSheetByName('UsuarioRoles')) return

    const roleCodes = (roles || []).map(role => String(role || '').trim().toUpperCase()).filter(Boolean)
    this._deactivateRoleAssignments(userId)

    const rolesSheet = Sheets.getAll('Roles')
    const rolesByCode = {}
    rolesSheet.forEach(role => {
      rolesByCode[String(role.codigo || '').trim().toUpperCase()] = role
    })

    const values = (scopeValues && scopeValues.length ? scopeValues : ['ALL']).filter(Boolean)
    roleCodes.forEach(roleCode => {
      const role = rolesByCode[roleCode]
      if (!role) return
      Sheets.insert('UsuarioRoles', {
        id: Sheets.generateId(),
        usuario_id: userId,
        rol_id: role.id,
        scope_type: scopeType || this._scopeTypeFromRole(roleCode),
        scope_value: values.join(','),
        activo: true,
        fecha_creacion: new Date().toISOString(),
      })
    })
  },

  _deactivateRoleAssignments(userId) {
    if (!Sheets.getSpreadsheet().getSheetByName('UsuarioRoles')) return
    const rows = Sheets.getAll('UsuarioRoles').filter(r =>
      String(r.usuario_id) === String(userId) &&
      (r.activo === true || r.activo === 'TRUE' || r.activo === 1 || r.activo === '')
    )
    rows.forEach(row => Sheets.update('UsuarioRoles', row.id, { activo: false }))
  },

  _primaryRole(roles, rol) {
    if (roles && roles.length) return String(roles[0]).trim().toUpperCase()
    return String(rol || 'CONSULTA_CATALOGO').trim().toUpperCase()
  },

  _scopeTypeFromRole(roleCode) {
    const code = String(roleCode || '').trim().toUpperCase()
    return (code === 'ADMINISTRADOR' || code === 'SUPERVISOR' || code === 'AUDITOR') ? 'GLOBAL' : 'SUCURSAL_PROPIA'
  },

  _defaultSucursalForScope(scopeType) {
    return String(scopeType || '').toUpperCase() === 'GLOBAL' ? 'ALL' : ''
  },

  _validar(payload, isUpdate) {
    if (!payload.nombre || !payload.nombre.trim()) throw new Error('Nombre es requerido')
    if (!payload.email || !payload.email.trim()) throw new Error('Email es requerido')
    if (!isUpdate && (!payload.password || !String(payload.password).trim())) {
      throw new Error('Password es requerido')
    }
  },

  _validarEmailUnico(email, excludeId) {
    const normalized = String(email || '').trim().toLowerCase()
    const existing = Sheets.getAll('Usuarios').find(u =>
      String(u.email || '').trim().toLowerCase() === normalized &&
      String(u.id) !== String(excludeId || '')
    )
    if (existing) throw new Error('Ya existe un usuario con ese email')
  },

  _sha256(str) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str)
    return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('')
  },
}
