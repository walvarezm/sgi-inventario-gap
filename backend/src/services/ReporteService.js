// =============================================================
// ReporteService.gs — KPIs, reportes de ventas, stock y movimientos
// =============================================================

const ReporteService = {

  /**
   * KPIs del Dashboard para una sucursal o todas.
   * Retorna métricas clave en tiempo real.
   */
  getKPIs(payload, session) {
    const { sucursalId } = payload || {}

    // Validar acceso
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (sucursalId && session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado a la sucursal: ' + sucursalId)
      }
    }

    const filtroSucursal = sucursalId || (
      (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR')
        ? session.sucursalId : null
    )

    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

    // ── Facturas ──────────────────────────────────────────
    let facturas = Sheets.getAll('Facturas').filter(f => f.estado === 'EMITIDA')
    if (filtroSucursal) {
      facturas = facturas.filter(f => String(f.sucursal_id) === String(filtroSucursal))
    }

    const facturasHoy = facturas.filter(f => f.fecha >= inicioHoy)
    const facturasMes  = facturas.filter(f => f.fecha >= inicioMes)

    const ventasHoy = facturasHoy.reduce((s, f) => s + (Number(f.total) || 0), 0)
    const ventasMes  = facturasMes.reduce((s, f) => s + (Number(f.total) || 0), 0)

    // ── Inventario ────────────────────────────────────────
    let inventario = Sheets.getAll('Inventario')
    if (filtroSucursal) {
      inventario = inventario.filter(i => String(i.sucursal_id) === String(filtroSucursal))
    }

    const productos = Sheets.getAll('Productos').filter(
      p => p.activo === true || p.activo === 'TRUE' || p.activo === 1
    )
    const productosMap = {}
    productos.forEach(p => { productosMap[p.id] = p })

    let stockBajo = 0
    let valorInventario = 0
    inventario.forEach(i => {
      const p = productosMap[i.producto_id] || {}
      const stock = Number(i.stock_actual) || 0
      const minimo = Number(p.stock_minimo) || 0
      if (stock <= minimo) stockBajo++
      valorInventario += stock * (Number(p.precio_final) || 0)
    })

    // ── Movimientos hoy ───────────────────────────────────
    let movimientos = Sheets.getAll('Movimientos').filter(m => m.fecha >= inicioHoy)
    if (filtroSucursal) {
      movimientos = movimientos.filter(
        m => String(m.sucursal_origen) === String(filtroSucursal) ||
             String(m.sucursal_destino) === String(filtroSucursal)
      )
    }

    return {
      ventasHoy: Math.round(ventasHoy * 100) / 100,
      ventasMes: Math.round(ventasMes * 100) / 100,
      facturasCantidadHoy: facturasHoy.length,
      facturasCantidadMes: facturasMes.length,
      productosActivos: productos.length,
      stockBajo: stockBajo,
      valorInventario: Math.round(valorInventario * 100) / 100,
      movimientosHoy: movimientos.length,
      sucursalesActivas: Sheets.getAll('Sucursales').filter(
        s => s.activo === true || s.activo === 'TRUE'
      ).length,
    }
  },

  /**
   * Reporte de ventas agrupado por día o mes.
   */
  getReporteVentas(payload, session) {
    const { sucursalId, desde, hasta, agruparPor } = payload || {}

    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (sucursalId && session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado')
      }
    }

    const filtroSucursal = sucursalId || (
      (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR')
        ? session.sucursalId : null
    )

    let facturas = Sheets.getAll('Facturas').filter(f => f.estado === 'EMITIDA')
    if (filtroSucursal) {
      facturas = facturas.filter(f => String(f.sucursal_id) === String(filtroSucursal))
    }
    if (desde) facturas = facturas.filter(f => f.fecha >= desde)
    if (hasta)  facturas = facturas.filter(f => f.fecha <= hasta)

    // Agrupar por día o mes
    const agrupado = {}
    facturas.forEach(f => {
      const fecha = String(f.fecha || '')
      let clave
      if (agruparPor === 'mes') {
        clave = fecha.slice(0, 7) // YYYY-MM
      } else {
        clave = fecha.slice(0, 10) // YYYY-MM-DD
      }
      if (!agrupado[clave]) agrupado[clave] = { fecha: clave, total: 0, cantidad: 0 }
      agrupado[clave].total    += Number(f.total) || 0
      agrupado[clave].cantidad += 1
    })

    return Object.values(agrupado)
      .map(r => ({ ...r, total: Math.round(r.total * 100) / 100 }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  },

  /**
   * Top productos más vendidos.
   */
  getTopProductos(payload, session) {
    const { sucursalId, desde, hasta, limite } = payload || {}
    const top = Number(limite) || 10

    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (sucursalId && session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado')
      }
    }

    const filtroSucursal = sucursalId || (
      (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR')
        ? session.sucursalId : null
    )

    let facturas = Sheets.getAll('Facturas').filter(f => f.estado === 'EMITIDA')
    if (filtroSucursal) {
      facturas = facturas.filter(f => String(f.sucursal_id) === String(filtroSucursal))
    }
    if (desde) facturas = facturas.filter(f => f.fecha >= desde)
    if (hasta)  facturas = facturas.filter(f => f.fecha <= hasta)

    const facturaIds = new Set(facturas.map(f => f.id))
    const detalles = Sheets.getAll('DetalleFactura').filter(d => facturaIds.has(d.factura_id))

    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    const acumulado = {}
    detalles.forEach(d => {
      const pid = d.producto_id
      if (!acumulado[pid]) {
        const p = productosMap[pid] || {}
        acumulado[pid] = {
          productoId: pid,
          sku: p.sku || pid,
          nombre: p.nombre || pid,
          marca: p.marca || '',
          cantidadVendida: 0,
          totalVendido: 0,
        }
      }
      acumulado[pid].cantidadVendida += Number(d.cantidad) || 0
      acumulado[pid].totalVendido    += Number(d.subtotal) || 0
    })

    return Object.values(acumulado)
      .map(r => ({ ...r, totalVendido: Math.round(r.totalVendido * 100) / 100 }))
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, top)
  },

  /**
   * Reporte de stock actual con valorización.
   */
  getReporteStock(payload, session) {
    const { sucursalId } = payload || {}

    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (sucursalId && session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado')
      }
    }

    const filtroSucursal = sucursalId || (
      (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR')
        ? session.sucursalId : null
    )

    let inventario = Sheets.getAll('Inventario')
    if (filtroSucursal) {
      inventario = inventario.filter(i => String(i.sucursal_id) === String(filtroSucursal))
    }

    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    const categoriasMap = {}
    Sheets.getAll('Categorias').forEach(c => { categoriasMap[c.id] = c })

    return inventario.map(i => {
      const p = productosMap[i.producto_id] || {}
      const stock = Number(i.stock_actual) || 0
      const minimo = Number(p.stock_minimo) || 0
      const precioFinal = Number(p.precio_final) || 0
      const precioCompra = Number(p.precio_compra) || 0
      const cat = categoriasMap[p.categoria_id] || {}

      return {
        productoId: i.producto_id,
        sucursalId: i.sucursal_id,
        sku: p.sku || '',
        nombre: p.nombre || '',
        marca: p.marca || '',
        categoria: cat.nombre || '',
        unidad: p.unidad || '',
        stockActual: stock,
        stockMinimo: minimo,
        stockBajo: stock <= minimo,
        precioCompra: precioCompra,
        precioFinal: precioFinal,
        valorCosto: Math.round(stock * precioCompra * 100) / 100,
        valorVenta: Math.round(stock * precioFinal * 100) / 100,
        fechaActualizacion: i.fecha_actualizacion || '',
      }
    }).sort((a, b) => a.nombre.localeCompare(b.nombre))
  },

  /**
   * Reporte de movimientos de inventario con filtros.
   */
  getReporteMovimientos(payload, session) {
    return MovimientoService.getMovimientos(payload, session)
  },
}
