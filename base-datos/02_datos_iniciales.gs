// =============================================================
// 02_datos_iniciales.gs
// Script de carga inicial de datos en Google Sheets.
// EJECUTAR UNA SOLA VEZ desde el editor de Apps Script.
// Menú: Ejecutar → seedDatosIniciales
// =============================================================

function seedDatosIniciales() {
  const ui = SpreadsheetApp.getUi()
  try {
    Logger.log('=== SGI: Iniciando seed de datos ===')
    seedConfig()
    Logger.log('✅ Config cargada')
    const sucursalId = seedSucursalInicial()
    Logger.log('✅ Sucursal inicial creada: ' + sucursalId)
    const adminId = seedAdminInicial(sucursalId)
    Logger.log('✅ Admin inicial creado: ' + adminId)
    Logger.log('=== SGI: Seed completado ===')
    ui.alert('✅ Datos iniciales cargados correctamente.\n\nRevisa el log de Apps Script para detalles.')
  } catch (e) {
    Logger.log('❌ Error en seed: ' + e.message)
    ui.alert('❌ Error al cargar datos iniciales:\n\n' + e.message)
  }
}

function seedConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('Config')
  if (!sheet) throw new Error('Hoja Config no encontrada')
  if (sheet.getLastRow() > 1) { Logger.log('Config ya tiene datos, se omite el seed'); return }
  const configs = [
    ['app_nombre',        'SGI - Inventarios', 'Nombre del sistema'],
    ['app_version',       '1.1.0',             'Versión actual'],
    ['iva_porcentaje',    '13',                'Porcentaje de IVA por defecto'],
    ['moneda',            'BOB',               'Moneda por defecto (ISO 4217)'],
    ['stock_alerta_email','',                  'Email para alertas de stock (opcional)'],
  ]
  configs.forEach(row => sheet.appendRow(row))
}

function seedSucursalInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('Sucursales')
  if (!sheet) throw new Error('Hoja Sucursales no encontrada')
  if (sheet.getLastRow() > 1) {
    Logger.log('Sucursales ya tiene datos, se omite el seed')
    return sheet.getRange(2, 1).getValue()
  }
  const id = Utilities.getUuid()
  sheet.appendRow([id, 'Casa Matriz', 'Av. Principal S/N', 'La Paz',
    '591-2-0000000', 'info@tudominio.com', '', true, new Date().toISOString()])
  return id
}

function seedAdminInicial(sucursalId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
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
  sheet.appendRow([id, 'Administrador SGI', 'admin@tudominio.com',
    hash, 'ADMINISTRADOR', 'ALL', true, new Date().toISOString()])
  Logger.log('Admin creado — Email: admin@tudominio.com — Pass inicial: Admin2026!')
  Logger.log('⚠️  IMPORTANTE: Cambiar la contraseña después del primer login')
  return id
}

function verificarEstructura() {
  const hojasRequeridas = [
    'Productos', 'Sucursales', 'Inventario', 'Movimientos',
    'Proveedores', 'Facturas', 'DetalleFactura', 'Usuarios', 'Config', 'LogAcciones',
  ]
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const faltantes = hojasRequeridas.filter(n => !ss.getSheetByName(n))
  if (faltantes.length > 0) {
    SpreadsheetApp.getUi().alert('❌ Faltan las siguientes hojas:\n\n' + faltantes.join('\n'))
  } else {
    SpreadsheetApp.getUi().alert('✅ Todas las hojas requeridas existen correctamente.')
  }
}

function _sha256(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str)
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('')
}
