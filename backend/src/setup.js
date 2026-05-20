// =============================================================
// 02_datos_iniciales.gs
// Script de carga inicial de datos en Google Sheets.
// EJECUTAR UNA SOLA VEZ desde el editor de Apps Script.
// Menú: Ejecutar → seedDatosIniciales
// =============================================================

function seedDatosIniciales() {
  try {
    Logger.log('=== SGI: Iniciando seed de datos ===')
    seedConfig()
    Logger.log('✅ Config cargada')
    const sucursalId = seedSucursalInicial()
    Logger.log('✅ Sucursal inicial creada: ' + sucursalId)
    const adminId = seedAdminInicial(sucursalId)
    Logger.log('✅ Admin inicial creado: ' + adminId)
    seedCategoriasInicial()
    seedMarcasInicial()
    Logger.log('✅ Categorias y Marcas creados')
    ensureMovimientoSchema()
    Logger.log('✅ Esquema de movimientos verificado')
    ensureDocumentoVentaSchema()
    Logger.log('✅ Esquema documental verificado')
    seedSeguridadBase()
    Logger.log('✅ Seguridad base verificada')
    seedRelacionesSeguridad()
    Logger.log('✅ Relaciones de seguridad verificadas')
    Logger.log('=== SGI: Seed completado ===')
  } catch (e) {
    Logger.log('❌ Error en seed: ' + e.message)
  }
}

function seedConfig() {
  const ss = Sheets.getSpreadsheet()
  const sheet = ss.getSheetByName('Config')
  if (!sheet) throw new Error('Hoja Config no encontrada')
  if (sheet.getLastRow() > 1) { Logger.log('Config ya tiene datos, se omite el seed'); return }
  const configs = [
    ['app_nombre',        'SGI - Maxel',       'Nombre del sistema'],
    ['app_version',       '1.1.0',             'Versión actual'],
    ['iva_porcentaje',    '13',                'Porcentaje de IVA por defecto'],
    ['moneda',            'BOB',               'Moneda por defecto (ISO 4217)'],
    ['stock_alerta_email','maxel.herramientas@gmail.com',                  'Email para alertas de stock (opcional)'],
  ]
  configs.forEach(row => sheet.appendRow(row))
}

function seedSucursalInicial() {
  const ss = Sheets.getSpreadsheet()
  const sheet = ss.getSheetByName('Sucursales')
  if (!sheet) throw new Error('Hoja Sucursales no encontrada')
  if (sheet.getLastRow() > 1) {
    Logger.log('Sucursales ya tiene datos, se omite el seed')
    return sheet.getRange(2, 1).getValue()
  }
  const id = Utilities.getUuid()
  sheet.appendRow([id, 'Casa Matriz', 'Calle Hnos Santa Cruz S/N', 'El Alto',
    '591-70697449', 'mxel.herramientas@gmail.com', '', true, new Date().toISOString()])
  return id
}

function seedAdminInicial(sucursalId) {
  const ss = Sheets.getSpreadsheet()
  const sheet = ss.getSheetByName('Usuarios')
  if (!sheet) throw new Error('Hoja Usuarios no encontrada')
  if (sheet.getLastRow() > 1) {
    Logger.log('Usuarios ya tiene datos, se omite el seed')
    return sheet.getRange(2, 1).getValue()
  }
  // Contraseña inicial: "Admin2026!" — CAMBIAR EN PRIMER LOGIN
  const secret = PropertiesService.getScriptProperties().getProperty('JWT_SECRET') || 'CHANGE_ME'
  const hash = _sha256('Admin2026!' + secret)
  const id = Utilities.getUuid()
  sheet.appendRow([id, 'Administrador SGI', 'admin@distmaxel.com',
    hash, 'ADMINISTRADOR', 'ALL', true, new Date().toISOString()])
  Logger.log('Admin creado — Email: admin@distmaxel.com — Pass inicial: Admin2026!')
  Logger.log('⚠️  IMPORTANTE: Cambiar la contraseña después del primer login')
  return id
}

