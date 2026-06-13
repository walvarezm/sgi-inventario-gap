// =============================================================
// AccessService.gs — Resolución de roles, permisos y alcances
// Compatibilidad: mantiene soporte para el campo legacy Usuarios.rol
// =============================================================

const AccessService = {
  GLOBAL_SCOPE_VALUES: ['ALL', '*'],
  SCOPE_VALUES: [
    'GLOBAL',
    'SUCURSAL_PROPIA',
    'SUCURSAL_ESPECIFICA',
    'TODAS_SUCURSALES',
    'SOLO_LECTURA',
    'MULTI_SUCURSAL'
  ],
  SECURITY_SHEETS: ['Roles', 'Permisos', 'RolPermisos', 'UsuarioRoles', 'UsuarioPermisos'],

  LEGACY_ROLE_PERMISSIONS: {
    ADMINISTRADOR: ['*'],
    SUPERVISOR: [
      'dashboard.ver',
      'sucursales.ver', 'sucursales.editar',
      'productos.ver', 'productos.crear', 'productos.editar', 'productos.desactivar', 'productos.importar', 'productos.subir_imagen',
      'categorias.ver', 'categorias.crear', 'categorias.editar',
      'marcas.ver', 'marcas.crear', 'marcas.editar',
      'inventario.ver', 'inventario.entrada', 'inventario.salida', 'inventario.transferencia', 'inventario.alertas.ver',
      'inventario.editar_movimientos', 'inventario.crear_masivo', 'inventario.editar_fecha_movimiento',
      'inventario.editar_precios_movimiento', 'inventario.usar_plantillas_referencia',
      'inventario.editar_precios',
      'catalogo.ver', 'catalogo.ver_boton_exportar',
      'proveedores.ver', 'proveedores.crear', 'proveedores.editar', 'proveedores.desactivar',
      'ordenes_compra.ver', 'ordenes_compra.crear', 'ordenes_compra.recibir', 'ordenes_compra.cancelar',
      'pos.ver', 'pos.vender', 'pos.escanear_qr',
      'pos.vender_factura', 'pos.vender_sin_factura', 'pos.crear_proforma', 'pos.crear_cotizacion',
      'pos.editar_precio', 'pos.aplicar_descuento', 'pos.usar_pago_mixto', 'pos.convertir_documentos',
      'facturas.ver', 'facturas.emitir', 'facturas.anular', 'facturas.imprimir',
      'documentos.ver', 'documentos.anular',
      'reportes.ver', 'reportes.exportar',
    ],
    VENDEDOR: [
      'dashboard.ver',
      'catalogo.ver',
      'pos.ver', 'pos.vender', 'pos.escanear_qr',
      'pos.vender_factura', 'pos.vender_sin_factura', 'pos.crear_proforma', 'pos.crear_cotizacion',
      'facturas.ver', 'facturas.emitir', 'facturas.imprimir',
      'documentos.ver',
    ],
    CONSULTA_CATALOGO: ['catalogo.ver'],
    BODEGUERO: [
      'dashboard.ver',
      'productos.ver',
      'inventario.ver', 'inventario.entrada', 'inventario.salida', 'inventario.alertas.ver',
      'inventario.editar_movimientos', 'inventario.crear_masivo', 'inventario.editar_fecha_movimiento',
      'inventario.editar_precios_movimiento', 'inventario.usar_plantillas_referencia',
      'catalogo.ver',
      'proveedores.ver',
      'ordenes_compra.ver', 'ordenes_compra.recibir',
    ],
    CONTADOR: [
      'dashboard.ver',
      'catalogo.ver',
      'facturas.ver', 'facturas.imprimir',
      'documentos.ver',
      'reportes.ver', 'reportes.exportar',
    ],
    COMPRAS: [
      'dashboard.ver',
      'productos.ver',
      'catalogo.ver',
      'proveedores.ver', 'proveedores.crear', 'proveedores.editar', 'proveedores.desactivar',
      'ordenes_compra.ver', 'ordenes_compra.crear', 'ordenes_compra.recibir', 'ordenes_compra.cancelar',
    ],
    AUDITOR: [
      'dashboard.ver',
      'catalogo.ver',
      'inventario.ver',
      'facturas.ver',
      'documentos.ver',
      'reportes.ver',
      'auditoria.ver',
    ],
  },

  getAccessContextByUserId(userId) {
    const user = Sheets.getBy('Usuarios', 'id', userId)
    if (!user) throw new Error('Usuario no encontrado: ' + userId)
    return this.getAccessContextFromUser(user)
  },

  getAccessContextFromUser(user) {
    const roleAssignments = this._getRoleAssignments(user)
    const roleCodes = this._collectRoleCodes(user, roleAssignments)
    const rolePermissionScopes = this._buildRolePermissionScopes(roleAssignments, user)
    const userOverrides = this._getUserPermissionOverrides(user.id)
    const permissionScopes = this._mergePermissionScopes(rolePermissionScopes, userOverrides, user)
    const permissions = this._permissionCodesFromScopes(permissionScopes)
    const accessibleSucursales = this._collectAccessibleSucursales(permissionScopes, roleAssignments, user)
    const isGlobal = this._hasGlobalScope(roleAssignments, permissionScopes, user)
    const primaryRole = this._primaryRole(user, roleCodes)

    return {
      primaryRole: primaryRole,
      roles: roleCodes,
      permissions: permissions,
      permissionScopes: permissionScopes,
      accessibleSucursales: accessibleSucursales,
      isGlobal: isGlobal,
      scopeType: isGlobal ? 'GLOBAL' : (accessibleSucursales.length > 1 ? 'MULTI_SUCURSAL' : 'SUCURSAL_PROPIA'),
      scopeValues: isGlobal ? ['ALL'] : accessibleSucursales,
    }
  },

  buildSessionUser(user) {
    const access = this.getAccessContextFromUser(user)
    return {
      userId: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: access.primaryRole,
      roles: access.roles,
      permissions: access.permissions,
      permissionScopes: access.permissionScopes,
      sucursalId: user.sucursal_default || user.sucursal_id || 'ALL',
      accessibleSucursales: access.accessibleSucursales,
      isGlobal: access.isGlobal,
      scopeType: access.scopeType,
      scopeValues: access.scopeValues,
    }
  },

  can(session, permission) {
    if (!session) return false
    const permissions = session.permissions || []
    if (permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1) return true
    return false
  },

  canInSucursal(session, permission, sucursalId) {
    if (!this.can(session, permission)) return false
    if (!sucursalId) return true
    if (session.isGlobal === true) return true

    const permissionScopes = (session.permissionScopes || {})[permission] || []
    const wildcardScopes = (session.permissionScopes || {})['*'] || []
    const scopes = permissionScopes.concat(wildcardScopes)
    if (!scopes.length) {
      const sucursales = session.accessibleSucursales || []
      return sucursales.indexOf(sucursalId) !== -1
    }

    return scopes.some(scope => this._scopeAllowsSucursal(scope.scopeType, scope.scopeValue, sucursalId, session))
  },

  assert(session, permission, message) {
    if (!this.can(session, permission)) {
      throw new Error(message || ('Sin permiso: ' + permission))
    }
  },

  assertInSucursal(session, permission, sucursalId, message) {
    if (!this.canInSucursal(session, permission, sucursalId)) {
      throw new Error(message || ('Acceso no autorizado para ' + permission + ' en sucursal ' + sucursalId))
    }
  },

  getAllPermissions() {
    if (!this._sheetExists('Permisos')) {
      return this._legacyPermissionsAsList()
    }

    const permisos = Sheets.getAll('Permisos')
    const activos = permisos.filter(p => p.activo === true || p.activo === 'TRUE' || p.activo === 1 || p.activo === '')
    return activos.map(p => ({
      id: p.id,
      codigo: p.codigo,
      modulo: p.modulo || '',
      accion: p.accion || '',
      descripcion: p.descripcion || '',
      activo: p.activo === true || p.activo === 'TRUE' || p.activo === 1 || p.activo === '',
      fechaCreacion: p.fecha_creacion || '',
    }))
  },

  getSecuritySheetDefinitions() {
    return [
      { nombre: 'Roles', headers: ['id', 'codigo', 'nombre', 'descripcion', 'activo', 'es_sistema', 'fecha_creacion'] },
      { nombre: 'Permisos', headers: ['id', 'codigo', 'modulo', 'accion', 'descripcion', 'activo', 'fecha_creacion'] },
      { nombre: 'RolPermisos', headers: ['id', 'rol_id', 'permiso_id', 'allow', 'fecha_creacion'] },
      { nombre: 'UsuarioRoles', headers: ['id', 'usuario_id', 'rol_id', 'scope_type', 'scope_value', 'activo', 'fecha_creacion'] },
      { nombre: 'UsuarioPermisos', headers: ['id', 'usuario_id', 'permiso_id', 'allow', 'scope_type', 'scope_value', 'fecha_creacion'] },
    ]
  },

  _getRoleAssignments(user) {
    const assignments = []

    if (this._sheetExists('UsuarioRoles')) {
      const userRoles = Sheets.getAll('UsuarioRoles')
        .filter(r =>
          String(r.usuario_id) === String(user.id) &&
          (r.activo === true || r.activo === 'TRUE' || r.activo === 1 || r.activo === '')
        )

      const rolesById = this._rolesById()
      userRoles.forEach(item => {
        const role = rolesById[item.rol_id]
        if (!role) return
        assignments.push({
          roleId: role.id,
          roleCode: role.codigo,
          scopeType: item.scope_type || this._defaultScopeForLegacyRole(role.codigo, user),
          scopeValue: item.scope_value || this._defaultScopeValueForUser(user),
          source: 'sheet',
        })
      })
    }

    if (!assignments.length && user.rol) {
      assignments.push({
        roleId: 'legacy-' + user.rol,
        roleCode: String(user.rol).trim().toUpperCase(),
        scopeType: this._defaultScopeForLegacyRole(user.rol, user),
        scopeValue: this._defaultScopeValueForUser(user),
        source: 'legacy',
      })
    }

    return assignments
  },

  _rolesById() {
    const map = {}
    if (!this._sheetExists('Roles')) return map
    Sheets.getAll('Roles').forEach(role => {
      const activo = role.activo === true || role.activo === 'TRUE' || role.activo === 1 || role.activo === ''
      if (!activo) return
      map[role.id] = {
        id: role.id,
        codigo: String(role.codigo || '').trim().toUpperCase(),
        nombre: role.nombre || '',
        descripcion: role.descripcion || '',
      }
    })
    return map
  },

  _buildRolePermissionScopes(assignments, user) {
    const permissionScopes = {}
    const permisosById = this._permissionsById()
    const rolePermisos = this._sheetExists('RolPermisos') ? Sheets.getAll('RolPermisos') : []

    assignments.forEach(assignment => {
      const legacyPermissions = this.LEGACY_ROLE_PERMISSIONS[assignment.roleCode] || []
      if (legacyPermissions.length) {
        legacyPermissions.forEach(code => this._grantPermissionScope(permissionScopes, code, assignment.scopeType, assignment.scopeValue, true))
      }

      rolePermisos
        .filter(item => String(item.rol_id) === String(assignment.roleId))
        .forEach(item => {
          const codigo = (permisosById[item.permiso_id] || {}).codigo
          if (!codigo) return
          const allow = !(item.allow === false || item.allow === 'FALSE' || item.allow === 0 || String(item.allow).trim() === '0')
          this._grantPermissionScope(permissionScopes, codigo, assignment.scopeType, assignment.scopeValue, allow)
        })
    })

    if (!assignments.length && user.rol) {
      const legacyPerms = this.LEGACY_ROLE_PERMISSIONS[String(user.rol).trim().toUpperCase()] || []
      legacyPerms.forEach(code => this._grantPermissionScope(
        permissionScopes,
        code,
        this._defaultScopeForLegacyRole(user.rol, user),
        this._defaultScopeValueForUser(user),
        true
      ))
    }

    return permissionScopes
  },

  _getUserPermissionOverrides(userId) {
    if (!this._sheetExists('UsuarioPermisos')) return []
    return Sheets.getAll('UsuarioPermisos')
      .filter(item => String(item.usuario_id) === String(userId))
      .map(item => ({
        permisoId: item.permiso_id,
        allow: !(item.allow === false || item.allow === 'FALSE' || item.allow === 0 || String(item.allow).trim() === '0'),
        scopeType: item.scope_type || 'GLOBAL',
        scopeValue: item.scope_value || 'ALL',
      }))
  },

  _mergePermissionScopes(rolePermissionScopes, userOverrides) {
    const merged = JSON.parse(JSON.stringify(rolePermissionScopes || {}))
    if (!userOverrides || !userOverrides.length) return merged

    const permisosById = this._permissionsById()
    userOverrides.forEach(override => {
      const codigo = (permisosById[override.permisoId] || {}).codigo
      if (!codigo) return
      this._grantPermissionScope(merged, codigo, override.scopeType, override.scopeValue, override.allow)
    })
    return merged
  },

  _permissionsById() {
    const map = {}
    if (!this._sheetExists('Permisos')) return map
    Sheets.getAll('Permisos').forEach(permiso => {
      map[permiso.id] = {
        id: permiso.id,
        codigo: String(permiso.codigo || '').trim(),
      }
    })
    return map
  },

  _collectRoleCodes(user, roleAssignments) {
    const codes = {}
    roleAssignments.forEach(item => { codes[item.roleCode] = true })
    if (user.rol) codes[String(user.rol).trim().toUpperCase()] = true
    return Object.keys(codes)
  },

  _collectAccessibleSucursales(permissionScopes, roleAssignments, user) {
    if (this._hasGlobalScope(roleAssignments, permissionScopes, user)) return ['ALL']

    const bucket = {}
    Object.keys(permissionScopes || {}).forEach(code => {
      (permissionScopes[code] || []).forEach(scope => {
        this._scopeValueList(scope.scopeType, scope.scopeValue, user).forEach(id => {
          if (id && id !== 'ALL') bucket[id] = true
        })
      })
    })

    const defaultSucursal = user.sucursal_default || user.sucursal_id
    if (defaultSucursal && defaultSucursal !== 'ALL') bucket[defaultSucursal] = true
    return Object.keys(bucket)
  },

  _hasGlobalScope(roleAssignments, permissionScopes, user) {
    if (String(user.sucursal_default || user.sucursal_id || '').trim().toUpperCase() === 'ALL') return true
    const roleHasGlobal = roleAssignments.some(item =>
      this._isGlobalScope(item.scopeType, item.scopeValue)
    )
    if (roleHasGlobal) return true

    return Object.keys(permissionScopes || {}).some(code =>
      (permissionScopes[code] || []).some(scope => this._isGlobalScope(scope.scopeType, scope.scopeValue))
    )
  },

  _permissionCodesFromScopes(permissionScopes) {
    return Object.keys(permissionScopes || {}).filter(code =>
      (permissionScopes[code] || []).some(scope => scope.allow !== false)
    )
  },

  _grantPermissionScope(target, permissionCode, scopeType, scopeValue, allow) {
    if (!target[permissionCode]) target[permissionCode] = []

    if (allow === false) {
      target[permissionCode] = []
      return
    }

    const normalized = {
      scopeType: scopeType || 'GLOBAL',
      scopeValue: scopeValue || 'ALL',
      allow: true,
    }

    const exists = target[permissionCode].some(item =>
      item.scopeType === normalized.scopeType &&
      String(item.scopeValue || '') === String(normalized.scopeValue || '')
    )
    if (!exists) target[permissionCode].push(normalized)
  },

  _scopeAllowsSucursal(scopeType, scopeValue, sucursalId, session) {
    if (this._isGlobalScope(scopeType, scopeValue)) return true
    const values = this._scopeValueList(scopeType, scopeValue, session || {})
    return values.indexOf(sucursalId) !== -1
  },

  _scopeValueList(scopeType, scopeValue, userLike) {
    if (this._isGlobalScope(scopeType, scopeValue)) return ['ALL']
    if (scopeType === 'SUCURSAL_PROPIA') {
      const own = userLike.sucursalId || userLike.sucursal_default || userLike.sucursal_id
      return own && own !== 'ALL' ? [own] : []
    }
    return String(scopeValue || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  },

  _isGlobalScope(scopeType, scopeValue) {
    const type = String(scopeType || '').trim().toUpperCase()
    const value = String(scopeValue || '').trim().toUpperCase()
    return type === 'GLOBAL' || this.GLOBAL_SCOPE_VALUES.indexOf(value) !== -1
  },

  _defaultScopeForLegacyRole(roleCode) {
    const code = String(roleCode || '').trim().toUpperCase()
    return (code === 'ADMINISTRADOR' || code === 'SUPERVISOR' || code === 'AUDITOR') ? 'GLOBAL' : 'SUCURSAL_PROPIA'
  },

  _defaultScopeValueForUser(user) {
    return user.sucursal_default || user.sucursal_id || 'ALL'
  },

  _primaryRole(user, roleCodes) {
    if (user.rol) return String(user.rol).trim().toUpperCase()
    return roleCodes.length ? roleCodes[0] : 'CONSULTA_CATALOGO'
  },

  _legacyPermissionsAsList() {
    const seen = {}
    Object.keys(this.LEGACY_ROLE_PERMISSIONS).forEach(roleCode => {
      ;(this.LEGACY_ROLE_PERMISSIONS[roleCode] || []).forEach(code => {
        if (code === '*') return
        seen[code] = {
          id: 'legacy-' + code,
          codigo: code,
          modulo: code.split('.')[0] || '',
          accion: code.split('.')[1] || '',
          descripcion: 'Permiso legacy ' + code,
          activo: true,
          fechaCreacion: '',
        }
      })
    })
    return Object.keys(seen).map(key => seen[key]).sort((a, b) => a.codigo.localeCompare(b.codigo))
  },

  _sheetExists(nombre) {
    try {
      return !!Sheets.getSpreadsheet().getSheetByName(nombre)
    } catch (_e) {
      return false
    }
  },
}
