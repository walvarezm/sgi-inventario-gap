// =============================================================
// sheets.gs — Capa de acceso a Google Sheets
// =============================================================

const Sheets = {
  _ss: null,

  /** Obtiene el Spreadsheet (con cache en instancia) */
  getSpreadsheet() {
    if (!this._ss) {
      this._ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    }
    return this._ss
  },

  /** Obtiene una hoja por nombre */
  getSheet(nombre) {
    const sheet = this.getSpreadsheet().getSheetByName(nombre)
    if (!sheet) throw new Error('Hoja no encontrada: ' + nombre)
    return sheet
  },

  /**
   * Lee todos los registros de una hoja como array de objetos.
   * La fila 1 contiene los encabezados.
   */
  getAll(nombre) {
    const sheet = this.getSheet(nombre)
    const data = sheet.getDataRange().getValues()
    if (data.length < 2) return []

    const headers = data[0].map(h => String(h).trim())
    return data.slice(1).map((row, i) => {
      const obj = { _row: i + 2 } // fila real en Sheets (1-indexed + header)
      headers.forEach((h, j) => {
        obj[h] = row[j]
      })
      return obj
    })
  },

  /** Obtiene un registro por campo */
  getBy(nombre, campo, valor) {
    return this.getAll(nombre).find(r => String(r[campo]) === String(valor)) || null
  },

  /**
   * Inserta una nueva fila al final de la hoja.
   * @param {string} nombre - Nombre de la hoja
   * @param {Object} datos - Objeto con los datos (claves = encabezados)
   */
  insert(nombre, datos) {
    const sheet = this.getSheet(nombre)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    const fila = headers.map(h => {
      const val = datos[h]
      return val !== undefined ? val : ''
    })
    sheet.appendRow(fila)
    return datos
  },

  /**
   * Actualiza una fila existente buscando por campo 'id'.
   * @param {string} nombre - Nombre de la hoja
   * @param {string} id - Valor del campo id
   * @param {Object} cambios - Campos a actualizar
   */
  update(nombre, id, cambios) {
    const sheet = this.getSheet(nombre)
    const data = sheet.getDataRange().getValues()
    const headers = data[0].map(h => String(h).trim())
    const idIdx = headers.indexOf('id')
    if (idIdx === -1) throw new Error('La hoja ' + nombre + ' no tiene columna id')

    const rowIdx = data.findIndex((r, i) => i > 0 && String(r[idIdx]) === String(id))
    if (rowIdx === -1) throw new Error('Registro no encontrado: ' + id)

    headers.forEach((h, j) => {
      if (cambios[h] !== undefined) {
        sheet.getRange(rowIdx + 1, j + 1).setValue(cambios[h])
      }
    })

    return this.getBy(nombre, 'id', id)
  },

  /**
   * Elimina físicamente una fila por id.
   * Para producción se recomienda soft-delete (activo=false).
   */
  delete(nombre, id) {
    const sheet = this.getSheet(nombre)
    const data = sheet.getDataRange().getValues()
    const headers = data[0].map(h => String(h).trim())
    const idIdx = headers.indexOf('id')
    const rowIdx = data.findIndex((r, i) => i > 0 && String(r[idIdx]) === String(id))
    if (rowIdx === -1) throw new Error('Registro no encontrado: ' + id)
    sheet.deleteRow(rowIdx + 1)
    return true
  },

  /** Genera un UUID v4 simple */
  generateId() {
    return Utilities.getUuid()
  },
}
