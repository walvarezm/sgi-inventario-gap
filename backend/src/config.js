// =============================================================
// config.gs — Acceso a Script Properties y configuración global
// =============================================================

/**
 * Obtiene una propiedad del script.
 * Lanza error si no existe y es requerida.
 */
function getProperty(key, required) {
  const value = PropertiesService.getScriptProperties().getProperty(key)
  if (required && !value) {
    throw new Error('Script Property no configurada: ' + key)
  }
  return value
}

// ── Constantes de configuración ──────────────────────────────
const CONFIG = {
  get SPREADSHEET_ID() { return getProperty('SPREADSHEET_ID', true) },
  get JWT_SECRET()      { return getProperty('JWT_SECRET', true) },
  get ADMIN_EMAIL()     { return getProperty('ADMIN_EMAIL', false) },
  get DRIVE_IMAGENES()  { return getProperty('DRIVE_FOLDER_IMAGENES', false) },
  get DRIVE_FACTURAS()  { return getProperty('DRIVE_FOLDER_FACTURAS', false) },
  get ENV()             { return getProperty('ENV', false) || 'development' },
  get IS_PROD()         { return CONFIG.ENV === 'production' },
}

/**
 * Respuesta estándar de la API
 */
function respond(status, message, result) {
  const payload = {
    success: status >= 200 && status < 300,
    message: message,
    result: result !== undefined ? result : null,
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}
