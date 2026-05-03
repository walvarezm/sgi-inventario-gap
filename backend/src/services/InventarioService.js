// =============================================================
// InventarioService.gs — Gestión de stock por sucursal
// =============================================================

const InventarioService = {

  /**
   * Retorna todo el stock de una sucursal con datos del producto enriquecidos.
   */
  getStockPorSucursal(payload, session) {
    const { sucursalId } = payload
    if (!sucursalId) throw new Error('sucursalId es requerido')

    // Validar acceso a la sucursal
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
      return {
        id: i.id,
        productoId: i.producto_id,
        sucursalId: i.sucursal_id,
        stockActual: Number(i.stock_actual) || 0,
        stockMinimo: Number(p.stock_minimo) || 0,
        stockBajo: (Number(i.stock_actual) || 0) <= (Number(p.stock_minimo) || 0),
        fechaActualizacion: i.fecha_actualizacion || '',
        // Datos del producto enriquecidos
        sku: p.sku || '',
        nombre: p.nombre || '',
        marca: p.marca || '',
        unidad: p.unidad || '',
        imagenUrl: p.imagen_url || '',
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
      return { id: null, productoId, sucursalId, stockActual: 0, fechaActualizacion: null }
    }
    return {
      id: item.id,
      productoId: item.producto_id,
      sucursalId: item.sucursal_id,
      stockActual: Number(item.stock_actual) || 0,
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
   * Ajusta el stock de un producto en una sucursal a un valor específico.
   * Crea la fila si no existe.
   */
  _ajustarStock(productoId, sucursalId, delta) {
    const inventario = Sheets.getAll('Inventario')
    const item = inventario.find(
      i => String(i.producto_id) === String(productoId) &&
           String(i.sucursal_id) === String(sucursalId)
    )

    const ahora = new Date().toISOString()

    if (item) {
      const nuevoStock = Math.max(0, (Number(item.stock_actual) || 0) + delta)
      Sheets.update('Inventario', item.id, {
        stock_actual: nuevoStock,
        fecha_actualizacion: ahora,
      })
      return nuevoStock
    } else {
      // Crear nueva fila de inventario
      const nuevoItem = {
        id: Sheets.generateId(),
        producto_id: productoId,
        sucursal_id: sucursalId,
        stock_actual: Math.max(0, delta),
        fecha_actualizacion: ahora,
      }
      Sheets.insert('Inventario', nuevoItem)
      return nuevoItem.stock_actual
    }
  },
}
