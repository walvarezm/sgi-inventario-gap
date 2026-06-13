// =============================================================
// MigracionPreciosService.gs
// Migra los precios históricos registrados en la hoja Movimientos
// hacia las filas correspondientes de la hoja Inventario.
//
// REGLAS:
//   - Solo actualiza filas cuyas columnas de precio estén VACÍAS
//     (nunca tocadas), a menos que force = true.
//   - Toma el movimiento MÁS RECIENTE con precio > 0 por combinación
//     (producto_id, sucursal_id).
//   - ENTRADA       → aplica precio a sucursal_destino (o sucursal_origen)
//   - SALIDA        → aplica precio a sucursal_origen  (o sucursal_destino)
//   - TRANSFERENCIA → aplica precio a AMBAS sucursales
//   - AJUSTE / OTRO → aplica precio al campo que no esté vacío
//   - Movimientos sin precio (ambos = 0) → ignorados
//   - Si precio coincide con producto base → precio_usa_base = TRUE
//   - Si precio difiere del base           → precio_usa_base = FALSE
//
// OPTIMIZACIÓN DE TIEMPO (solución al Exceeded maximum execution time):
//   - 3 lecturas únicas de Sheets (Inventario, Movimientos, Productos).
//   - Todo el procesamiento en memoria con mapas O(1).
//   - Escrituras en BLOQUE: setValues por fila (1×5 celdas) + insertMany.
//   - Sin re-lectura de hoja en cada iteración (era el cuello de botella).
// =============================================================

