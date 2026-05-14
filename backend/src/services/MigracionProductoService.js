// =============================================================
// MigracionProductoService.gs — Migración de productos desde otra Google Sheet
// =============================================================

const MigracionProductoService = {

  previewDesdeSpreadsheet(payload, session) {
    ProductoService._validarPermisoImportacion(session)
    const migracion = this._construirMigracion(payload)

    return {
      config: migracion.config,
      summary: migracion.summary,
      preview: migracion.rows.slice(0, Number(payload && payload.limitPreview) || 50),
      warnings: migracion.warnings,
    }
  },

  importarDesdeSpreadsheet(payload, session) {
    ProductoService._validarPermisoImportacion(session)
    const migracion = this._construirMigracion(payload)

    const mode = payload && payload.mode ? String(payload.mode) : 'upsert'
    const dryRun = !!(payload && payload.dryRun)

    const resultado = ProductoService.importarMasivo({
      rows: migracion.rows,
      dryRun: dryRun,
      mode: mode,
    }, session)

    return {
      migration: {
        config: migracion.config,
        summary: migracion.summary,
        warnings: migracion.warnings,
      },
      importResult: resultado,
    }
  },

  _construirMigracion(payload) {
    const config = this._resolverConfig(payload)
    const ss = SpreadsheetApp.openById(config.spreadsheetId)
    const productosSheet = ss.getSheetByName(config.productosSheetName)
    const entradasSheet = ss.getSheetByName(config.entradasSheetName)

    if (!productosSheet) throw new Error('No se encontró la hoja origen: ' + config.productosSheetName)
    if (!entradasSheet) throw new Error('No se encontró la hoja de precios: ' + config.entradasSheetName)

    const productos = this._sheetToObjects(productosSheet)
    const entradas = this._sheetToObjects(entradasSheet)
    const preciosByCodigo = this._indexarPrecios(entradas, config)

    const rows = []
    const warnings = []
    const duplicados = {}
    const vistos = {}
    let conPrecio = 0
    let sinPrecio = 0
    let omitidosSinCodigo = 0
    let omitidosSinPrecio = 0

    productos.forEach((item, idx) => {
      const codigo = this._firstValue(item, ['codigo', 'codigo_mix', 'codigo_mix_']) // compat
      const sku = this._normalizarTexto(codigo).toUpperCase()
      if (!sku) {
        omitidosSinCodigo++
        return
      }

      if (vistos[sku]) {
        duplicados[sku] = (duplicados[sku] || 1) + 1
        return
      }
      vistos[sku] = true

      const descripcion = this._normalizarTexto(this._firstValue(item, ['descripcion']))
      const productoOrigen = this._normalizarTexto(this._firstValue(item, ['producto']))
      const marca = this._normalizarTexto(this._firstValue(item, ['marca'])).toUpperCase()
      const nombre = descripcion || this._limpiarNombreProducto(productoOrigen) || sku
      const descripcionFinal = productoOrigen || descripcion || nombre
      const precio = preciosByCodigo[sku] || null

      if (marca !== config.porMarca){
        return
      }

      if (config.onlyWithPrices && !precio) {
        omitidosSinPrecio++
        return
      }

      const precioCompra = precio ? Number(precio.precioCompra) || 0 : 0
      const precioOfrecido = precio ? Number(precio.precioOfrecido) || 0 : 0
      const precioFinal = precio ? Number(precio.precioFinal) || 0 : 0

      if (precio) conPrecio++
      else sinPrecio++

      rows.push({
        __rowNumber: idx + 2,
        sku: sku,
        marca: marca,
        nombre: nombre,
        descripcion: descripcionFinal,
        categoria: config.defaultCategoria,
        unidad: config.defaultUnidad,
        precioCompra: precioCompra,
        precioOfrecido: precioOfrecido,
        precioFinal: precioFinal,
        stockMinimo: config.defaultStockMinimo,
        imagenUrl: '',
        activo: true,
      })
    })

    const duplicatedCodes = Object.keys(duplicados)
    if (duplicatedCodes.length) {
      warnings.push(
        'Se detectaron ' + duplicatedCodes.length + ' códigos duplicados en Productos. ' +
        'Solo se tomó la primera aparición.'
      )
    }
    if (sinPrecio > 0) {
      warnings.push(
        sinPrecio + ' producto(s) no tienen coincidencia en "' + config.entradasSheetName +
        '" y se migrarán con precios en 0.'
      )
    }
    if (omitidosSinPrecio > 0) {
      warnings.push(
        omitidosSinPrecio + ' producto(s) fueron omitidos por la opción onlyWithPrices.'
      )
    }
    if (omitidosSinCodigo > 0) {
      warnings.push(
        omitidosSinCodigo + ' fila(s) de Productos fueron omitidas por no tener código.'
      )
    }

    return {
      config: config,
      rows: rows,
      warnings: warnings,
      summary: {
        totalProductosOrigen: productos.length,
        totalEntradasOrigen: entradas.length,
        totalCodigosConPrecio: Object.keys(preciosByCodigo).length,
        rowsPreparadas: rows.length,
        conPrecio: conPrecio,
        sinPrecio: sinPrecio,
        omitidosSinCodigo: omitidosSinCodigo,
        omitidosSinPrecio: omitidosSinPrecio,
        codigosDuplicados: duplicatedCodes.length,
      },
    }
  },

  _resolverConfig(payload) {
    const spreadsheetId = String(
      payload && payload.spreadsheetId
        ? payload.spreadsheetId
        : '1BtOahzJCvnI_pw8_v8YRSxH7fJX5f6xAoXcgrQeYhBA'
    ).trim()

    return {
      spreadsheetId: spreadsheetId,
      productosSheetName: String(payload && payload.productosSheetName || 'Productos').trim(),
      entradasSheetName: String(payload && payload.entradasSheetName || 'Registro de entradas').trim(),
      defaultCategoria: String(payload && payload.defaultCategoria || '').trim(),
      defaultUnidad: String(payload && payload.defaultUnidad || 'Unidad').trim(),
      defaultStockMinimo: Number(payload && payload.defaultStockMinimo) || 0,
      onlyWithPrices: !!(payload && payload.onlyWithPrices),
      priceSource: String(payload && payload.priceSource || 'ultimo').trim().toLowerCase(),
      porMarca: String(payload && payload.porMarca || '').trim(),
    }
  },

  _indexarPrecios(entradas, config) {
    const map = {}

    entradas.forEach(item => {
      const codigo = this._normalizarTexto(this._firstValue(item, ['codigo'])).toUpperCase()
      if (!codigo) return

      const fecha = Number(this._firstValue(item, ['fecha'])) || 0
      const costo = Number(this._firstValue(item, ['precio_costo'])) || 0
      const venta = Number(this._firstValue(item, ['precio_venta'])) || 0
      const costoUltimo = Number(this._firstValue(item, ['precio_costo_ultimo'])) || costo
      const ventaUltimo = Number(this._firstValue(item, ['precio_venta_ultimo'])) || venta
      const fechaUltimo = Number(this._firstValue(item, ['fecha_precio_ultimo'])) || fecha

      const precioCompra = config.priceSource === 'entrada' ? costo : costoUltimo
      const precioLista = config.priceSource === 'entrada' ? venta : ventaUltimo
      const precioFinal = precioLista
      const sortDate = config.priceSource === 'entrada' ? fecha : fechaUltimo

      if (!map[codigo] || sortDate >= map[codigo].sortDate) {
        map[codigo] = {
          sortDate: sortDate,
          precioCompra: precioCompra,
          precioOfrecido: precioLista,
          precioFinal: precioFinal,
        }
      }
    })

    return map
  },

  _sheetToObjects(sheet) {
    const values = sheet.getDataRange().getDisplayValues()
    if (!values || values.length < 2) return []

    const headerIndex = this._detectarFilaHeader(values)
    const headers = values[headerIndex].map(h => this._normalizeHeader(h))
    const rows = []

    for (let i = headerIndex + 1; i < values.length; i++) {
      const row = values[i]
      if (!row || row.every(cell => String(cell || '').trim() === '')) continue

      const item = {}
      headers.forEach((header, idx) => {
        if (!header) return
        item[header] = row[idx]
      })
      rows.push(item)
    }

    return rows
  },

  _detectarFilaHeader(values) {
    for (let i = 0; i < Math.min(values.length, 5); i++) {
      const normalized = values[i].map(v => this._normalizeHeader(v))
      if (
        normalized.indexOf('codigo') !== -1 &&
        (
          normalized.indexOf('producto') !== -1 ||
          normalized.indexOf('descripcion') !== -1 ||
          normalized.indexOf('precio_costo') !== -1
        )
      ) {
        return i
      }
    }
    return 0
  },

  _normalizeHeader(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  },

  _firstValue(item, keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
        return item[key]
      }
    }
    return ''
  },

  _normalizarTexto(value) {
    return String(value || '').trim()
  },

  _limpiarNombreProducto(value) {
    return String(value || '')
      .replace(/^\[[^\]]+\]\[[^\]]+\]\s*/g, '')
      .trim()
  },
}
