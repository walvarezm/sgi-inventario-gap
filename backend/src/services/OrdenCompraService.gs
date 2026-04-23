// =============================================================
// OrdenCompraService.gs — Órdenes de compra y recepción de mercancía
// =============================================================

const OrdenCompraService = {

  getAll(payload, session) {
    const { sucursalId, estado, proveedorId } = payload || {}

    // Validar acceso
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== (sucursalId || session.sucursalId)) {
        throw new Error('Acceso no autorizado')
      }
    }

    let ordenes = Sheets.getAll('OrdenesCompra')

    if (sucursalId) ordenes = ordenes.filter(o => String(o.sucursal_id) === String(sucursalId))
    if (estado)     ordenes = ordenes.filter(o => o.estado === estado)
    if (proveedorId) ordenes = ordenes.filter(o => String(o.proveedor_id) === String(proveedorId))

    const proveedoresMap = {}
    Sheets.getAll('Proveedores').forEach(p => { proveedoresMap[p.id] = p })

    return ordenes
      .sort((a, b) => String(b.fecha_emision).localeCompare(String(a.fecha_emision)))
      .map(o => this._mapear(o, proveedoresMap))
  },

  getById(payload) {
    const orden = Sheets.getBy('OrdenesCompra', 'id', payload.id)
    if (!orden) throw new Error('Orden no encontrada: ' + payload.id)

    const detalles = Sheets.getAll('DetalleOrdenCompra')
      .filter(d => String(d.orden_id) === String(payload.id))

    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    return {
      ...this._mapear(orden, {}),
      detalles: detalles.map(d => ({
        id: d.id,
        productoId: d.producto_id,
        productoNombre: (productosMap[d.producto_id] || {}).nombre || '',
        productoSku: (productosMap[d.producto_id] || {}).sku || '',
        cantidadPedida: Number(d.cantidad_pedida) || 0,
        cantidadRecibida: Number(d.cantidad_recibida) || 0,
        precioUnitario: Number(d.precio_unitario) || 0,
        subtotal: Number(d.subtotal) || 0,
      })),
    }
  },

  create(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para crear órdenes de compra')
    }
    if (!payload.proveedorId) throw new Error('proveedorId es requerido')
    if (!payload.sucursalId)  throw new Error('sucursalId es requerido')
    if (!payload.detalles || !payload.detalles.length) {
      throw new Error('La orden debe tener al menos un producto')
    }

    // Generar número de orden correlativo
    const ordenes = Sheets.getAll('OrdenesCompra')
    const numero = 'OC-' + String(ordenes.length + 1).padStart(5, '0')

    // Calcular total
    const subtotal = payload.detalles.reduce(
      (sum, d) => sum + (Number(d.cantidadPedida) * Number(d.precioUnitario)), 0
    )

    const ordenId = Sheets.generateId()
    const orden = {
      id: ordenId,
      numero: numero,
      proveedor_id: payload.proveedorId,
      sucursal_id: payload.sucursalId,
      fecha_emision: new Date().toISOString(),
      fecha_estimada: payload.fechaEstimada || '',
      estado: 'PENDIENTE',
      subtotal: subtotal,
      total: subtotal,
      notas: payload.notas || '',
      usuario_id: session.userId,
    }

    Sheets.insert('OrdenesCompra', orden)

    // Insertar detalles
    payload.detalles.forEach(d => {
      Sheets.insert('DetalleOrdenCompra', {
        id: Sheets.generateId(),
        orden_id: ordenId,
        producto_id: d.productoId,
        cantidad_pedida: Number(d.cantidadPedida),
        cantidad_recibida: 0,
        precio_unitario: Number(d.precioUnitario),
        subtotal: Number(d.cantidadPedida) * Number(d.precioUnitario),
      })
    })

    LogService.registrar(session.userId, 'CREATE', 'OrdenesCompra', payload.sucursalId,
      'Orden creada: ' + numero + ' — Proveedor: ' + payload.proveedorId)

    return this.getById({ id: ordenId })
  },

  /**
   * Recepción de mercancía: registra cantidades recibidas y genera entradas de inventario.
   */
  recibirMercancia(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR' && session.rol !== 'BODEGUERO') {
      throw new Error('Sin permiso para recibir mercancía')
    }

    const { ordenId, detallesRecibidos, notas } = payload
    if (!ordenId) throw new Error('ordenId es requerido')
    if (!detallesRecibidos || !detallesRecibidos.length) {
      throw new Error('Debe especificar las cantidades recibidas')
    }

    const orden = Sheets.getBy('OrdenesCompra', 'id', ordenId)
    if (!orden) throw new Error('Orden no encontrada: ' + ordenId)
    if (orden.estado === 'COMPLETADA') throw new Error('Esta orden ya fue completada')
    if (orden.estado === 'CANCELADA')  throw new Error('Esta orden está cancelada')

    const detallesOrden = Sheets.getAll('DetalleOrdenCompra')
      .filter(d => String(d.orden_id) === String(ordenId))

    let todasRecibidas = true

    detallesRecibidos.forEach(dr => {
      const detalle = detallesOrden.find(d => String(d.id) === String(dr.detalleId))
      if (!detalle) return

      const cantRecibida = Number(dr.cantidadRecibida) || 0
      if (cantRecibida <= 0) return

      // Actualizar cantidad recibida en el detalle
      const totalRecibida = (Number(detalle.cantidad_recibida) || 0) + cantRecibida
      Sheets.update('DetalleOrdenCompra', detalle.id, {
        cantidad_recibida: totalRecibida,
      })

      // Registrar entrada de inventario automáticamente
      InventarioService._ajustarStock(detalle.producto_id, orden.sucursal_id, cantRecibida)
      MovimientoService._insertar({
        tipo: 'ENTRADA',
        productoId: detalle.producto_id,
        sucursalOrigen: null,
        sucursalDestino: orden.sucursal_id,
        cantidad: cantRecibida,
        referencia: orden.numero,
        usuarioId: session.userId,
        notas: 'Recepción OC: ' + orden.numero + (notas ? ' — ' + notas : ''),
      })

      // Invalidar cache del catálogo
      CatalogoService.invalidarCache(orden.sucursal_id)

      // Verificar si quedó pendiente
      if (totalRecibida < Number(detalle.cantidad_pedida)) todasRecibidas = false
    })

    // Actualizar estado de la orden
    const nuevoEstado = todasRecibidas ? 'COMPLETADA' : 'PARCIAL'
    Sheets.update('OrdenesCompra', ordenId, { estado: nuevoEstado })

    LogService.registrar(session.userId, 'RECEPCION', 'OrdenesCompra', orden.sucursal_id,
      'Recepción en ' + orden.numero + ' — Estado: ' + nuevoEstado)

    return this.getById({ id: ordenId })
  },

  cancelar(payload, session) {
    if (session.rol !== 'ADMINISTRADOR') {
      throw new Error('Solo el Administrador puede cancelar órdenes')
    }
    const orden = Sheets.getBy('OrdenesCompra', 'id', payload.id)
    if (!orden) throw new Error('Orden no encontrada: ' + payload.id)
    if (orden.estado === 'COMPLETADA') throw new Error('No se puede cancelar una orden completada')

    Sheets.update('OrdenesCompra', payload.id, { estado: 'CANCELADA' })
    LogService.registrar(session.userId, 'CANCEL', 'OrdenesCompra', orden.sucursal_id,
      'Orden cancelada: ' + orden.numero)
    return true
  },

  _mapear(o, proveedoresMap) {
    const prov = (proveedoresMap || {})[o.proveedor_id] || {}
    return {
      id: o.id,
      numero: o.numero,
      proveedorId: o.proveedor_id,
      proveedorNombre: prov.nombre || o.proveedor_id,
      sucursalId: o.sucursal_id,
      fechaEmision: o.fecha_emision || '',
      fechaEstimada: o.fecha_estimada || '',
      estado: o.estado || 'PENDIENTE',
      subtotal: Number(o.subtotal) || 0,
      total: Number(o.total) || 0,
      notas: o.notas || '',
      usuarioId: o.usuario_id || '',
    }
  },
}
