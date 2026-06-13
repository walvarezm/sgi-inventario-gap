// =============================================================
// InventarioService.gs — Gestión de stock y precios por sucursal
// =============================================================

const InventarioService = {

  /**
   * Retorna todo el stock de una sucursal con datos del producto enriquecidos.
   * Los precios se resuelven desde el ítem de inventario:
   *   - precio_usa_base = TRUE  → precios del producto base
   *   - precio_usa_base = FALSE → precios propios de la sucursal
   */
  getStockPorSucursal(payload, session) {
    const { sucursalId } = payload
    if (!sucursalId) throw new Error('sucursalId es requerido')

    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado a la sucursal: ' + sucursalId)
      }
    }

    const inventario = Sheets.getAll('Inventario')
      .filter(i => String(i.sucursal_id) === String(sucursalId))

    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    return inventario.map(i => {
      const p = productosMap[i.producto_id] || {}
      const precios = this._resolverPrecios(i, p)
      return {
        id: i.id,
        productoId: i.producto_id,
        sucursalId: i.sucursal_id,
        stockActual: Number(i.stock_actual) || 0,
        stockMinimo: Number(p.stock_minimo) || 0,
        stockBajo: (Number(i.stock_actual) || 0) <= (Number(p.stock_minimo) || 0),
        // Precios resueltos (base o propios)
        precioOfrecido: precios.precioOfrecido,
        precioFinal: precios.precioFinal,
        precioUsaBase: precios.precioUsaBase,
        fechaPrecio: i.fecha_precio || '',
        fechaActualizacion: i.fecha_actualizacion || '',
        // Datos del producto
        sku: p.sku || '',
        nombre: p.nombre || '',
        marca: p.marca || '',
        marcaId: p.marca_id || '',
        categoriaId: p.categoria_id || '',
        unidad: p.unidad || '',
        imagenUrl: p.imagen_url || '',
        imagenLocation: p.imagen_url ? 'drive' : 'local',
      }
    })
  },

  /**
   * Retorna el stock de un producto específico en una sucursal.
   */
  getStockProducto(payload) {
    const { productoId, sucursalId } = payload
    const item = Sheets.getAll('Inventario').find(
      i => String(i.producto_id) === String(productoId) &&
           String(i.sucursal_id) === String(sucursalId)
    )
    if (!item) {
      return { id: null, productoId, sucursalId, stockActual: 0, fechaActualizacion: null,
        precioOfrecido: 0, precioFinal: 0, precioUsaBase: true, fechaPrecio: null }
    }
    const p = Sheets.getBy('Productos', 'id', productoId) || {}
    const precios = this._resolverPrecios(item, p)
    return {
      id: item.id,
      productoId: item.producto_id,
      sucursalId: item.sucursal_id,
      stockActual: Number(item.stock_actual) || 0,
      precioOfrecido: precios.precioOfrecido,
      precioFinal: precios.precioFinal,
      precioUsaBase: precios.precioUsaBase,
      fechaPrecio: item.fecha_precio || '',
      fechaActualizacion: item.fecha_actualizacion || '',
    }
  },

  /**
   * Retorna un resumen de alertas de stock bajo para una sucursal.
   */
  getAlertasStock(payload, session) {
    const { sucursalId } = payload
    const stock = InventarioService.getStockPorSucursal({ sucursalId }, session)
    return stock.filter(s => s.stockBajo)
  },

  /**
   * Actualiza los precios de un ítem de inventario para una sucursal específica.
   * Si precioUsaBase = true, sincroniza con el producto base y marca la fila.
   * Si precioUsaBase = false, registra precios independientes.
   * Requiere permiso inventario.editar_precios.
   */
  updatePreciosSucursal(payload, session) {
    AccessService.assert(session, 'inventario.editar_precios', 'Sin permiso para editar precios por sucursal')

    const { productoId, sucursalId, precioOfrecido, precioFinal, precioUsaBase } = payload
    if (!productoId) throw new Error('productoId es requerido')
    if (!sucursalId) throw new Error('sucursalId es requerido')

    const producto = Sheets.getBy('Productos', 'id', productoId)
    if (!producto) throw new Error('Producto no encontrado: ' + productoId)

    const usaBase = precioUsaBase === true || precioUsaBase === 'true'
    const ahora = new Date().toISOString()

    // Si usa base, tomar los precios del producto base
    const precioOfrecidoFinal = usaBase
      ? (Number(producto.precio_ofrecido) || 0)
      : (Number(precioOfrecido) || 0)
    const precioFinalFinal = usaBase
      ? (Number(producto.precio_final) || 0)
      : (Number(precioFinal) || 0)

    const item = Sheets.getAll('Inventario').find(
      i => String(i.producto_id) === String(productoId) &&
           String(i.sucursal_id) === String(sucursalId)
    )

    const cambiosPrecio = {
      precio_ofrecido: precioOfrecidoFinal,
      precio_final: precioFinalFinal,
      precio_usa_base: usaBase,
      fecha_precio: ahora,
      fecha_actualizacion: ahora,
    }

    if (item) {
      Sheets.update('Inventario', item.id, cambiosPrecio)
    } else {
      // Crear fila de inventario con stock 0
      Sheets.insert('Inventario', {
        id: Sheets.generateId(),
        producto_id: productoId,
        sucursal_id: sucursalId,
        stock_actual: 0,
        ...cambiosPrecio,
      })
    }

    LogService.registrar(
      session.userId, 'UPDATE_PRECIOS', 'Inventario', sucursalId,
      'Precios actualizados para producto ' + productoId + ' en sucursal ' + sucursalId +
      ' | ofrecido=' + precioOfrecidoFinal + ' | final=' + precioFinalFinal +
      ' | usaBase=' + usaBase
    )

    return {
      productoId,
      sucursalId,
      precioOfrecido: precioOfrecidoFinal,
      precioFinal: precioFinalFinal,
      precioUsaBase: usaBase,
      fechaPrecio: ahora,
    }
  },

  /**
   * Sincroniza los precios del producto base a TODAS las sucursales
   * que tengan precio_usa_base = TRUE (o sin precio propio aún).
   * Llamado internamente desde ProductoService.update.
   */
  sincronizarPreciosBase(productoId, precioOfrecido, precioFinal) {
    const ahora = new Date().toISOString()
    const filas = Sheets.getAll('Inventario').filter(
      i => String(i.producto_id) === String(productoId)
    )
    filas.forEach(i => {
      const usaBase = i.precio_usa_base === true || i.precio_usa_base === 'TRUE' ||
                      i.precio_usa_base === 1 || i.precio_usa_base === ''
      if (usaBase) {
        Sheets.update('Inventario', i.id, {
          precio_ofrecido: Number(precioOfrecido) || 0,
          precio_final: Number(precioFinal) || 0,
          precio_usa_base: true,
          fecha_precio: ahora,
          fecha_actualizacion: ahora,
        })
      }
    })
  },

  /**
   * Ajusta el stock de un producto en una sucursal.
   * Acepta opcionalmente precios para actualizar la fila de inventario.
   * Si la fila no existe, la crea con los precios del producto base.
   *
   * @param {string} productoId
   * @param {string} sucursalId
   * @param {number} delta - positivo = entrada, negativo = salida
   * @param {Object|null} precios - { precioOfrecido, precioFinal, precioUsaBase }
   */
  _ajustarStock(productoId, sucursalId, delta, precios) {
    const inventario = Sheets.getAll('Inventario')
    const item = inventario.find(
      i => String(i.producto_id) === String(productoId) &&
           String(i.sucursal_id) === String(sucursalId)
    )

    const ahora = new Date().toISOString()

    if (item) {
      const nuevoStock = Math.max(0, (Number(item.stock_actual) || 0) + delta)
      const cambios = {
        stock_actual: nuevoStock,
        fecha_actualizacion: ahora,
      }

      // Solo actualizar precios si se proveen explícitamente
      if (precios) {
        const usaBase = precios.precioUsaBase !== false
        cambios.precio_ofrecido = Number(precios.precioOfrecido) || 0
        cambios.precio_final    = Number(precios.precioFinal) || 0
        cambios.precio_usa_base = usaBase
        cambios.fecha_precio    = ahora
      }

      Sheets.update('Inventario', item.id, cambios)
      return nuevoStock
    } else {
      // Fila nueva: copiar precios del producto base y marcar precio_usa_base = TRUE
      const producto = Sheets.getBy('Productos', 'id', productoId) || {}
      const precioOfrecidoBase = Number(producto.precio_ofrecido) || 0
      const precioFinalBase    = Number(producto.precio_final) || 0

      // Si se proveen precios y son distintos al base → independiente
      let usaBase = true
      let precioOfrecidoFinal = precioOfrecidoBase
      let precioFinalFinal    = precioFinalBase

      if (precios) {
        const ofrecidoProvisto = Number(precios.precioOfrecido) || 0
        const finalProvisto    = Number(precios.precioFinal) || 0
        const sonDistintos = ofrecidoProvisto !== precioOfrecidoBase || finalProvisto !== precioFinalBase
        if (precios.precioUsaBase === false || sonDistintos) {
          usaBase = false
          precioOfrecidoFinal = ofrecidoProvisto || precioOfrecidoBase
          precioFinalFinal    = finalProvisto || precioFinalBase
        }
      }

      const nuevoItem = {
        id: Sheets.generateId(),
        producto_id: productoId,
        sucursal_id: sucursalId,
        stock_actual: Math.max(0, delta),
        precio_ofrecido: precioOfrecidoFinal,
        precio_final: precioFinalFinal,
        precio_usa_base: usaBase,
        fecha_precio: ahora,
        fecha_actualizacion: ahora,
      }
      Sheets.insert('Inventario', nuevoItem)
      return nuevoItem.stock_actual
    }
  },

  /**
   * Resuelve los precios efectivos de un ítem de inventario.
   * Si precio_usa_base = TRUE (o vacío), usa los del producto base.
   * Si precio_usa_base = FALSE, usa los del ítem propio.
   *
   * @param {Object} item  - fila de Inventario
   * @param {Object} prod  - fila de Productos
   * @returns {{ precioOfrecido, precioFinal, precioUsaBase }}
   */
  _resolverPrecios(item, prod) {
    const usaBase = item.precio_usa_base === true || item.precio_usa_base === 'TRUE' ||
                    item.precio_usa_base === 1 ||
                    item.precio_usa_base === '' || item.precio_usa_base === undefined ||
                    item.precio_usa_base === null
    if (usaBase) {
      return {
        precioOfrecido: Number(prod.precio_ofrecido) || 0,
        precioFinal:    Number(prod.precio_final) || 0,
        precioUsaBase:  true,
      }
    }
    return {
      precioOfrecido: Number(item.precio_ofrecido) || 0,
      precioFinal:    Number(item.precio_final) || 0,
      precioUsaBase:  false,
    }
  },
}
