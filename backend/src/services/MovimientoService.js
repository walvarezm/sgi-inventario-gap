// =============================================================
// MovimientoService.gs — Entradas, salidas y transferencias
// =============================================================

const MovimientoService = {

  /**
   * Retorna el historial de movimientos de una sucursal con filtros opcionales.
   */
  getMovimientos(payload, session) {
    const { sucursalId, desde, hasta, tipo } = payload
    if (!sucursalId) throw new Error('sucursalId es requerido')

    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado a la sucursal: ' + sucursalId)
      }
    }

    let movimientos = Sheets.getAll('Movimientos').filter(m =>
      String(m.sucursal_origen) === String(sucursalId) ||
      String(m.sucursal_destino) === String(sucursalId)
    )

    if (tipo) movimientos = movimientos.filter(m => m.tipo === tipo)
    if (desde) movimientos = movimientos.filter(m => m.fecha >= desde)
    if (hasta) movimientos = movimientos.filter(m => m.fecha <= hasta)

    // Enriquecer con nombre de producto
    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    return movimientos
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .map(m => ({
        id: m.id,
        tipo: m.tipo,
        productoId: m.producto_id,
        productoNombre: (productosMap[m.producto_id] || {}).nombre || m.producto_id,
        productoSku: (productosMap[m.producto_id] || {}).sku || '',
        sucursalOrigen: m.sucursal_origen || null,
        sucursalDestino: m.sucursal_destino || null,
        cantidad: Number(m.cantidad) || 0,
        referencia: m.referencia || '',
        usuarioId: m.usuario_id,
        fecha: m.fecha,
        notas: m.notas || '',
      }))
  },

  /**
   * Registra una ENTRADA de stock (compra, recepción, ajuste positivo).
   */
  entrada(payload, session) {
    const { productoId, sucursalId, cantidad, referencia, notas } = payload
    this._validarMovimiento(productoId, sucursalId, cantidad)

    // Validar acceso a la sucursal
    this._validarAccesoSucursal(sucursalId, session)

    // Verificar que el producto existe
    const producto = Sheets.getBy('Productos', 'id', productoId)
    if (!producto) throw new Error('Producto no encontrado: ' + productoId)

    // Ajustar stock
    const stockResultante = InventarioService._ajustarStock(productoId, sucursalId, Number(cantidad))

    // Registrar movimiento
    const movimiento = this._insertar({
      tipo: 'ENTRADA',
      productoId,
      sucursalOrigen: null,
      sucursalDestino: sucursalId,
      cantidad: Number(cantidad),
      referencia: referencia || '',
      usuarioId: session.userId,
      notas: notas || '',
    })

    // Invalidar cache del catálogo
    CatalogoService.invalidarCache(sucursalId)

    LogService.registrar(session.userId, 'ENTRADA', 'Inventario', sucursalId,
      `${producto.nombre} [${producto.sku}]: +${cantidad} → stock=${stockResultante}`)

    return movimiento
  },

  /**
   * Registra una SALIDA de stock (venta, uso, baja).
   */
  salida(payload, session) {
    const { productoId, sucursalId, cantidad, referencia, notas } = payload
    this._validarMovimiento(productoId, sucursalId, cantidad)
    this._validarAccesoSucursal(sucursalId, session)

    const producto = Sheets.getBy('Productos', 'id', productoId)
    if (!producto) throw new Error('Producto no encontrado: ' + productoId)

    // Verificar stock disponible
    const stockItem = InventarioService.getStockProducto({ productoId, sucursalId })
    if (stockItem.stockActual < Number(cantidad)) {
      throw new Error(
        `Stock insuficiente. Disponible: ${stockItem.stockActual}, Solicitado: ${cantidad}`
      )
    }

    const stockResultante = InventarioService._ajustarStock(productoId, sucursalId, -Number(cantidad))

    const movimiento = this._insertar({
      tipo: 'SALIDA',
      productoId,
      sucursalOrigen: sucursalId,
      sucursalDestino: null,
      cantidad: Number(cantidad),
      referencia: referencia || '',
      usuarioId: session.userId,
      notas: notas || '',
    })

    CatalogoService.invalidarCache(sucursalId)

    LogService.registrar(session.userId, 'SALIDA', 'Inventario', sucursalId,
      `${producto.nombre} [${producto.sku}]: -${cantidad} → stock=${stockResultante}`)

    // Verificar alertas de stock
    AlertaService.verificarStockMinimo(productoId, sucursalId, stockResultante)

    return movimiento
  },

  /**
   * Registra una TRANSFERENCIA de stock entre sucursales.
   */
  transferir(payload, session) {
    const { productoId, sucursalOrigen, sucursalDestino, cantidad, notas } = payload

    if (!productoId) throw new Error('productoId es requerido')
    if (!sucursalOrigen) throw new Error('sucursalOrigen es requerida')
    if (!sucursalDestino) throw new Error('sucursalDestino es requerida')
    if (sucursalOrigen === sucursalDestino) throw new Error('Origen y destino no pueden ser iguales')
    if (!cantidad || Number(cantidad) <= 0) throw new Error('Cantidad debe ser mayor a 0')

    // Solo Admin/Supervisor pueden hacer transferencias
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para realizar transferencias entre sucursales')
    }

    const producto = Sheets.getBy('Productos', 'id', productoId)
    if (!producto) throw new Error('Producto no encontrado: ' + productoId)

    // Verificar stock en origen
    const stockOrigen = InventarioService.getStockProducto({ productoId, sucursalId: sucursalOrigen })
    if (stockOrigen.stockActual < Number(cantidad)) {
      throw new Error(
        `Stock insuficiente en origen. Disponible: ${stockOrigen.stockActual}, Solicitado: ${cantidad}`
      )
    }

    // Descontar en origen, agregar en destino
    InventarioService._ajustarStock(productoId, sucursalOrigen, -Number(cantidad))
    InventarioService._ajustarStock(productoId, sucursalDestino, Number(cantidad))

    const movimiento = this._insertar({
      tipo: 'TRANSFERENCIA',
      productoId,
      sucursalOrigen,
      sucursalDestino,
      cantidad: Number(cantidad),
      referencia: `TRANS-${Date.now()}`,
      usuarioId: session.userId,
      notas: notas || '',
    })

    CatalogoService.invalidarCache(sucursalOrigen)
    CatalogoService.invalidarCache(sucursalDestino)

    LogService.registrar(session.userId, 'TRANSFERENCIA', 'Inventario', sucursalOrigen,
      `${producto.sku}: ${cantidad} unidades → sucursal ${sucursalDestino}`)

    return movimiento
  },

  /** Inserta un movimiento en la hoja */
  _insertar(data) {
    const movimiento = {
      id: Sheets.generateId(),
      tipo: data.tipo,
      producto_id: data.productoId,
      sucursal_origen: data.sucursalOrigen || '',
      sucursal_destino: data.sucursalDestino || '',
      cantidad: data.cantidad,
      referencia: data.referencia,
      usuario_id: data.usuarioId,
      fecha: new Date().toISOString(),
      notas: data.notas,
    }
    Sheets.insert('Movimientos', movimiento)
    return {
      id: movimiento.id,
      tipo: movimiento.tipo,
      productoId: movimiento.producto_id,
      sucursalOrigen: movimiento.sucursal_origen || null,
      sucursalDestino: movimiento.sucursal_destino || null,
      cantidad: movimiento.cantidad,
      referencia: movimiento.referencia,
      usuarioId: movimiento.usuario_id,
      fecha: movimiento.fecha,
      notas: movimiento.notas,
    }
  },

  _validarMovimiento(productoId, sucursalId, cantidad) {
    if (!productoId) throw new Error('productoId es requerido')
    if (!sucursalId) throw new Error('sucursalId es requerida')
    if (!cantidad || Number(cantidad) <= 0) throw new Error('Cantidad debe ser mayor a 0')
  },

  _validarAccesoSucursal(sucursalId, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado a la sucursal: ' + sucursalId)
      }
    }
  },
}
