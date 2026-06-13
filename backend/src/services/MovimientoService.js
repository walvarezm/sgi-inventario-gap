// =============================================================
// MovimientoService.gs — Comprobantes de inventario editables y masivos
// =============================================================

const MovimientoService = {
  SHEET_CABECERA: 'MovimientoCabecera',
  SHEET_MOVIMIENTOS: 'Movimientos',
  STATUS_ACTIVE: 'ACTIVO',
  STATUS_EDITED: 'EDITADO',
  REFERENCE_TEMPLATES: [
    {
      tipo: 'INICIO_INVENTARIO',
      textoBase: 'inicio de inventario, responsable de recepción: ',
      detalleLabel: 'Detalle de inicio de inventario',
    },
    {
      tipo: 'CIERRE_INVENTARIO',
      textoBase: 'cierre de inventario, responsable de entrega: ',
      detalleLabel: 'Detalle de cierre de inventario',
    },
    {
      tipo: 'REPOSICION_PRODUCTO',
      textoBase: 'reposición de producto, responsable de recepción: ',
      detalleLabel: 'Detalle de reposición',
    },
    {
      tipo: 'BAJA_PRODUCTO',
      textoBase: 'baja de producto, responsable de baja: ',
      detalleLabel: 'Detalle de baja de producto',
    },
    {
      tipo: 'OTRO',
      textoBase: '',
      detalleLabel: 'Detalle libre',
    },
  ],

  getMovimientoPlantillasReferencia() {
    return this.REFERENCE_TEMPLATES
  },

  getMovimientos(payload, session) {
    this._ensureSchema()
    const { sucursalId, desde, hasta, tipo } = payload || {}
    if (!sucursalId) throw new Error('sucursalId es requerido')
    this._assertSucursalAccess(sucursalId, session, 'inventario.ver')

    let movimientos = Sheets.getAll(this.SHEET_MOVIMIENTOS)
    movimientos = movimientos.filter(m =>
      String(m.sucursal_origen) === String(sucursalId) ||
      String(m.sucursal_destino) === String(sucursalId)
    )
    if (tipo) movimientos = movimientos.filter(m => String(m.tipo || '').toUpperCase() === String(tipo).toUpperCase())
    if (desde) movimientos = movimientos.filter(m => String(m.fecha || m.fecha_registro || '') >= String(desde))
    if (hasta) movimientos = movimientos.filter(m => String(m.fecha || m.fecha_registro || '') <= String(hasta))

    const cabecerasById = this._cabecerasById()
    const productosById = this._productosById()

    return movimientos
      .sort((a, b) => String(b.fecha || b.fecha_registro || '').localeCompare(String(a.fecha || a.fecha_registro || '')))
      .map(movimiento => {
        const cabecera = cabecerasById[movimiento.cabecera_id] || {}
        const producto = productosById[movimiento.producto_id] || {}
        return {
          id: movimiento.id,
          cabeceraId: movimiento.cabecera_id || '',
          tipo: movimiento.tipo,
          modo: cabecera.modo || 'UNITARIO',
          productoId: movimiento.producto_id,
          productoNombre: producto.nombre || movimiento.producto_id,
          productoSku: producto.sku || '',
          productoMarca: producto.marca || '',
          sucursalOrigen: movimiento.sucursal_origen || null,
          sucursalDestino: movimiento.sucursal_destino || null,
          cantidad: Number(movimiento.cantidad) || 0,
          referencia: movimiento.referencia || cabecera.referencia_texto || '',
          referenciaTipo: movimiento.referencia_tipo || cabecera.referencia_tipo || 'OTRO',
          referenciaTexto: movimiento.referencia_texto || cabecera.referencia_texto || '',
          fechaRegistro: movimiento.fecha_registro || cabecera.fecha_registro || movimiento.fecha || '',
          precioOfrecido: Number(movimiento.precio_ofrecido) || 0,
          precioFinal: Number(movimiento.precio_final) || 0,
          detalleAccion: movimiento.detalle_accion || '',
          editable: this._toBool(movimiento.editable, true),
          usuarioId: movimiento.usuario_id || cabecera.usuario_id || '',
          fecha: movimiento.fecha || '',
          notas: movimiento.notas || cabecera.notas || '',
          secuencial: Number(movimiento.secuencial) || 0,
        }
      })
  },

  getMovimientosCabecera(payload, session) {
    this._ensureSchema()
    const filtros = payload || {}
    const sucursalId = filtros.sucursalId
    if (!sucursalId) throw new Error('sucursalId es requerido')
    this._assertSucursalAccess(sucursalId, session, 'inventario.ver')

    let cabeceras = Sheets.getAll(this.SHEET_CABECERA)
      .filter(c =>
        String(c.sucursal_origen || '') === String(sucursalId) ||
        String(c.sucursal_destino || '') === String(sucursalId)
      )

    if (filtros.tipo) cabeceras = cabeceras.filter(c => String(c.tipo || '').toUpperCase() === String(filtros.tipo).toUpperCase())
    if (filtros.modo) cabeceras = cabeceras.filter(c => String(c.modo || '').toUpperCase() === String(filtros.modo).toUpperCase())
    if (filtros.referenciaTipo) cabeceras = cabeceras.filter(c => String(c.referencia_tipo || '').toUpperCase() === String(filtros.referenciaTipo).toUpperCase())
    if (filtros.desde) cabeceras = cabeceras.filter(c => String(c.fecha_registro || '') >= String(filtros.desde))
    if (filtros.hasta) cabeceras = cabeceras.filter(c => String(c.fecha_registro || '') <= String(filtros.hasta))

    const movimientos = Sheets.getAll(this.SHEET_MOVIMIENTOS)
    return cabeceras
      .sort((a, b) => String(b.fecha_registro || '').localeCompare(String(a.fecha_registro || '')))
      .map(cabecera => this._mapCabecera(cabecera, movimientos))
  },

  getMovimientoById(payload, session) {
    this._ensureSchema()
    if (!payload.id) throw new Error('id es requerido')
    const cabecera = Sheets.getBy(this.SHEET_CABECERA, 'id', payload.id)
    if (!cabecera) throw new Error('Movimiento no encontrado: ' + payload.id)

    const sucursalCheck = cabecera.sucursal_origen || cabecera.sucursal_destino
    if (sucursalCheck) this._assertSucursalAccess(sucursalCheck, session, 'inventario.ver')

    const movimientos = Sheets.getAll(this.SHEET_MOVIMIENTOS)
    const productosById = this._productosById()
    const items = movimientos
      .filter(m => String(m.cabecera_id) === String(payload.id))
      .map(m => {
        const producto = productosById[m.producto_id] || {}
        return {
          id: m.id,
          movimientoOrigenId: m.movimiento_origen_id || '',
          productoId: m.producto_id,
          productoSku: producto.sku || '',
          productoNombre: producto.nombre || '',
          cantidad: Number(m.cantidad) || 0,
          precioOfrecido: Number(m.precio_ofrecido) || Number(producto.precio_ofrecido) || 0,
          precioFinal: Number(m.precio_final) || Number(producto.precio_final) || 0,
          detalleAccion: m.detalle_accion || '',
          secuencial: m.secuencial || '',
        }
      })

    const result = this._mapCabecera(cabecera, movimientos)
    result.items = items
    return result
  },

  createMovimientoUnitario(payload, session) {
    return this.createMovimientoMasivo({
      tipo: payload.tipo,
      modo: 'UNITARIO',
      fechaRegistro: payload.fechaRegistro,
      referenciaTipo: payload.referenciaTipo,
      referenciaTexto: payload.referenciaTexto,
      notas: payload.notas || '',
      sucursalId: payload.sucursalId,
      sucursalOrigen: payload.sucursalOrigen,
      sucursalDestino: payload.sucursalDestino,
      items: [{
        productoId: payload.productoId,
        cantidad: Number(payload.cantidad) || 0,
        precioOfrecido: Number(payload.precioOfrecido) || 0,
        precioFinal: Number(payload.precioFinal) || 0,
        detalleAccion: payload.detalleAccion || '',
        secuencial: Number(payload.secuencial) || 0,
      }],
    }, session)
  },

  createMovimientoMasivo(payload, session) {
    this._ensureSchema()
    const normalized = this._normalizePayload(payload)
    this._assertCreatePermission(normalized, session)
    this._assertPriceUpdatesAllowed(normalized, session)
    this._validateScenario(normalized, null)

    const stockSnapshot = this._buildStockSnapshot()
    this._simulateScenario(normalized, stockSnapshot, null)

    const now = new Date().toISOString()
    const cabecera = {
      id: Sheets.generateId(),
      tipo: normalized.tipo,
      modo: normalized.modo,
      sucursal_origen: normalized.sucursalOrigen || '',
      sucursal_destino: normalized.sucursalDestino || '',
      fecha_registro: normalized.fechaRegistro,
      referencia_tipo: normalized.referenciaTipo,
      referencia_texto: normalized.referenciaTexto,
      notas: normalized.notas || '',
      usuario_id: session.userId,
      estado: this.STATUS_ACTIVE,
      fecha_creacion: now,
      fecha_actualizacion: now,
    }
    Sheets.insert(this.SHEET_CABECERA, cabecera)

    const movimientos = this._createLineRecords(cabecera, normalized, session)
    Sheets.insertMany(this.SHEET_MOVIMIENTOS, movimientos)
    this._applyStockChanges(normalized, null)
    this._syncProductPrices(normalized, session)
    this._invalidateCatalogCaches(normalized)

    LogService.registrar(
      session.userId,
      'CREATE',
      this.SHEET_CABECERA,
      normalized.sucursalOrigen || normalized.sucursalId || normalized.sucursalDestino || null,
      normalized.tipo + ' ' + normalized.modo + ' creado: ' + cabecera.id
    )

    return this.getMovimientoById({ id: cabecera.id }, session)
  },

  updateMovimiento(payload, session) {
    this._ensureSchema()
    if (!payload.cabeceraId) throw new Error('cabeceraId es requerido')
    AccessService.assert(session, 'inventario.editar_movimientos', 'Sin permiso para editar movimientos')

    const existente = this.getMovimientoById({ id: payload.cabeceraId }, session)
    const normalized = this._normalizePayload(payload)
    normalized.modo = normalized.modo || existente.modo
    this._assertCreatePermission(normalized, session)
    this._assertPriceUpdatesAllowed(normalized, session)
    if (payload.fechaRegistro && payload.fechaRegistro !== existente.fechaRegistro) {
      AccessService.assert(session, 'inventario.editar_fecha_movimiento', 'Sin permiso para editar la fecha del movimiento')
    }
    if (this._hasPriceChanges(existente.items || [], normalized.items)) {
      AccessService.assert(session, 'inventario.editar_precios_movimiento', 'Sin permiso para editar precios del movimiento')
    }
    this._validateScenario(normalized, existente)

    const stockSnapshot = this._buildStockSnapshot()
    this._simulateScenario(normalized, stockSnapshot, existente)

    const now = new Date().toISOString()
    Sheets.update(this.SHEET_CABECERA, payload.cabeceraId, {
      tipo: normalized.tipo,
      modo: normalized.modo,
      sucursal_origen: normalized.sucursalOrigen || '',
      sucursal_destino: normalized.sucursalDestino || '',
      fecha_registro: normalized.fechaRegistro,
      referencia_tipo: normalized.referenciaTipo,
      referencia_texto: normalized.referenciaTexto,
      notas: normalized.notas || '',
      estado: this.STATUS_ACTIVE,
      fecha_actualizacion: now,
    })

    this._revertStockChanges(existente)
    this._deleteMovementLines(payload.cabeceraId)
    const cabeceraRow = Sheets.getBy(this.SHEET_CABECERA, 'id', payload.cabeceraId)
    const lineRecords = this._createLineRecords(cabeceraRow, normalized, session, existente.items || [])
    Sheets.insertMany(this.SHEET_MOVIMIENTOS, lineRecords)
    this._applyStockChanges(normalized, null)
    this._syncProductPrices(normalized, session)
    this._invalidateCatalogCaches(normalized)

    LogService.registrar(
      session.userId,
      'UPDATE',
      this.SHEET_CABECERA,
      normalized.sucursalOrigen || normalized.sucursalId || normalized.sucursalDestino || null,
      'Movimiento actualizado: ' + payload.cabeceraId
    )

    return this.getMovimientoById({ id: payload.cabeceraId }, session)
  },

  entrada(payload, session) {
    const result = this.createMovimientoUnitario({
      tipo: 'ENTRADA',
      sucursalId: payload.sucursalId,
      productoId: payload.productoId,
      cantidad: payload.cantidad,
      fechaRegistro: payload.fechaRegistro || new Date().toISOString(),
      referenciaTipo: payload.referenciaTipo || 'OTRO',
      referenciaTexto: payload.referenciaTexto || payload.referencia || '',
      notas: payload.notas || '',
      precioOfrecido: payload.precioOfrecido,
      precioFinal: payload.precioFinal,
      detalleAccion: payload.detalleAccion || '',
      secuencial: payload.secuencial || 0,
    }, session)
    return this._cabeceraToLegacyMovement(result)
  },

  salida(payload, session) {
    const result = this.createMovimientoUnitario({
      tipo: 'SALIDA',
      sucursalId: payload.sucursalId,
      productoId: payload.productoId,
      cantidad: payload.cantidad,
      fechaRegistro: payload.fechaRegistro || new Date().toISOString(),
      referenciaTipo: payload.referenciaTipo || 'OTRO',
      referenciaTexto: payload.referenciaTexto || payload.referencia || '',
      notas: payload.notas || '',
      precioOfrecido: payload.precioOfrecido,
      precioFinal: payload.precioFinal,
      detalleAccion: payload.detalleAccion || '',
      secuencial: payload.secuencial || 0,
    }, session)
    return this._cabeceraToLegacyMovement(result)
  },

  transferir(payload, session) {
    const result = this.createMovimientoUnitario({
      tipo: 'TRANSFERENCIA',
      sucursalOrigen: payload.sucursalOrigen,
      sucursalDestino: payload.sucursalDestino,
      productoId: payload.productoId,
      cantidad: payload.cantidad,
      fechaRegistro: payload.fechaRegistro || new Date().toISOString(),
      referenciaTipo: payload.referenciaTipo || 'OTRO',
      referenciaTexto: payload.referenciaTexto || payload.referencia || ('TRANS-' + Date.now()),
      notas: payload.notas || '',
      precioOfrecido: payload.precioOfrecido,
      precioFinal: payload.precioFinal,
      detalleAccion: payload.detalleAccion || '',
      secuencial: payload.secuencial || 0,
    }, session)
    return this._cabeceraToLegacyMovement(result)
  },

  _cabeceraToLegacyMovement(cabecera) {
    const item = (cabecera.items || [])[0]
    return {
      id: cabecera.id,
      cabeceraId: cabecera.id,
      tipo: cabecera.tipo,
      productoId: item ? item.productoId : '',
      sucursalOrigen: cabecera.sucursalOrigen,
      sucursalDestino: cabecera.sucursalDestino,
      cantidad: item ? item.cantidad : cabecera.cantidadTotal,
      referencia: cabecera.referencia,
      usuarioId: cabecera.usuarioId,
      fecha: cabecera.fechaCreacion,
      fechaRegistro: cabecera.fechaRegistro,
      notas: cabecera.notas,
    }
  },

  _normalizePayload(payload) {
    const tipo = String(payload.tipo || '').trim().toUpperCase()
    const modo = String(payload.modo || ((payload.items || []).length > 1 ? 'MASIVO' : 'UNITARIO')).trim().toUpperCase()
    const isTransfer = tipo === 'TRANSFERENCIA'
    const sucursalOrigen = payload.sucursalOrigen || (isTransfer ? '' : payload.sucursalId || '')
    const sucursalDestino = payload.sucursalDestino || (isTransfer ? payload.sucursalDestino || '' : payload.sucursalId || '')
    return {
      tipo: tipo,
      modo: modo === 'MASIVO' ? 'MASIVO' : 'UNITARIO',
      sucursalId: payload.sucursalId || '',
      sucursalOrigen: sucursalOrigen,
      sucursalDestino: sucursalDestino,
      fechaRegistro: payload.fechaRegistro || new Date().toISOString(),
      referenciaTipo: String(payload.referenciaTipo || 'OTRO').trim().toUpperCase(),
      referenciaTexto: String(payload.referenciaTexto || '').trim(),
      notas: String(payload.notas || '').trim(),
      items: (payload.items || []).map(item => ({
        productoId: item.productoId,
        cantidad: Number(item.cantidad) || 0,
        precioOfrecido: Number(item.precioOfrecido) || 0,
        precioFinal: Number(item.precioFinal) || 0,
        detalleAccion: String(item.detalleAccion || '').trim(),
        secuencial: Number(item.secuencial) || 0,
      })),
    }
  },

  _validateScenario(normalized, previous) {
    if (!normalized.tipo) throw new Error('tipo es requerido')
    if (!normalized.items.length) throw new Error('Debe registrar al menos un ítem')
    if (normalized.tipo === 'TRANSFERENCIA') {
      if (!normalized.sucursalOrigen) throw new Error('sucursalOrigen es requerida')
      if (!normalized.sucursalDestino) throw new Error('sucursalDestino es requerida')
      if (normalized.sucursalOrigen === normalized.sucursalDestino) {
        throw new Error('Origen y destino no pueden ser iguales')
      }
    } else if (!normalized.sucursalId && !normalized.sucursalOrigen) {
      throw new Error('Sucursal requerida')
    }

    normalized.items.forEach(item => {
      if (!item.productoId) throw new Error('productoId es requerido')
      if (item.cantidad <= 0) throw new Error('Cantidad debe ser mayor a 0')
    })
  },

  _assertCreatePermission(normalized, session) {
    if (normalized.modo === 'MASIVO') {
      AccessService.assert(session, 'inventario.crear_masivo', 'Sin permiso para registrar operaciones masivas')
    }
    if (normalized.referenciaTipo !== 'OTRO') {
      AccessService.assert(session, 'inventario.usar_plantillas_referencia', 'Sin permiso para usar plantillas de referencia')
    }
    if (normalized.tipo === 'ENTRADA') {
      this._assertSucursalAccess(normalized.sucursalOrigen || normalized.sucursalId, session, 'inventario.entrada')
      return
    }
    if (normalized.tipo === 'SALIDA') {
      this._assertSucursalAccess(normalized.sucursalOrigen || normalized.sucursalId, session, 'inventario.salida')
      return
    }
    if (normalized.tipo === 'TRANSFERENCIA') {
      this._assertSucursalAccess(normalized.sucursalOrigen, session, 'inventario.transferencia')
      this._assertSucursalAccess(normalized.sucursalDestino, session, 'inventario.transferencia')
    }
  },

  _assertPriceUpdatesAllowed(normalized, session) {
    const changed = normalized.items.some(item => {
      const existente = Sheets.getBy('Productos', 'id', item.productoId) || {}
      return Number(item.precioOfrecido || 0) !== (Number(existente.precio_ofrecido) || 0) ||
        Number(item.precioFinal || 0) !== (Number(existente.precio_final) || 0)
    })
    if (changed) {
      AccessService.assert(session, 'inventario.editar_precios_movimiento', 'Sin permiso para editar precios desde movimientos')
    }
  },

  _assertSucursalAccess(sucursalId, session, permission) {
    if (!sucursalId) return
    if (AccessService.can(session, permission)) {
      AccessService.assertInSucursal(session, permission, sucursalId, 'Acceso no autorizado a la sucursal: ' + sucursalId)
      return
    }

    const legacyRole = String(session.rol || '').toUpperCase()
    if ((legacyRole === 'ADMINISTRADOR' || legacyRole === 'SUPERVISOR') || String(session.sucursalId || '') === String(sucursalId)) {
      return
    }
    throw new Error('Acceso no autorizado a la sucursal: ' + sucursalId)
  },

  _buildStockSnapshot() {
    const snapshot = {}
    Sheets.getAll('Inventario').forEach(item => {
      snapshot[this._stockKey(item.producto_id, item.sucursal_id)] = Number(item.stock_actual) || 0
    })
    return snapshot
  },

  _simulateScenario(normalized, snapshot, previous) {
    const simulated = JSON.parse(JSON.stringify(snapshot || {}))
    if (previous) this._simulateRevert(previous, simulated)
    this._simulateApply(normalized, simulated)
  },

  _simulateRevert(previous, simulated) {
    ;(previous.items || []).forEach(item => {
      if (previous.tipo === 'ENTRADA') {
        this._adjustSimulated(simulated, item.productoId, previous.sucursalDestino || previous.sucursalOrigen, -Number(item.cantidad))
      } else if (previous.tipo === 'SALIDA') {
        this._adjustSimulated(simulated, item.productoId, previous.sucursalOrigen || previous.sucursalDestino, Number(item.cantidad))
      } else if (previous.tipo === 'TRANSFERENCIA') {
        this._adjustSimulated(simulated, item.productoId, previous.sucursalOrigen, Number(item.cantidad))
        this._adjustSimulated(simulated, item.productoId, previous.sucursalDestino, -Number(item.cantidad))
      }
    })
  },

  _simulateApply(normalized, simulated) {
    normalized.items.forEach(item => {
      if (normalized.tipo === 'ENTRADA') {
        this._adjustSimulated(simulated, item.productoId, normalized.sucursalOrigen || normalized.sucursalId, Number(item.cantidad))
      } else if (normalized.tipo === 'SALIDA') {
        this._adjustSimulated(simulated, item.productoId, normalized.sucursalOrigen || normalized.sucursalId, -Number(item.cantidad))
      } else if (normalized.tipo === 'TRANSFERENCIA') {
        this._adjustSimulated(simulated, item.productoId, normalized.sucursalOrigen, -Number(item.cantidad))
        this._adjustSimulated(simulated, item.productoId, normalized.sucursalDestino, Number(item.cantidad))
      }
    })
  },

  _adjustSimulated(simulated, productoId, sucursalId, delta) {
    const key = this._stockKey(productoId, sucursalId)
    const current = Number(simulated[key] || 0)
    const next = current + Number(delta || 0)
    if (next < 0) throw new Error('Stock insuficiente para el producto ' + productoId + ' en sucursal ' + sucursalId)
    simulated[key] = next
  },

  _createLineRecords(cabecera, normalized, session, previousItems) {
    const previousMap = {}
    ;(previousItems || []).forEach(item => { previousMap[item.productoId] = item.id || item.movimientoOrigenId || '' })

    return normalized.items.map(item => {
      const producto = Sheets.getBy('Productos', 'id', item.productoId)
      const precioOfrecido = item.precioOfrecido || Number((producto || {}).precio_ofrecido) || 0
      const precioFinal = item.precioFinal || Number((producto || {}).precio_final) || 0
      return {
        id: Sheets.generateId(),
        cabecera_id: cabecera.id,
        tipo: normalized.tipo,
        producto_id: item.productoId,
        sucursal_origen: normalized.tipo === 'ENTRADA' ? '' : (normalized.sucursalOrigen || normalized.sucursalId || ''),
        sucursal_destino: normalized.tipo === 'SALIDA' ? '' : (normalized.tipo === 'TRANSFERENCIA' ? normalized.sucursalDestino : (normalized.sucursalOrigen || normalized.sucursalId || '')),
        cantidad: Number(item.cantidad) || 0,
        referencia: normalized.referenciaTexto || '',
        referencia_tipo: normalized.referenciaTipo,
        referencia_texto: normalized.referenciaTexto || '',
        usuario_id: session.userId,
        fecha: new Date().toISOString(),
        fecha_registro: normalized.fechaRegistro,
        precio_ofrecido: precioOfrecido,
        precio_final: precioFinal,
        detalle_accion: item.detalleAccion || '',
        editable: true,
        movimiento_origen_id: previousMap[item.productoId] || '',
        notas: normalized.notas || '',
        secuencial: Number(item.secuencial) || 0,
      }
    })
  },

  _applyStockChanges(normalized, _previous) {
    normalized.items.forEach(item => {
      const cantidad = Number(item.cantidad) || 0
      if (normalized.tipo === 'ENTRADA') {
        InventarioService._ajustarStock(item.productoId, normalized.sucursalOrigen || normalized.sucursalId, cantidad)
      } else if (normalized.tipo === 'SALIDA') {
        InventarioService._ajustarStock(item.productoId, normalized.sucursalOrigen || normalized.sucursalId, -cantidad)
        const stockResultante = InventarioService.getStockProducto({
          productoId: item.productoId,
          sucursalId: normalized.sucursalOrigen || normalized.sucursalId,
        }).stockActual
        AlertaService.verificarStockMinimo(item.productoId, normalized.sucursalOrigen || normalized.sucursalId, stockResultante)
      } else if (normalized.tipo === 'TRANSFERENCIA') {
        InventarioService._ajustarStock(item.productoId, normalized.sucursalOrigen, -cantidad)
        InventarioService._ajustarStock(item.productoId, normalized.sucursalDestino, cantidad)
        const stockResultante = InventarioService.getStockProducto({
          productoId: item.productoId,
          sucursalId: normalized.sucursalOrigen,
        }).stockActual
        AlertaService.verificarStockMinimo(item.productoId, normalized.sucursalOrigen, stockResultante)
      }
    })
  },

  _revertStockChanges(previous) {
    ;(previous.items || []).forEach(item => {
      const cantidad = Number(item.cantidad) || 0
      if (previous.tipo === 'ENTRADA') {
        InventarioService._ajustarStock(item.productoId, previous.sucursalDestino || previous.sucursalOrigen, -cantidad)
      } else if (previous.tipo === 'SALIDA') {
        InventarioService._ajustarStock(item.productoId, previous.sucursalOrigen || previous.sucursalDestino, cantidad)
      } else if (previous.tipo === 'TRANSFERENCIA') {
        InventarioService._ajustarStock(item.productoId, previous.sucursalOrigen, cantidad)
        InventarioService._ajustarStock(item.productoId, previous.sucursalDestino, -cantidad)
      }
    })
  },

  /**
   * Actualiza los precios en el ítem de inventario de la sucursal involucrada.
   * Si el movimiento trae precios distintos al producto base, la fila queda
   * con precio_usa_base = FALSE (precio independiente por sucursal).
   * Ya NO sobreescribe el producto base.
   */
  _syncProductPrices(normalized, session) {
    normalized.items.forEach(item => {
      const precioOfrecido = Number(item.precioOfrecido) || 0
      const precioFinal    = Number(item.precioFinal) || 0
      if (!precioOfrecido && !precioFinal) return

      const sucursalId = normalized.sucursalOrigen || normalized.sucursalId ||
                         normalized.sucursalDestino || ''
      if (!sucursalId) return

      // Determinar si los precios difieren del producto base
      const producto = Sheets.getBy('Productos', 'id', item.productoId) || {}
      const baseOfrecido = Number(producto.precio_ofrecido) || 0
      const baseFinal    = Number(producto.precio_final) || 0
      const sonDistintos = precioOfrecido !== baseOfrecido || precioFinal !== baseFinal

      // precioUsaBase = false si el operador explicitó precios distintos al base
      InventarioService._ajustarStock(item.productoId, sucursalId, 0, {
        precioOfrecido: precioOfrecido || baseOfrecido,
        precioFinal:    precioFinal || baseFinal,
        precioUsaBase:  !sonDistintos,
      })
    })
  },

  _invalidateCatalogCaches(normalized) {
    if (normalized.sucursalOrigen) CatalogoService.invalidarCache(normalized.sucursalOrigen)
    if (normalized.sucursalDestino && normalized.sucursalDestino !== normalized.sucursalOrigen) {
      CatalogoService.invalidarCache(normalized.sucursalDestino)
    }
    if (normalized.sucursalId) CatalogoService.invalidarCache(normalized.sucursalId)
  },

  _deleteMovementLines(cabeceraId) {
    Sheets.getAll(this.SHEET_MOVIMIENTOS)
      .filter(item => String(item.cabecera_id) === String(cabeceraId))
      .forEach(item => Sheets.delete(this.SHEET_MOVIMIENTOS, item.id))
  },

  _cabecerasById() {
    const map = {}
    Sheets.getAll(this.SHEET_CABECERA).forEach(cabecera => { map[cabecera.id] = cabecera })
    return map
  },

  _productosById() {
    const map = {}
    Sheets.getAll('Productos').forEach(producto => { map[producto.id] = producto })
    return map
  },

  _mapCabecera(cabecera, movimientos) {
    const items = (movimientos || []).filter(m => String(m.cabecera_id) === String(cabecera.id))
    const cantidadTotal = items.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0)
    return {
      id: cabecera.id,
      tipo: cabecera.tipo,
      modo: cabecera.modo || 'UNITARIO',
      sucursalOrigen: cabecera.sucursal_origen || null,
      sucursalDestino: cabecera.sucursal_destino || null,
      fechaRegistro: cabecera.fecha_registro || '',
      referenciaTipo: cabecera.referencia_tipo || 'OTRO',
      referenciaTexto: cabecera.referencia_texto || '',
      referencia: cabecera.referencia_texto || '',
      notas: cabecera.notas || '',
      usuarioId: cabecera.usuario_id || '',
      estado: cabecera.estado || this.STATUS_ACTIVE,
      fechaCreacion: cabecera.fecha_creacion || '',
      fechaActualizacion: cabecera.fecha_actualizacion || '',
      cantidadTotal: cantidadTotal,
      totalLineas: items.length,
      editable: true,
    }
  },

  _hasPriceChanges(previousItems, nextItems) {
    const prevMap = {}
    ;(previousItems || []).forEach(item => { prevMap[item.productoId] = item })
    return (nextItems || []).some(item => {
      const previous = prevMap[item.productoId]
      if (!previous) return true
      return Number(previous.precioOfrecido || 0) !== Number(item.precioOfrecido || 0) ||
        Number(previous.precioFinal || 0) !== Number(item.precioFinal || 0)
    })
  },

  _toBool(value, fallback) {
    if (value === undefined || value === null || value === '') return !!fallback
    if (value === true || value === 1 || String(value).toUpperCase() === 'TRUE') return true
    if (value === false || value === 0 || String(value).toUpperCase() === 'FALSE') return false
    return !!fallback
  },

  _stockKey(productoId, sucursalId) {
    return String(productoId || '') + '::' + String(sucursalId || '')
  },

  _ensureSchema() {
    try {
      if (typeof ensureMovimientoSchema === 'function') ensureMovimientoSchema()
    } catch (e) {
      Logger.log('ensureMovimientoSchema error: ' + e.message)
    }
  },

  // ============================================================
  // updateMovimientoDetalle
  // Actualiza UNA línea de un comprobante sin modificar las demás.
  // Revierte el stock de la cantidad anterior y aplica la nueva.
  // ============================================================
  updateMovimientoDetalle(payload, session) {
    this._ensureSchema()
    AccessService.assert(session, 'inventario.editar_movimientos', 'Sin permiso para editar líneas de movimiento')

    const { cabeceraId, tipo, detalleId, productoId, cantidad, precioOfrecido, precioFinal, detalleAccion, secuencial, sucursalOrigen, sucursalDestino } = payload || {}

    if (!cabeceraId) throw new Error('cabeceraId es requerido')
    if (!detalleId) throw new Error('detalleId es requerido')
    if (!productoId) throw new Error('productoId es requerido')
    if (!cantidad || Number(cantidad) <= 0) throw new Error('cantidad debe ser mayor a 0')

    const cabecera = Sheets.getBy(this.SHEET_CABECERA, 'id', cabeceraId)
    if (!cabecera) throw new Error('Movimiento no encontrado: ' + cabeceraId)
    const sucursalCheck = cabecera.sucursal_origen || cabecera.sucursal_destino
    if (sucursalCheck) this._assertSucursalAccess(sucursalCheck, session, 'inventario.ver')

    const detalleOriginal = Sheets.getBy(this.SHEET_MOVIMIENTOS, 'id', detalleId)
    if (!detalleOriginal) throw new Error('Línea de movimiento no encontrada: ' + detalleId)
    if (String(detalleOriginal.cabecera_id) !== String(cabeceraId)) {
      throw new Error('La línea no pertenece a este movimiento')
    }

    const tipoMov = String(tipo || cabecera.tipo || '').trim().toUpperCase()
    const sucOrigen = sucursalOrigen || detalleOriginal.sucursal_origen || cabecera.sucursal_origen || ''
    const sucDestino = sucursalDestino || detalleOriginal.sucursal_destino || cabecera.sucursal_destino || ''
    const cantidadAnterior = Number(detalleOriginal.cantidad) || 0
    const cantidadNueva = Number(cantidad) || 0
    const productoIdAnterior = detalleOriginal.producto_id

    // 1. Revertir stock de la línea anterior
    if (tipoMov === 'ENTRADA') {
      InventarioService._ajustarStock(productoIdAnterior, sucDestino || sucOrigen, -cantidadAnterior)
    } else if (tipoMov === 'SALIDA') {
      InventarioService._ajustarStock(productoIdAnterior, sucOrigen || sucDestino, cantidadAnterior)
    } else if (tipoMov === 'TRANSFERENCIA') {
      InventarioService._ajustarStock(productoIdAnterior, sucOrigen, cantidadAnterior)
      InventarioService._ajustarStock(productoIdAnterior, sucDestino, -cantidadAnterior)
    }

    // 2. Aplicar stock de la línea nueva
    if (tipoMov === 'ENTRADA') {
      InventarioService._ajustarStock(productoId, sucDestino || sucOrigen, cantidadNueva)
    } else if (tipoMov === 'SALIDA') {
      const stockDisponible = InventarioService.getStockProducto({ productoId, sucursalId: sucOrigen || sucDestino }).stockActual
      if (stockDisponible < cantidadNueva) throw new Error('Stock insuficiente para la nueva cantidad en la línea')
      InventarioService._ajustarStock(productoId, sucOrigen || sucDestino, -cantidadNueva)
      AlertaService.verificarStockMinimo(productoId, sucOrigen || sucDestino, stockDisponible - cantidadNueva)
    } else if (tipoMov === 'TRANSFERENCIA') {
      const stockOrigen = InventarioService.getStockProducto({ productoId, sucursalId: sucOrigen }).stockActual
      if (stockOrigen < cantidadNueva) throw new Error('Stock insuficiente en sucursal origen para la nueva cantidad')
      InventarioService._ajustarStock(productoId, sucOrigen, -cantidadNueva)
      InventarioService._ajustarStock(productoId, sucDestino, cantidadNueva)
      AlertaService.verificarStockMinimo(productoId, sucOrigen, stockOrigen - cantidadNueva)
    }

    // 3. Actualizar el registro de la línea
    const now = new Date().toISOString()
    Sheets.update(this.SHEET_MOVIMIENTOS, detalleId, {
      producto_id: productoId,
      cantidad: cantidadNueva,
      precio_ofrecido: Number(precioOfrecido) || 0,
      precio_final: Number(precioFinal) || 0,
      detalle_accion: String(detalleAccion || '').trim(),
      secuencial: Number(secuencial) || 0,
      fecha: now,
    })

    // 4. Actualizar fecha_actualizacion de la cabecera
    Sheets.update(this.SHEET_CABECERA, cabeceraId, { fecha_actualizacion: now })

    // 5. Sincronizar precios del producto si se cambiaron
    if (Number(precioOfrecido) > 0 || Number(precioFinal) > 0) {
      this._syncProductPrices({
        sucursalId: sucOrigen || sucDestino || '',
        items: [{ productoId, precioOfrecido: Number(precioOfrecido) || 0, precioFinal: Number(precioFinal) || 0 }] }, session)
    }
    this._invalidateCatalogCaches({ sucursalOrigen: sucOrigen, sucursalDestino: sucDestino })

    LogService.registrar(session.userId, 'UPDATE', this.SHEET_MOVIMIENTOS, sucOrigen || sucDestino || null,
      'Línea actualizada: ' + detalleId + ' en cabecera: ' + cabeceraId)

    const producto = Sheets.getBy('Productos', 'id', productoId) || {}
    return {
      id: detalleId,
      productoId: productoId,
      productoSku: producto.sku || '',
      productoNombre: producto.nombre || '',
      cantidad: cantidadNueva,
      precioOfrecido: Number(precioOfrecido) || 0,
      precioFinal: Number(precioFinal) || 0,
      detalleAccion: String(detalleAccion || '').trim(),
      secuencial: Number(secuencial) || 0,
    }
  },

  // ============================================================
  // deleteMovimientoDetalle
  // Elimina UNA línea de un comprobante revirtiendo su efecto
  // en el stock. No permite eliminar si es la última línea.
  // ============================================================
  deleteMovimientoDetalle(payload, session) {
    this._ensureSchema()
    AccessService.assert(session, 'inventario.editar_movimientos', 'Sin permiso para eliminar líneas de movimiento')

    const { cabeceraId, tipo, detalleId, productoId, cantidad, sucursalOrigen, sucursalDestino } = payload || {}

    if (!cabeceraId) throw new Error('cabeceraId es requerido')
    if (!detalleId) throw new Error('detalleId es requerido')

    const cabecera = Sheets.getBy(this.SHEET_CABECERA, 'id', cabeceraId)
    if (!cabecera) throw new Error('Movimiento no encontrado: ' + cabeceraId)
    const sucursalCheck = cabecera.sucursal_origen || cabecera.sucursal_destino
    if (sucursalCheck) this._assertSucursalAccess(sucursalCheck, session, 'inventario.ver')

    const lineasActivas = Sheets.getAll(this.SHEET_MOVIMIENTOS).filter(m => String(m.cabecera_id) === String(cabeceraId))
    if (lineasActivas.length <= 1) {
      throw new Error('No se puede eliminar la única línea del comprobante. Use el formulario de edición completo para modificarlo.')
    }

    const detalle = Sheets.getBy(this.SHEET_MOVIMIENTOS, 'id', detalleId)
    if (!detalle) throw new Error('Línea de movimiento no encontrada: ' + detalleId)
    if (String(detalle.cabecera_id) !== String(cabeceraId)) {
      throw new Error('La línea no pertenece a este movimiento')
    }

    const tipoMov = String(tipo || cabecera.tipo || '').trim().toUpperCase()
    const sucOrigen = sucursalOrigen || detalle.sucursal_origen || cabecera.sucursal_origen || ''
    const sucDestino = sucursalDestino || detalle.sucursal_destino || cabecera.sucursal_destino || ''
    const cantidadLinea = Number(detalle.cantidad || cantidad) || 0
    const productoIdLinea = detalle.producto_id || productoId || ''

    // Revertir el efecto de stock de esta línea
    if (tipoMov === 'ENTRADA') {
      InventarioService._ajustarStock(productoIdLinea, sucDestino || sucOrigen, -cantidadLinea)
    } else if (tipoMov === 'SALIDA') {
      InventarioService._ajustarStock(productoIdLinea, sucOrigen || sucDestino, cantidadLinea)
    } else if (tipoMov === 'TRANSFERENCIA') {
      InventarioService._ajustarStock(productoIdLinea, sucOrigen, cantidadLinea)
      InventarioService._ajustarStock(productoIdLinea, sucDestino, -cantidadLinea)
    }

    // Eliminar la línea
    Sheets.delete(this.SHEET_MOVIMIENTOS, detalleId)

    // Actualizar fecha de la cabecera
    const now = new Date().toISOString()
    Sheets.update(this.SHEET_CABECERA, cabeceraId, { fecha_actualizacion: now })

    this._invalidateCatalogCaches({ sucursalOrigen: sucOrigen, sucursalDestino: sucDestino })

    LogService.registrar(session.userId, 'DELETE', this.SHEET_MOVIMIENTOS, sucOrigen || sucDestino || null,
      'Línea eliminada: ' + detalleId + ' en cabecera: ' + cabeceraId)

    return { deleted: true, detalleId: detalleId }
  },
}
