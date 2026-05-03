// =============================================================
// 02_datos_iniciales.gs
// Script de carga inicial de datos en Google Sheets.
// EJECUTAR UNA SOLA VEZ desde el editor de Apps Script.
// Menú: Ejecutar → seedDatosIniciales
// =============================================================

function seedDatosIniciales() {
  //const ui = SpreadsheetApp.getUi()
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
    Logger.log('=== SGI: Seed completado ===')
    //ui.alert('✅ Datos iniciales cargados correctamente.\n\nRevisa el log de Apps Script para detalles.')
  } catch (e) {
    Logger.log('❌ Error en seed: ' + e.message)
    //ui.alert('❌ Error al cargar datos iniciales:\n\n' + e.message)
  }
}

function seedConfig() {
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
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
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
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
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
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
    'Productos', 'Sucursales', 'Marcas', 'Inventario', 'Movimientos',
    'Proveedores', 'Facturas', 'DetalleFactura', 'Usuarios', 'Config', 'LogAcciones',
  ]
  const ss = Sheets.getSpreadsheet() //SpreadsheetApp.getActiveSpreadsheet()
  const faltantes = hojasRequeridas.filter(n => !ss.getSheetByName(n))
  if (faltantes.length > 0) {
    Logger.log('❌ Faltan las siguientes hojas:\n\n' + faltantes.join('\n'))
  } else {
    Logger.log('✅ Todas las hojas requeridas existen correctamente.')
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