function verificarEstructura() {
  const hojasRequeridas = [
    'Productos', 'Sucursales', 'Marcas', 'Inventario', 'Movimientos', 'MovimientoCabecera',
    'Proveedores', 'Facturas', 'DetalleFactura', 'PagosDocumento', 'Usuarios', 'Config', 'LogAcciones',
  ]
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
  const faltantes = hojasRequeridas.filter(n => !ss.getSheetByName(n))
  if (faltantes.length > 0) {
    Logger.log('❌ Faltan las siguientes hojas:\n\n' + faltantes.join('\n'))
  } else {
    Logger.log('✅ Todas las hojas requeridas existen correctamente.')
  }
}

function verificarEstructuraSeguridad() {
  const hojasSeguridad = ['Roles', 'Permisos', 'RolPermisos', 'UsuarioRoles', 'UsuarioPermisos']
  const ss = Sheets.getSpreadsheet()
  const faltantes = hojasSeguridad.filter(n => !ss.getSheetByName(n))
  if (faltantes.length > 0) {
    Logger.log('⚠️ Faltan hojas de seguridad:\n\n' + faltantes.join('\n'))
  } else {
    Logger.log('✅ Todas las hojas de seguridad existen correctamente.')
  }
}

function _sha256(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str)
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('')
}

function seedCategoriasInicial() {
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('Categorias')
  if (!sheet) throw new Error('Hoja Categorias no encontrada')
  if (sheet.getLastRow() > 1) { Logger.log('Categorias ya tiene datos, se omite el seed'); return }
  const id1 = Utilities.getUuid()
  const id2 = Utilities.getUuid()
  const id3 = Utilities.getUuid()
  const data = [
    [id1, 'Escalera', 'Escaleras', true, new Date().toISOString()],
    [id2, 'Taladro', 'Taladros', true, new Date().toISOString()],
    [id3, 'Amoladora', 'Amoladoras', true, new Date().toISOString()]
  ]
  data.forEach(row => sheet.appendRow(row))
}

function seedMarcasInicial() {
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('Marcas')
  if (!sheet) throw new Error('Hoja Marcas no encontrada')
  if (sheet.getLastRow() > 1) { Logger.log('Marcas ya tiene datos, se omite el seed'); return }
  const id1 = Utilities.getUuid()
  const id2 = Utilities.getUuid()
  const id3 = Utilities.getUuid()
  const data = [
    [id1, 'TRUPER',        'Marca TRUPER', true, new Date().toISOString()],
    [id2, 'INGCO',       'Marca INGCO', true, new Date().toISOString()],
    [id3, 'UYUSTOOLS',    'Marca UYUSTOOLS', true, new Date().toISOString()]
  ]
  data.forEach(row => sheet.appendRow(row))
}

function seedSeguridadBase() {
  const ss = Sheets.getSpreadsheet()
  if (!ss.getSheetByName('Roles') || !ss.getSheetByName('Permisos')) {
    Logger.log('⚠️ Hojas de seguridad no encontradas. Se omite seed de seguridad.')
    return
  }

  const now = new Date().toISOString()
  const rolesSheet = ss.getSheetByName('Roles')
  const roles = [
    ['ADMINISTRADOR', 'Administrador', 'Acceso total al sistema'],
    ['SUPERVISOR', 'Supervisor', 'Gestión operativa multi-sucursal'],
    ['VENDEDOR', 'Vendedor', 'POS y facturación de su sucursal'],
    ['CONSULTA_CATALOGO', 'Consulta catálogo', 'Consulta del catálogo por sucursal'],
    ['BODEGUERO', 'Bodeguero', 'Gestión operativa de inventario'],
    ['CONTADOR', 'Contador', 'Consulta de facturas y reportes'],
    ['COMPRAS', 'Compras', 'Proveedores y órdenes de compra'],
    ['AUDITOR', 'Auditor', 'Consulta y auditoría sin edición'],
  ]
  const existingRoles = Sheets.getAll('Roles')
  const roleCodes = {}
  existingRoles.forEach(role => { roleCodes[String(role.codigo || '').trim().toUpperCase()] = true })
  roles.forEach(role => {
    if (roleCodes[role[0]]) return
    rolesSheet.appendRow([Utilities.getUuid(), role[0], role[1], role[2], true, true, now])
  })

  const permisosSheet = ss.getSheetByName('Permisos')
  const existingPermisos = Sheets.getAll('Permisos')
  const permisoCodes = {}
  existingPermisos.forEach(permiso => { permisoCodes[String(permiso.codigo || '').trim()] = true })
  AccessService._legacyPermissionsAsList().forEach(permiso => {
    if (permisoCodes[permiso.codigo]) return
    permisosSheet.appendRow([
      Utilities.getUuid(),
      permiso.codigo,
      permiso.modulo,
      permiso.accion,
      permiso.descripcion,
      true,
      now,
    ])
  })
}

