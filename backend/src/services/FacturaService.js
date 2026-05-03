// =============================================================
// FacturaService.gs — Facturación, notas de crédito y PDF
// =============================================================

const FacturaService = {

  getAll(payload, session) {
    const { sucursalId, estado, tipo, desde, hasta } = payload || {}

    // Validar acceso a la sucursal
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== (sucursalId || session.sucursalId)) {
        throw new Error('Acceso no autorizado')
      }
    }

    let facturas = Sheets.getAll('Facturas')

    const filtroSucursal = sucursalId || (
      session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR'
        ? session.sucursalId : null
    )
    if (filtroSucursal) {
      facturas = facturas.filter(f => String(f.sucursal_id) === String(filtroSucursal))
    }
    if (estado)  facturas = facturas.filter(f => f.estado === estado)
    if (tipo)    facturas = facturas.filter(f => f.tipo === tipo)
    if (desde)   facturas = facturas.filter(f => f.fecha >= desde)
    if (hasta)   facturas = facturas.filter(f => f.fecha <= hasta)

    return facturas
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .map(this._mapear)
  },

  getById(payload) {
    const factura = Sheets.getBy('Facturas', 'id', payload.id)
    if (!factura) throw new Error('Factura no encontrada: ' + payload.id)

    const detalles = Sheets.getAll('DetalleFactura')
      .filter(d => String(d.factura_id) === String(payload.id))

    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    return {
      ...this._mapear(factura),
      detalles: detalles.map(d => ({
        id: d.id,
        productoId: d.producto_id,
        productoNombre: (productosMap[d.producto_id] || {}).nombre || '',
        productoSku: (productosMap[d.producto_id] || {}).sku || '',
        cantidad: Number(d.cantidad) || 0,
        precioUnitario: Number(d.precio_unitario) || 0,
        subtotal: Number(d.subtotal) || 0,
      })),
    }
  },

  /**
   * Crea una factura desde el POS.
   * payload.items: [{ productoId, cantidad, precioUnitario }]
   */
  create(payload, session) {
    const { cliente, sucursalId, items, tipo, notas } = payload

    if (!items || !items.length) throw new Error('La factura debe tener al menos un ítem')
    if (!sucursalId) throw new Error('sucursalId es requerido')

    // Validar acceso
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR' &&
        session.rol !== 'VENDEDOR') {
      throw new Error('Sin permiso para emitir facturas')
    }
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== sucursalId) {
        throw new Error('Acceso no autorizado a esta sucursal')
      }
    }

    // Verificar stock y calcular totales
    const productosMap = {}
    Sheets.getAll('Productos').forEach(p => { productosMap[p.id] = p })

    let subtotal = 0
    const detallesValidados = []

    items.forEach(item => {
      const producto = productosMap[item.productoId]
      if (!producto) throw new Error('Producto no encontrado: ' + item.productoId)

      const stockItem = InventarioService.getStockProducto({
        productoId: item.productoId,
        sucursalId: sucursalId,
      })
      if (stockItem.stockActual < Number(item.cantidad)) {
        throw new Error(
          `Stock insuficiente para ${producto.nombre}. ` +
          `Disponible: ${stockItem.stockActual}, Solicitado: ${item.cantidad}`
        )
      }

      const itemSubtotal = Number(item.cantidad) * Number(item.precioUnitario)
      subtotal += itemSubtotal
      detallesValidados.push({ ...item, subtotal: itemSubtotal, producto })
    })

    // Calcular IVA
    const ivaConfig = Sheets.getBy('Config', 'clave', 'iva_porcentaje')
    const ivaPct = Number((ivaConfig || {}).valor) || 0
    const impuesto = Math.round(subtotal * (ivaPct / 100) * 100) / 100
    const total = subtotal + impuesto

    // Generar número de factura correlativo
    const facturas = Sheets.getAll('Facturas')
    const numero = 'F-' + String(facturas.length + 1).padStart(6, '0')

    const facturaId = Sheets.generateId()
    const factura = {
      id: facturaId,
      numero: numero,
      tipo: tipo || 'FACTURA',
      cliente: cliente || 'Sin nombre',
      sucursal_id: sucursalId,
      fecha: new Date().toISOString(),
      subtotal: subtotal,
      impuesto: impuesto,
      total: total,
      estado: 'EMITIDA',
      usuario_id: session.userId,
      notas: notas || '',
    }

    Sheets.insert('Facturas', factura)

    // Insertar detalles y descontar inventario
    detallesValidados.forEach(d => {
      Sheets.insert('DetalleFactura', {
        id: Sheets.generateId(),
        factura_id: facturaId,
        producto_id: d.productoId,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precioUnitario),
        subtotal: d.subtotal,
      })

      // Salida automática de inventario
      InventarioService._ajustarStock(d.productoId, sucursalId, -Number(d.cantidad))
      MovimientoService._insertar({
        tipo: 'SALIDA',
        productoId: d.productoId,
        sucursalOrigen: sucursalId,
        sucursalDestino: null,
        cantidad: Number(d.cantidad),
        referencia: numero,
        usuarioId: session.userId,
        notas: 'Venta: ' + numero,
      })

      // Verificar alertas de stock
      const stockResultante = InventarioService.getStockProducto({
        productoId: d.productoId, sucursalId,
      }).stockActual
      AlertaService.verificarStockMinimo(d.productoId, sucursalId, stockResultante)
    })

    // Invalidar cache
    CatalogoService.invalidarCache(sucursalId)

    LogService.registrar(session.userId, 'CREATE', 'Facturas', sucursalId,
      `Factura emitida: ${numero} — Total: ${total}`)

    return this.getById({ id: facturaId })
  },

  /**
   * Anula una factura y revierte el inventario.
   */
  anular(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Solo Admin/Supervisor pueden anular facturas')
    }

    const factura = Sheets.getBy('Facturas', 'id', payload.id)
    if (!factura) throw new Error('Factura no encontrada: ' + payload.id)
    if (factura.estado === 'ANULADA') throw new Error('La factura ya está anulada')

    Sheets.update('Facturas', payload.id, { estado: 'ANULADA' })

    // Revertir inventario
    const detalles = Sheets.getAll('DetalleFactura')
      .filter(d => String(d.factura_id) === String(payload.id))

    detalles.forEach(d => {
      InventarioService._ajustarStock(d.producto_id, factura.sucursal_id, Number(d.cantidad))
      MovimientoService._insertar({
        tipo: 'ENTRADA',
        productoId: d.producto_id,
        sucursalOrigen: null,
        sucursalDestino: factura.sucursal_id,
        cantidad: Number(d.cantidad),
        referencia: factura.numero,
        usuarioId: session.userId,
        notas: 'Anulación: ' + factura.numero,
      })
    })

    CatalogoService.invalidarCache(factura.sucursal_id)
    LogService.registrar(session.userId, 'ANULAR', 'Facturas', factura.sucursal_id,
      'Factura anulada: ' + factura.numero)

    return true
  },

  /**
   * Genera el HTML de una factura para impresión / PDF.
   */
  generarHtml(payload) {
    const factura = FacturaService.getById({ id: payload.id })
    if (!factura) throw new Error('Factura no encontrada')

    const sucursal = Sheets.getBy('Sucursales', 'id', factura.sucursalId)
    const config = {}
    Sheets.getAll('Config').forEach(c => { config[c.clave] = c.valor })

    const filas = factura.detalles.map(d => `
      <tr>
        <td>${d.productoSku}</td>
        <td>${d.productoNombre}</td>
        <td style="text-align:center">${d.cantidad}</td>
        <td style="text-align:right">${Number(d.precioUnitario).toFixed(2)}</td>
        <td style="text-align:right"><strong>${Number(d.subtotal).toFixed(2)}</strong></td>
      </tr>`).join('')

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Factura ${factura.numero}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;margin:0;padding:20px}
  .header{display:flex;justify-content:space-between;margin-bottom:20px}
  .empresa{font-size:18px;font-weight:bold;color:#1565c0}
  .factura-num{font-size:20px;font-weight:900;color:#1565c0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .info-box{background:#f5f7fa;border-radius:8px;padding:10px}
  .info-label{font-size:10px;color:#6b7a99;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#1565c0;color:white;padding:8px;text-align:left;font-size:11px}
  td{padding:7px 8px;border-bottom:1px solid #e0e7ef}
  tr:nth-child(even){background:#f5f7fa}
  .totales{display:flex;justify-content:flex-end}
  .totales-tabla{width:280px}
  .totales-tabla td{padding:5px 8px}
  .total-final{font-size:16px;font-weight:900;color:#1565c0}
  .estado{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:11px}
  .EMITIDA{background:#e8f5e9;color:#2e7d32}
  .ANULADA{background:#ffebee;color:#c62828;text-decoration:line-through}
  @media print{body{padding:10px}}
</style></head><body>
<div class="header">
  <div>
    <div class="empresa">${config.app_nombre || 'SGI Inventarios'}</div>
    <div>${(sucursal || {}).nombre || ''} — ${(sucursal || {}).ciudad || ''}</div>
    <div>${(sucursal || {}).telefono || ''}</div>
  </div>
  <div style="text-align:right">
    <div class="factura-num">${factura.numero}</div>
    <div>${factura.tipo}</div>
    <div><span class="estado ${factura.estado}">${factura.estado}</span></div>
  </div>
</div>
<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Cliente</div>
    <div><strong>${factura.cliente}</strong></div>
  </div>
  <div class="info-box">
    <div class="info-label">Fecha de emisión</div>
    <div>${new Date(factura.fecha).toLocaleString('es-BO')}</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>SKU</th><th>Producto</th>
    <th style="text-align:center">Cant.</th>
    <th style="text-align:right">P. Unit.</th>
    <th style="text-align:right">Subtotal</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="totales">
  <table class="totales-tabla">
    <tr><td>Subtotal</td><td style="text-align:right">${config.moneda || 'BOB'} ${Number(factura.subtotal).toFixed(2)}</td></tr>
    <tr><td>IVA (${config.iva_porcentaje || 0}%)</td><td style="text-align:right">${config.moneda || 'BOB'} ${Number(factura.impuesto).toFixed(2)}</td></tr>
    <tr class="total-final"><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>${config.moneda || 'BOB'} ${Number(factura.total).toFixed(2)}</strong></td></tr>
  </table>
</div>
${factura.notas ? `<div style="margin-top:12px;color:#6b7a99;font-size:11px">Notas: ${factura.notas}</div>` : ''}
</body></html>`
  },

  _mapear(f) {
    return {
      id: f.id,
      numero: f.numero,
      tipo: f.tipo || 'FACTURA',
      cliente: f.cliente || 'Sin nombre',
      sucursalId: f.sucursal_id,
      fecha: f.fecha || '',
      subtotal: Number(f.subtotal) || 0,
      impuesto: Number(f.impuesto) || 0,
      total: Number(f.total) || 0,
      estado: f.estado || 'EMITIDA',
      usuarioId: f.usuario_id || '',
      notas: f.notas || '',
    }
  },
}