const MigracionPreciosService = {

  // ── API pública ──────────────────────────────────────────────────────────

  /**
   * Modo dry-run: analiza y retorna el plan sin escribir nada.
   * Requiere permiso inventario.editar_precios.
   */
  preview(payload, session) {
    AccessService.assert(
      session,
      'inventario.editar_precios',
      'Sin permiso para ejecutar la migración de precios'
    )
    return this._correr(payload || {}, true)
  },

  /**
   * Ejecuta la migración real sobre la hoja Inventario.
   * Requiere permiso inventario.editar_precios.
   */
  ejecutar(payload, session) {
    AccessService.assert(
      session,
      'inventario.editar_precios',
      'Sin permiso para ejecutar la migración de precios'
    )
    var resultado = this._correr(payload || {}, false)
    LogService.registrar(
      session.userId,
      'MIGRACION_PRECIOS',
      'Inventario',
      null,
      'Migración ejecutada — actualizadas: ' + resultado.resumen.filasActualizadas +
      ' | creadas: ' + resultado.resumen.filasCreadas +
      ' | omitidas: ' + resultado.resumen.filasOmitidas
    )
    return resultado
  },

  // ── Núcleo ───────────────────────────────────────────────────────────────

  /**
   * Orquesta el proceso completo (dry-run o real).
   *
   * Flujo optimizado:
   *   1. Lee las 3 hojas UNA SOLA VEZ en memoria.
   *   2. Construye índices O(1) sin búsquedas lineales en el loop.
   *   3. Acumula cambios en arrays pendingUpdates / pendingInserts.
   *   4. Aplica DOS operaciones bulk al final.
   *
   * @param {Object}  opts
   * @param {boolean} opts.force      - true: sobreescribe filas que ya tienen precio
   * @param {string}  opts.sucursalId - filtrar solo una sucursal (opcional)
   * @param {string}  opts.productoId - filtrar solo un producto (opcional)
   * @param {boolean} dryRun
   */
  _correr(opts, dryRun) {
    var force       = opts.force      === true || opts.force === 'true'
    var filSucursal = opts.sucursalId ? String(opts.sucursalId) : null
    var filProducto = opts.productoId ? String(opts.productoId) : null

    // ── 1. LECTURAS ÚNICAS ───────────────────────────────────────────────────
    var ss   = Sheets.getSpreadsheet()
    var sheet = ss.getSheetByName('Inventario')
    if (!sheet) throw new Error('Hoja Inventario no encontrada')

    var rawData     = sheet.getDataRange().getValues()     // array 2D, lectura única
    var headers     = rawData[0].map(function(h) { return String(h || '').trim() })
    var movimientos = Sheets.getAll('Movimientos')
    var productos   = Sheets.getAll('Productos')

    // ── 2. ÍNDICES DE COLUMNA (calculados una sola vez) ─────────────────────
    var COL = {
      id:                  headers.indexOf('id'),
      producto_id:         headers.indexOf('producto_id'),
      sucursal_id:         headers.indexOf('sucursal_id'),
      stock_actual:        headers.indexOf('stock_actual'),
      precio_ofrecido:     headers.indexOf('precio_ofrecido'),
      precio_final:        headers.indexOf('precio_final'),
      precio_usa_base:     headers.indexOf('precio_usa_base'),
      fecha_precio:        headers.indexOf('fecha_precio'),
      fecha_actualizacion: headers.indexOf('fecha_actualizacion'),
    }

    var colsNuevas = ['precio_ofrecido', 'precio_final', 'precio_usa_base', 'fecha_precio', 'fecha_actualizacion']
    var faltantes = colsNuevas.filter(function(c) { return COL[c] === -1 })
    if (faltantes.length) {
      throw new Error(
        'Faltan columnas en hoja Inventario: ' + faltantes.join(', ') +
        '. Ejecutar ensureInventarioSchema() primero.'
      )
    }

    // ── 3. ÍNDICES EN MEMORIA O(1) ───────────────────────────────────────────
    var productosMap = {}
    productos.forEach(function(p) {
      if (p.id) productosMap[String(p.id)] = p
    })

    // inventarioIndex: 'productoId::sucursalId' → { rowIdx (en rawData), row[] }
    var inventarioIndex = {}
    for (var r = 1; r < rawData.length; r++) {
      var pid = String(rawData[r][COL.producto_id] || '').trim()
      var sid = String(rawData[r][COL.sucursal_id] || '').trim()
      if (pid && sid) {
        inventarioIndex[pid + '::' + sid] = { rowIdx: r, row: rawData[r] }
      }
    }

    // ── 4. MAPA DE PRECIO MÁS RECIENTE POR (producto, sucursal) ─────────────
    var precioMap = this._construirMapaPreciosMovimientos(
      movimientos, filProducto, filSucursal
    )

    // ── 5. CLASIFICAR: ACTUALIZAR / CREAR / OMITIR ───────────────────────────
    var detalle          = []
    var warnings         = []
    var pendingUpdates   = []
    var pendingInserts   = []
    var filasActualizadas = 0
    var filasCreadas      = 0
    var filasOmitidas     = 0
    var ahora = new Date().toISOString()
    var self  = this

    Object.keys(precioMap).forEach(function(clave) {
      var entrada  = precioMap[clave]
      var producto = productosMap[entrada.productoId]

      if (!producto) {
        warnings.push(
          'Producto no encontrado: ' + entrada.productoId +
          ' (sucursal: ' + entrada.sucursalId + ')'
        )
        filasOmitidas++
        return
      }

      var baseOfrecido  = Number(producto.precio_ofrecido) || 0
      var baseFinal     = Number(producto.precio_final)    || 0
      var sonDistintos  = entrada.precioOfrecido !== baseOfrecido ||
                          entrada.precioFinal    !== baseFinal
      var precioUsaBase = !sonDistintos
      var fechaPrecio   = entrada.fechaMovimiento || ahora
      var invEntry      = inventarioIndex[clave] || null

      if (invEntry) {
        // ── Fila EXISTE ──────────────────────────────────────────────────────
        var yaPoblada = self._filaTienePrecioRaw(invEntry.row, COL)

        if (yaPoblada && !force) {
          detalle.push({
            productoId: entrada.productoId, sucursalId: entrada.sucursalId,
            precioOfrecido: entrada.precioOfrecido, precioFinal: entrada.precioFinal,
            precioUsaBase: precioUsaBase, fechaMovimiento: entrada.fechaMovimiento,
            tipoMovimiento: entrada.tipoMovimiento, movimientoId: entrada.movimientoId,
            accion: 'OMITIDO',
            razon: 'Fila ya tiene precio — usar force=true para sobreescribir',
          })
          filasOmitidas++
          return
        }

        // Acumular para escritura bulk
        pendingUpdates.push({
          rowIdx:             invEntry.rowIdx,
          precioOfrecido:     entrada.precioOfrecido,
          precioFinal:        entrada.precioFinal,
          precioUsaBase:      precioUsaBase,
          fechaPrecio:        fechaPrecio,
          fechaActualizacion: ahora,
        })
        detalle.push({
          productoId: entrada.productoId, sucursalId: entrada.sucursalId,
          precioOfrecido: entrada.precioOfrecido, precioFinal: entrada.precioFinal,
          precioUsaBase: precioUsaBase, fechaMovimiento: entrada.fechaMovimiento,
          tipoMovimiento: entrada.tipoMovimiento, movimientoId: entrada.movimientoId,
          accion: 'ACTUALIZADO',
          inventarioId: String(invEntry.row[COL.id]),
        })
        filasActualizadas++

      } else {
        // ── Fila NO EXISTE: encolar para inserción bulk ──────────────────────
        var nuevoId = Sheets.generateId()
        pendingInserts.push({
          id:                  nuevoId,
          producto_id:         entrada.productoId,
          sucursal_id:         entrada.sucursalId,
          stock_actual:        0,
          precio_ofrecido:     entrada.precioOfrecido,
          precio_final:        entrada.precioFinal,
          precio_usa_base:     precioUsaBase,
          fecha_precio:        fechaPrecio,
          fecha_actualizacion: ahora,
        })
        detalle.push({
          productoId: entrada.productoId, sucursalId: entrada.sucursalId,
          precioOfrecido: entrada.precioOfrecido, precioFinal: entrada.precioFinal,
          precioUsaBase: precioUsaBase, fechaMovimiento: entrada.fechaMovimiento,
          tipoMovimiento: entrada.tipoMovimiento, movimientoId: entrada.movimientoId,
          accion: 'CREADO', inventarioId: nuevoId,
          nota: 'Fila creada con stock_actual = 0',
        })
        filasCreadas++
      }
    })

    // ── 6. ESCRITURAS EN BLOQUE (solo si no es dry-run) ─────────────────────
    if (!dryRun) {
      this._aplicarActualizacionesBulk(sheet, COL, pendingUpdates)
      if (pendingInserts.length > 0) {
        Sheets.insertMany('Inventario', pendingInserts)
      }
    }

    return {
      dryRun: dryRun,
      resumen: {
        totalMovimientosAnalizados: movimientos.length,
        combinacionesEncontradas:   Object.keys(precioMap).length,
        filasActualizadas: filasActualizadas,
        filasCreadas:      filasCreadas,
        filasOmitidas:     filasOmitidas,
        warnings:          warnings,
      },
      detalle: detalle,
    }
  },

  // ── Escritura bulk ───────────────────────────────────────────────────────

  /**
   * Aplica todas las actualizaciones en bloque usando setValues.
   *
   * Si las 5 columnas de precio son CONTIGUAS (caso normal después de
   * ensureInventarioSchema), escribe cada fila en UNA llamada setValues
   * de 1×5 celdas → O(n) llamadas en total.
   *
   * Si las columnas están dispersas, escribe celda por celda pero sin
   * re-leer la hoja completa en cada iteración (que era el cuello original).
   */
  _aplicarActualizacionesBulk(sheet, COL, pendingUpdates) {
    if (!pendingUpdates.length) return

    var targetCols = [
      COL.precio_ofrecido,
      COL.precio_final,
      COL.precio_usa_base,
      COL.fecha_precio,
      COL.fecha_actualizacion,
    ]

    var minCol = Math.min.apply(null, targetCols)
    var maxCol = Math.max.apply(null, targetCols)
    var sonContiguas = (maxCol - minCol) === (targetCols.length - 1)

    pendingUpdates.forEach(function(upd) {
      // rawData: índice 0 = encabezado, datos desde índice 1
      // Sheets: filas 1-indexed → fila real = rowIdx + 1
      var sheetRow = upd.rowIdx + 1

      var valores = [
        upd.precioOfrecido,
        upd.precioFinal,
        upd.precioUsaBase,
        upd.fechaPrecio,
        upd.fechaActualizacion,
      ]

      if (sonContiguas) {
        // Reordenar valores según posición física de columna
        var pares = targetCols.map(function(col, i) { return { col: col, val: valores[i] } })
        pares.sort(function(a, b) { return a.col - b.col })
        var ordenados = pares.map(function(x) { return x.val })
        // UNA sola llamada a la API de Sheets por fila
        sheet.getRange(sheetRow, minCol + 1, 1, targetCols.length).setValues([ordenados])
      } else {
        // Columnas dispersas: una llamada por celda (aún sin re-leer la hoja)
        targetCols.forEach(function(col, i) {
          sheet.getRange(sheetRow, col + 1).setValue(valores[i])
        })
      }
    })
  },

  // ── Construcción del mapa de precios ────────────────────────────────────

  /**
   * Recorre los movimientos una sola vez y, para cada combinación
   * (producto, sucursal), retiene el precio del movimiento más reciente
   * con precio > 0.
   */
  _construirMapaPreciosMovimientos(movimientos, filProducto, filSucursal) {
    var mapa = {}

    movimientos.forEach(function(mov) {
      var productoId     = String(mov.producto_id || '').trim()
      var precioOfrecido = Number(mov.precio_ofrecido) || 0
      var precioFinal    = Number(mov.precio_final)    || 0

      if (!precioOfrecido && !precioFinal) return
      if (filProducto && productoId !== filProducto) return

      var sucursales = MigracionPreciosService._sucursalesDeMovimiento(mov)
      if (!sucursales.length) return

      var fechaMov = String(mov.fecha_registro || mov.fecha || '').trim()

      sucursales.forEach(function(sucursalId) {
        if (!sucursalId) return
        if (filSucursal && sucursalId !== filSucursal) return

        var clave  = productoId + '::' + sucursalId
        var actual = mapa[clave]
        if (!actual || fechaMov > String(actual.fechaMovimiento || '')) {
          mapa[clave] = {
            productoId:      productoId,
            sucursalId:      sucursalId,
            precioOfrecido:  precioOfrecido,
            precioFinal:     precioFinal,
            fechaMovimiento: fechaMov,
            tipoMovimiento:  String(mov.tipo || '').toUpperCase(),
            movimientoId:    mov.id,
          }
        }
      })
    })

    return mapa
  },

  /**
   * Determina a qué sucursal(es) aplica el precio de un movimiento.
   */
  _sucursalesDeMovimiento(mov) {
    var origen  = String(mov.sucursal_origen  || '').trim()
    var destino = String(mov.sucursal_destino || '').trim()
    var tipo    = String(mov.tipo || '').toUpperCase()

    switch (tipo) {
      case 'ENTRADA':
        return [destino || origen].filter(Boolean)
      case 'SALIDA':
        return [origen || destino].filter(Boolean)
      case 'TRANSFERENCIA': {
        var lista = []
        if (origen)                        lista.push(origen)
        if (destino && destino !== origen)  lista.push(destino)
        return lista
      }
      default:
        return [origen || destino].filter(Boolean)
    }
  },

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Comprueba si una fila cruda (array de valores del rawData) ya tiene
   * datos de precio. Trabaja directamente sobre el array sin crear objetos.
   */
  _filaTienePrecioRaw(row, COL) {
    var vacio = function(v) { return v === '' || v === null || v === undefined }
    return !vacio(row[COL.precio_ofrecido]) ||
           !vacio(row[COL.precio_final])    ||
           !vacio(row[COL.precio_usa_base])
  },
}