function seedRelacionesSeguridad() {
  const ss = Sheets.getSpreadsheet()
  const required = ['Roles', 'Permisos', 'RolPermisos', 'UsuarioRoles', 'UsuarioPermisos', 'Usuarios']
  const missing = required.filter(name => !ss.getSheetByName(name))
  if (missing.length > 0) {
    Logger.log('⚠️ Faltan hojas para seedRelacionesSeguridad: ' + missing.join(', '))
    return
  }

  seedRolPermisos()
  seedUsuarioRoles()
  seedUsuarioPermisos()
}

function seedRolPermisos() {
  const roles = Sheets.getAll('Roles')
  const permisos = Sheets.getAll('Permisos')
  const existentes = Sheets.getAll('RolPermisos')

  if (!roles.length || !permisos.length) {
    Logger.log('⚠️ No hay roles o permisos para seedRolPermisos')
    return
  }

  const rolesByCodigo = {}
  roles.forEach(role => {
    rolesByCodigo[String(role.codigo || '').trim().toUpperCase()] = role
  })

  const permisosByCodigo = {}
  permisos.forEach(permiso => {
    permisosByCodigo[String(permiso.codigo || '').trim()] = permiso
  })

  let created = 0
  Object.keys(AccessService.LEGACY_ROLE_PERMISSIONS).forEach(roleCode => {
    const role = rolesByCodigo[String(roleCode || '').trim().toUpperCase()]
    if (!role) {
      Logger.log('⚠️ Rol no encontrado para seedRolPermisos: ' + roleCode)
      return
    }

    let codigosPermiso = AccessService.LEGACY_ROLE_PERMISSIONS[roleCode] || []
    if (codigosPermiso.indexOf('*') !== -1) {
      codigosPermiso = permisos.map(permiso => String(permiso.codigo || '').trim()).filter(Boolean)
    }

    codigosPermiso.forEach(codigo => {
      const permiso = permisosByCodigo[codigo]
      if (!permiso) {
        Logger.log('⚠️ Permiso no encontrado para rol ' + roleCode + ': ' + codigo)
        return
      }

      const exists = existentes.some(item =>
        String(item.rol_id) === String(role.id) &&
        String(item.permiso_id) === String(permiso.id)
      )
      if (exists) return

      Sheets.insert('RolPermisos', {
        id: Sheets.generateId(),
        rol_id: role.id,
        permiso_id: permiso.id,
        allow: true,
        fecha_creacion: new Date().toISOString(),
      })
      existentes.push({ rol_id: role.id, permiso_id: permiso.id })
      created++
    })
  })

  Logger.log('✅ seedRolPermisos completado. Nuevas relaciones: ' + created)
}

function seedUsuarioRoles() {
  const roles = Sheets.getAll('Roles')
  const usuarios = Sheets.getAll('Usuarios')
  const existentes = Sheets.getAll('UsuarioRoles')

  if (!roles.length || !usuarios.length) {
    Logger.log('⚠️ No hay roles o usuarios para seedUsuarioRoles')
    return
  }

  const rolesByCodigo = {}
  roles.forEach(role => {
    rolesByCodigo[String(role.codigo || '').trim().toUpperCase()] = role
  })

  let created = 0
  usuarios.forEach(usuario => {
    const roleCode = String(usuario.rol || '').trim().toUpperCase()
    if (!roleCode) return

    const role = rolesByCodigo[roleCode]
    if (!role) {
      Logger.log('⚠️ Rol no encontrado para usuario ' + usuario.email + ': ' + roleCode)
      return
    }

    const scopeType = _resolveUserScopeType(usuario, roleCode)
    const scopeValue = _resolveUserScopeValue(usuario, scopeType)

    const exists = existentes.some(item =>
      String(item.usuario_id) === String(usuario.id) &&
      String(item.rol_id) === String(role.id) &&
      (item.activo === true || item.activo === 'TRUE' || item.activo === 1 || item.activo === '')
    )
    if (exists) return

    Sheets.insert('UsuarioRoles', {
      id: Sheets.generateId(),
      usuario_id: usuario.id,
      rol_id: role.id,
      scope_type: scopeType,
      scope_value: scopeValue,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    })
    existentes.push({
      usuario_id: usuario.id,
      rol_id: role.id,
      activo: true,
    })
    created++
  })

  Logger.log('✅ seedUsuarioRoles completado. Nuevas relaciones: ' + created)
}

function seedUsuarioPermisos() {
  const overrides = Sheets.getAll('UsuarioPermisos')
  if (overrides.length > 0) {
    Logger.log('ℹ️ UsuarioPermisos ya tiene overrides configurados, no se modifican.')
    return
  }
  Logger.log('✅ UsuarioPermisos verificado. Sin overrides iniciales por crear.')
}

function _resolveUserScopeType(usuario, roleCode) {
  const current = String(usuario.scope_type || '').trim().toUpperCase()
  if (current) return current
  return AccessService._defaultScopeForLegacyRole(roleCode, usuario)
}

function _resolveUserScopeValue(usuario, scopeType) {
  const defaultSucursal = String(usuario.sucursal_default || usuario.sucursal_id || '').trim()
  if (String(scopeType || '').trim().toUpperCase() === 'GLOBAL') return 'ALL'
  return defaultSucursal || 'ALL'
}

function ensureDocumentoVentaSchema() {
  const ss = Sheets.getSpreadsheet()
  _ensureSheetHeaders(ss, 'Facturas', [
    'id', 'numero', 'tipo', 'cliente', 'sucursal_id', 'fecha', 'subtotal', 'impuesto', 'total',
    'estado', 'usuario_id', 'notas', 'cliente_nit_ci', 'cliente_telefono', 'cliente_email',
    'vigencia_hasta', 'moneda', 'descuento_global_monto', 'descuento_global_porcentaje',
    'descuento_total', 'saldo_pendiente', 'observaciones', 'documento_origen_id',
    'requiere_pago', 'afecta_stock', 'es_fiscal',
  ])
  _ensureSheetHeaders(ss, 'DetalleFactura', [
    'id', 'factura_id', 'producto_id', 'cantidad', 'precio_unitario', 'subtotal',
    'precio_lista', 'descuento_tipo', 'descuento_valor', 'descuento_monto', 'notas',
  ])
  _ensureSheetHeaders(ss, 'PagosDocumento', [
    'id', 'documento_id', 'metodo_pago', 'monto', 'referencia', 'moneda', 'detalle', 'fecha', 'usuario_id',
  ])
}

function ensureMovimientoSchema() {
  const ss = Sheets.getSpreadsheet()
  _ensureSheetHeaders(ss, 'MovimientoCabecera', [
    'id', 'tipo', 'modo', 'sucursal_origen', 'sucursal_destino', 'fecha_registro',
    'referencia_tipo', 'referencia_texto', 'notas', 'usuario_id', 'estado',
    'fecha_creacion', 'fecha_actualizacion',
  ])
  _ensureSheetHeaders(ss, 'Movimientos', [
    'id', 'cabecera_id', 'tipo', 'producto_id', 'sucursal_origen', 'sucursal_destino', 'cantidad',
    'referencia', 'referencia_tipo', 'referencia_texto', 'usuario_id', 'fecha', 'fecha_registro',
    'precio_ofrecido', 'precio_final', 'detalle_accion', 'editable', 'movimiento_origen_id', 'notas',
  ])
}

function _ensureSheetHeaders(ss, nombre, headers) {
  let sheet = ss.getSheetByName(nombre)
  if (!sheet) {
    sheet = ss.insertSheet(nombre)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    return
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
    .map(header => String(header || '').trim())
    .filter(Boolean)

  const missing = headers.filter(header => currentHeaders.indexOf(header) === -1)
  missing.forEach(header => {
    sheet.insertColumnAfter(sheet.getLastColumn())
    sheet.getRange(1, sheet.getLastColumn()).setValue(header)
  })
}
