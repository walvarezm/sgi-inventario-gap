// =============================================================
// DocumentoVentaService.gs — Motor unificado de documentos de venta
// =============================================================

const DocumentoVentaService = {
  SHEET_FACTURAS: 'Facturas',
  SHEET_DETALLE: 'DetalleFactura',
  SHEET_PAGOS: 'PagosDocumento',

  TYPE_CONFIG: {
    FACTURA: {
      numeroPrefix: 'F-',
      permission: 'pos.vender_factura',
      requiresPayment: true,
      affectsStock: true,
      isFiscal: true,
      calculatesTax: true,
      printableTitle: 'Factura',
    },
    VENTA_SIN_FACTURA: {
      numeroPrefix: 'V-',
      permission: 'pos.vender_sin_factura',
      requiresPayment: true,
      affectsStock: true,
      isFiscal: false,
      calculatesTax: false,
      printableTitle: 'Venta sin factura',
    },
    PROFORMA: {
      numeroPrefix: 'P-',
      permission: 'pos.crear_proforma',
      requiresPayment: false,
      affectsStock: false,
      isFiscal: false,
      calculatesTax: false,
      printableTitle: 'Proforma',
    },
    COTIZACION: {
      numeroPrefix: 'C-',
      permission: 'pos.crear_cotizacion',
      requiresPayment: false,
      affectsStock: false,
      isFiscal: false,
      calculatesTax: false,
      printableTitle: 'Cotización',
    },
    NOTA_CREDITO: {
      numeroPrefix: 'NC-',
      permission: 'documentos.anular',
      requiresPayment: false,
      affectsStock: false,
      isFiscal: true,
      calculatesTax: false,
      printableTitle: 'Nota de crédito',
    },
  },

  VENTA_REAL_TYPES: ['FACTURA', 'VENTA_SIN_FACTURA'],
  CONVERTIBLE_TYPES: ['PROFORMA', 'COTIZACION'],
  CONVERSION_TARGETS: {
    PROFORMA: ['FACTURA', 'VENTA_SIN_FACTURA'],
    COTIZACION: ['FACTURA', 'VENTA_SIN_FACTURA'],
  },

  getAll(payload, session) {
    this._ensureSchema()
    this._assertPuedeVerDocumentos(session)

    const filtros = payload || {}
    let documentos = Sheets.getAll(this.SHEET_FACTURAS).map(row => this._normalizeHeaderRow(row))
    const filtroSucursal = filtros.sucursalId || (session && !session.isGlobal ? session.sucursalId : null)

    if (filtroSucursal) {
      documentos = documentos.filter(doc => String(doc.sucursal_id) === String(filtroSucursal))
      if (session) this._assertPuedeVerEnSucursal(session, filtroSucursal)
    }
    if (filtros.estado) documentos = documentos.filter(doc => doc.estado === filtros.estado)
    if (filtros.tipo) documentos = documentos.filter(doc => doc.tipo === this._normalizeType(filtros.tipo))
    if (filtros.desde) documentos = documentos.filter(doc => String(doc.fecha || '') >= String(filtros.desde))
    if (filtros.hasta) documentos = documentos.filter(doc => String(doc.fecha || '') <= String(filtros.hasta))

    return documentos
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
      .map(doc => this._mapear(doc))
  },

  getById(payload, session) {
    this._ensureSchema()
    const documento = Sheets.getBy(this.SHEET_FACTURAS, 'id', payload.id)
    if (!documento) throw new Error('Documento no encontrado: ' + payload.id)

    const normalized = this._normalizeHeaderRow(documento)
    if (session) {
      this._assertPuedeVerDocumentos(session)
      this._assertPuedeVerEnSucursal(session, normalized.sucursal_id)
    }

    const productosMap = {}
    Sheets.getAll('Productos').forEach(producto => { productosMap[producto.id] = producto })

    const detalles = Sheets.getAll(this.SHEET_DETALLE)
      .filter(d => String(d.factura_id) === String(payload.id))
      .map(d => {
        const producto = productosMap[d.producto_id] || {}
        return {
          id: d.id,
          documentoId: payload.id,
          productoId: d.producto_id,
          productoNombre: producto.nombre || '',
          productoSku: producto.sku || '',
          cantidad: this._num(d.cantidad),
          precioLista: this._num(d.precio_lista, this._num(d.precio_unitario)),
          precioUnitario: this._num(d.precio_unitario),
          descuentoTipo: d.descuento_tipo || 'NINGUNO',
          descuentoValor: this._num(d.descuento_valor),
          descuentoMonto: this._num(d.descuento_monto),
          subtotal: this._num(d.subtotal),
          notas: d.notas || '',
        }
      })

    const pagos = this._sheetExists(this.SHEET_PAGOS)
      ? Sheets.getAll(this.SHEET_PAGOS)
          .filter(p => String(p.documento_id) === String(payload.id))
          .map(p => ({
            id: p.id,
            documentoId: p.documento_id,
            metodoPago: p.metodo_pago || 'EFECTIVO',
            monto: this._num(p.monto),
            referencia: p.referencia || '',
            moneda: p.moneda || 'BOB',
            detalle: p.detalle || '',
            fecha: p.fecha || '',
            usuarioId: p.usuario_id || '',
          }))
      : []

    return {
      ...this._mapear(normalized),
      detalles: detalles,
      pagos: pagos,
    }
  },

  create(payload, session) {
    this._ensureSchema()

    const tipo = this._normalizeType(payload.tipo)
    const config = this._getTypeConfig(tipo)
    const sucursalId = payload.sucursalId
    const items = payload.items || []

    if (!sucursalId) throw new Error('sucursalId es requerido')
    if (!items.length) throw new Error('El documento debe tener al menos un ítem')

    this._assertPuedeCrear(session, tipo, sucursalId)

    const productosMap = {}
    Sheets.getAll('Productos').forEach(producto => { productosMap[producto.id] = producto })

    const detallesValidados = []
    let subtotal = 0
    let descuentoLineas = 0

    items.forEach(item => {
      const producto = productosMap[item.productoId]
      if (!producto) throw new Error('Producto no encontrado: ' + item.productoId)

      const cantidad = this._num(item.cantidad)
      if (cantidad <= 0) throw new Error('Cantidad inválida para ' + (producto.nombre || item.productoId))

      const precioLista = this._num(
        item.precioLista,
        this._num(producto.precio_ofrecido, this._num(producto.precio_final))
      )
      const precioUnitario = this._num(item.precioUnitario, this._num(producto.precio_final))
      const descuentoTipo = item.descuentoTipo || 'NINGUNO'
      const descuentoValor = this._num(item.descuentoValor)

      if (precioUnitario < 0) throw new Error('Precio inválido para ' + (producto.nombre || item.productoId))
      if (Math.abs(precioUnitario - this._num(producto.precio_final)) > 0.0001) {
        AccessService.assert(session, 'pos.editar_precio', 'Sin permiso para editar precio de venta')
      }

      const descuentoMonto = this._calcularDescuentoLinea(precioUnitario, cantidad, descuentoTipo, descuentoValor, item.descuentoMonto)
      if (descuentoMonto > 0 || descuentoTipo !== 'NINGUNO' || descuentoValor > 0) {
        AccessService.assert(session, 'pos.aplicar_descuento', 'Sin permiso para aplicar descuentos')
      }

      if (config.affectsStock) {
        const stock = InventarioService.getStockProducto({
          productoId: item.productoId,
          sucursalId: sucursalId,
        })
        if (this._num(stock.stockActual) < cantidad) {
          throw new Error(
            'Stock insuficiente para ' + (producto.nombre || item.productoId) +
            '. Disponible: ' + this._num(stock.stockActual) + ', solicitado: ' + cantidad
          )
        }
      }

      const subtotalLinea = this._round2((precioUnitario * cantidad) - descuentoMonto)
      subtotal += subtotalLinea
      descuentoLineas += descuentoMonto

      detallesValidados.push({
        productoId: item.productoId,
        producto: producto,
        cantidad: cantidad,
        precioLista: precioLista,
        precioUnitario: precioUnitario,
        descuentoTipo: descuentoTipo,
        descuentoValor: descuentoValor,
        descuentoMonto: descuentoMonto,
        subtotal: subtotalLinea,
        notas: item.notas || '',
      })
    })

    const descuentoGlobalTipo = payload.descuentoGlobalTipo || 'NINGUNO'
    const descuentoGlobalValor = this._num(payload.descuentoGlobalValor)
    const descuentoGlobalMonto = this._calcularDescuentoGlobal(subtotal, descuentoGlobalTipo, descuentoGlobalValor, payload.descuentoGlobalMonto)
    const baseImponible = this._round2(Math.max(0, subtotal - descuentoGlobalMonto))
    const impuesto = this._calcularImpuesto(baseImponible, config)
    const total = this._round2(baseImponible + impuesto)
    const pagos = this._normalizePagos(payload.pagos, total, config, session)
    const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0)
    const saldoPendiente = this._round2(Math.max(0, total - totalPagado))

    const documentoId = Sheets.generateId()
    const numero = this._generarNumero(tipo)
    const now = new Date().toISOString()
    const cliente = payload.cliente || {}
    const moneda = this._getConfigValue('moneda', 'BOB')

    Sheets.insert(this.SHEET_FACTURAS, {
      id: documentoId,
      numero: numero,
      tipo: tipo,
      cliente: cliente.nombre || 'Sin nombre',
      cliente_nit_ci: cliente.nitCi || '',
      cliente_telefono: cliente.telefono || '',
      cliente_email: cliente.email || '',
      sucursal_id: sucursalId,
      fecha: now,
      vigencia_hasta: payload.vigenciaHasta || '',
      moneda: moneda,
      subtotal: this._round2(subtotal),
      descuento_global_monto: descuentoGlobalMonto,
      descuento_global_porcentaje: descuentoGlobalTipo === 'PORCENTAJE' ? descuentoGlobalValor : 0,
      descuento_total: this._round2(descuentoLineas + descuentoGlobalMonto),
      impuesto: impuesto,
      total: total,
      saldo_pendiente: saldoPendiente,
      estado: 'EMITIDA',
      usuario_id: session.userId,
      notas: payload.notas || '',
      observaciones: payload.observaciones || '',
      documento_origen_id: payload.documentoOrigenId || '',
      requiere_pago: config.requiresPayment,
      afecta_stock: config.affectsStock,
      es_fiscal: config.isFiscal,
    })

    detallesValidados.forEach(detalle => {
      Sheets.insert(this.SHEET_DETALLE, {
        id: Sheets.generateId(),
        factura_id: documentoId,
        producto_id: detalle.productoId,
        cantidad: detalle.cantidad,
        precio_lista: detalle.precioLista,
        precio_unitario: detalle.precioUnitario,
        descuento_tipo: detalle.descuentoTipo,
        descuento_valor: detalle.descuentoValor,
        descuento_monto: detalle.descuentoMonto,
        subtotal: detalle.subtotal,
        notas: detalle.notas,
      })

      if (config.affectsStock) {
        InventarioService._ajustarStock(detalle.productoId, sucursalId, -detalle.cantidad)
        MovimientoService._insertar({
          tipo: 'SALIDA',
          productoId: detalle.productoId,
          sucursalOrigen: sucursalId,
          sucursalDestino: null,
          cantidad: detalle.cantidad,
          referencia: numero,
          usuarioId: session.userId,
          notas: config.printableTitle + ': ' + numero,
        })

        const stockResultante = InventarioService.getStockProducto({
          productoId: detalle.productoId,
          sucursalId: sucursalId,
        }).stockActual
        AlertaService.verificarStockMinimo(detalle.productoId, sucursalId, stockResultante)
      }
    })

    pagos.forEach(pago => {
      Sheets.insert(this.SHEET_PAGOS, {
        id: Sheets.generateId(),
        documento_id: documentoId,
        metodo_pago: pago.metodoPago,
        monto: pago.monto,
        referencia: pago.referencia || '',
        moneda: pago.moneda || moneda,
        detalle: pago.detalle || '',
        fecha: now,
        usuario_id: session.userId,
      })
    })

    CatalogoService.invalidarCache(sucursalId)
    LogService.registrar(
      session.userId,
      'CREATE',
      this.SHEET_FACTURAS,
      sucursalId,
      config.printableTitle + ' emitida: ' + numero + ' — Total: ' + total
    )

    return this.getById({ id: documentoId }, session)
  },

  anular(payload, session) {
    this._ensureSchema()
    this._assertPuedeAnular(session)

    const documento = Sheets.getBy(this.SHEET_FACTURAS, 'id', payload.id)
    if (!documento) throw new Error('Documento no encontrado: ' + payload.id)
    const normalized = this._normalizeHeaderRow(documento)

    if (normalized.estado === 'ANULADA') throw new Error('El documento ya está anulado')
    this._assertPuedeAnularEnSucursal(session, normalized.sucursal_id)

    Sheets.update(this.SHEET_FACTURAS, payload.id, { estado: 'ANULADA' })

    if (normalized.afecta_stock) {
      const detalles = Sheets.getAll(this.SHEET_DETALLE)
        .filter(d => String(d.factura_id) === String(payload.id))

      detalles.forEach(detalle => {
        const cantidad = this._num(detalle.cantidad)
        InventarioService._ajustarStock(detalle.producto_id, normalized.sucursal_id, cantidad)
        MovimientoService._insertar({
          tipo: 'ENTRADA',
          productoId: detalle.producto_id,
          sucursalOrigen: null,
          sucursalDestino: normalized.sucursal_id,
          cantidad: cantidad,
          referencia: normalized.numero,
          usuarioId: session.userId,
          notas: 'Anulación de ' + normalized.numero,
        })
      })

      CatalogoService.invalidarCache(normalized.sucursal_id)
    }

    LogService.registrar(
      session.userId,
      'ANULAR',
      this.SHEET_FACTURAS,
      normalized.sucursal_id,
      'Documento anulado: ' + normalized.numero
    )

    return true
  },

  convertir(payload, session) {
    this._ensureSchema()
    AccessService.assert(session, 'pos.convertir_documentos', 'Sin permiso para convertir documentos')

    const origen = this.getById({ id: payload.documentoOrigenId }, session)
    if (this.CONVERTIBLE_TYPES.indexOf(origen.tipo) === -1) {
      throw new Error('Solo se pueden convertir proformas o cotizaciones')
    }
    if (origen.estado !== 'EMITIDA') {
      throw new Error('Solo se pueden convertir documentos emitidos')
    }

    const tipoDestino = this._normalizeType(payload.tipoDestino)
    const targets = this.CONVERSION_TARGETS[origen.tipo] || []
    if (targets.indexOf(tipoDestino) === -1) {
      throw new Error('Conversión no permitida desde ' + origen.tipo + ' hacia ' + tipoDestino)
    }

    const documentoCreado = this.create({
      tipo: tipoDestino,
      sucursalId: origen.sucursalId,
      cliente: {
        nombre: origen.cliente || origen.clienteNombre,
        nitCi: origen.clienteNitCi || '',
        telefono: origen.clienteTelefono || '',
        email: origen.clienteEmail || '',
      },
      items: (origen.detalles || []).map(detalle => ({
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioLista: detalle.precioLista,
        precioUnitario: detalle.precioUnitario,
        descuentoTipo: detalle.descuentoTipo,
        descuentoValor: detalle.descuentoValor,
        descuentoMonto: detalle.descuentoMonto,
        subtotal: detalle.subtotal,
        notas: detalle.notas || '',
      })),
      descuentoGlobalMonto: origen.descuentoGlobalMonto,
      descuentoGlobalValor: origen.descuentoGlobalPorcentaje,
      descuentoGlobalTipo: origen.descuentoGlobalPorcentaje ? 'PORCENTAJE' : (origen.descuentoGlobalMonto ? 'MONTO' : 'NINGUNO'),
      notas: origen.notas || '',
      observaciones: origen.observaciones || '',
      pagos: payload.pagos || [],
      documentoOrigenId: origen.id,
    }, session)

    Sheets.update(this.SHEET_FACTURAS, origen.id, {
      estado: 'CONVERTIDA',
      observaciones: this._appendObservation(origen.observaciones, 'Convertida a ' + documentoCreado.numero),
    })

    LogService.registrar(
      session.userId,
      'CONVERTIR',
      this.SHEET_FACTURAS,
      origen.sucursalId,
      'Documento ' + origen.numero + ' convertido a ' + documentoCreado.numero
    )

    return documentoCreado
  },

  generarHtml(payload, session) {
    const documento = this.getById({ id: payload.id }, session)
    const tipoConfig = this._getTypeConfig(documento.tipo)
    const sucursal = Sheets.getBy('Sucursales', 'id', documento.sucursalId)
    const config = {}
    Sheets.getAll('Config').forEach(c => { config[c.clave] = c.valor })

    const filas = (documento.detalles || []).map(detalle => `
      <tr>
        <td>${detalle.productoSku}</td>
        <td>${detalle.productoNombre}</td>
        <td style="text-align:center">${detalle.cantidad}</td>
        <td style="text-align:right">${this._num(detalle.precioLista).toFixed(2)}</td>
        <td style="text-align:right">${this._num(detalle.precioUnitario).toFixed(2)}</td>
        <td style="text-align:right">${this._num(detalle.descuentoMonto).toFixed(2)}</td>
        <td style="text-align:right"><strong>${this._num(detalle.subtotal).toFixed(2)}</strong></td>
      </tr>`).join('')

    const pagosHtml = (documento.pagos || []).length
      ? `
      <div class="section-title">Pagos</div>
      <table>
        <thead>
          <tr>
            <th>Método</th>
            <th>Referencia</th>
            <th style="text-align:right">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${(documento.pagos || []).map(pago => `
            <tr>
              <td>${pago.metodoPago}</td>
              <td>${pago.referencia || '-'}</td>
              <td style="text-align:right">${this._num(pago.monto).toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
      : ''

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${tipoConfig.printableTitle} ${documento.numero}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#1f2937;margin:0;padding:20px;background:#fff}
  .header{display:flex;justify-content:space-between;gap:24px;margin-bottom:20px}
  .empresa{font-size:18px;font-weight:700;color:#1d4ed8}
  .doc-num{font-size:22px;font-weight:800;color:#1d4ed8}
  .doc-type{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#64748b}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px}
  .label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
  .section-title{font-size:13px;font-weight:700;margin:16px 0 8px;color:#334155}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#1d4ed8;color:#fff;padding:8px;text-align:left;font-size:11px}
  td{padding:7px 8px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even){background:#f8fafc}
  .totales{display:flex;justify-content:flex-end}
  .totales table{width:320px}
  .total-final{font-size:16px;font-weight:800;color:#059669}
  .estado{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#e2e8f0;color:#334155}
  @media print{body{padding:10px}.box{break-inside:avoid}}
</style>
</head><body>
<div class="header">
  <div>
    <div class="empresa">${config.app_nombre || 'SGI Inventarios'}</div>
    <div>${(sucursal || {}).nombre || ''} — ${(sucursal || {}).ciudad || ''}</div>
    <div>${(sucursal || {}).telefono || ''}</div>
  </div>
  <div style="text-align:right">
    <div class="doc-num">${documento.numero}</div>
    <div class="doc-type">${tipoConfig.printableTitle}</div>
    <div class="estado">${documento.estado}</div>
  </div>
</div>
<div class="grid">
  <div class="box">
    <div class="label">Cliente</div>
    <div><strong>${documento.cliente || 'Sin nombre'}</strong></div>
    ${documento.clienteNitCi ? `<div>NIT/CI: ${documento.clienteNitCi}</div>` : ''}
    ${documento.clienteTelefono ? `<div>Teléfono: ${documento.clienteTelefono}</div>` : ''}
    ${documento.clienteEmail ? `<div>Email: ${documento.clienteEmail}</div>` : ''}
  </div>
  <div class="box">
    <div class="label">Documento</div>
    <div>Fecha: ${new Date(documento.fecha).toLocaleString('es-BO')}</div>
    ${documento.vigenciaHasta ? `<div>Vigencia: ${new Date(documento.vigenciaHasta).toLocaleDateString('es-BO')}</div>` : ''}
    ${documento.documentoOrigenId ? `<div>Origen: ${documento.documentoOrigenId}</div>` : ''}
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>SKU</th>
      <th>Producto</th>
      <th style="text-align:center">Cant.</th>
      <th style="text-align:right">P. Lista</th>
      <th style="text-align:right">P. Venta</th>
      <th style="text-align:right">Desc.</th>
      <th style="text-align:right">Subtotal</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>
${pagosHtml}
<div class="totales">
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${config.moneda || 'BOB'} ${this._num(documento.subtotal).toFixed(2)}</td></tr>
    <tr><td>Descuento total</td><td style="text-align:right">${config.moneda || 'BOB'} ${this._num(documento.descuentoTotal).toFixed(2)}</td></tr>
    <tr><td>Impuesto</td><td style="text-align:right">${config.moneda || 'BOB'} ${this._num(documento.impuesto).toFixed(2)}</td></tr>
    <tr class="total-final"><td><strong>Total</strong></td><td style="text-align:right"><strong>${config.moneda || 'BOB'} ${this._num(documento.total).toFixed(2)}</strong></td></tr>
    ${documento.saldoPendiente > 0 ? `<tr><td>Saldo pendiente</td><td style="text-align:right">${config.moneda || 'BOB'} ${this._num(documento.saldoPendiente).toFixed(2)}</td></tr>` : ''}
  </table>
</div>
${documento.notas ? `<div style="margin-top:12px;color:#64748b">Notas: ${documento.notas}</div>` : ''}
${documento.observaciones ? `<div style="margin-top:8px;color:#64748b">Observaciones: ${documento.observaciones}</div>` : ''}
</body></html>`
  },

  _mapear(row) {
    const normalized = this._normalizeHeaderRow(row)
    return {
      id: normalized.id,
      numero: normalized.numero,
      tipo: normalized.tipo,
      estado: normalized.estado,
      cliente: normalized.cliente || 'Sin nombre',
      clienteNombre: normalized.cliente || 'Sin nombre',
      clienteNitCi: normalized.cliente_nit_ci || '',
      clienteTelefono: normalized.cliente_telefono || '',
      clienteEmail: normalized.cliente_email || '',
      sucursalId: normalized.sucursal_id || '',
      fecha: normalized.fecha || '',
      vigenciaHasta: normalized.vigencia_hasta || '',
      moneda: normalized.moneda || this._getConfigValue('moneda', 'BOB'),
      subtotal: this._num(normalized.subtotal),
      descuentoGlobalMonto: this._num(normalized.descuento_global_monto),
      descuentoGlobalPorcentaje: this._num(normalized.descuento_global_porcentaje),
      descuentoTotal: this._num(normalized.descuento_total),
      impuesto: this._num(normalized.impuesto),
      total: this._num(normalized.total),
      saldoPendiente: this._num(normalized.saldo_pendiente),
      usuarioId: normalized.usuario_id || '',
      notas: normalized.notas || '',
      observaciones: normalized.observaciones || '',
      documentoOrigenId: normalized.documento_origen_id || '',
      requierePago: this._bool(normalized.requiere_pago, this._getTypeConfig(normalized.tipo).requiresPayment),
      afectaStock: this._bool(normalized.afecta_stock, this._getTypeConfig(normalized.tipo).affectsStock),
      esFiscal: this._bool(normalized.es_fiscal, this._getTypeConfig(normalized.tipo).isFiscal),
    }
  },

  _assertPuedeVerDocumentos(session) {
    if (!session) return
    if (!AccessService.can(session, 'documentos.ver') && !AccessService.can(session, 'facturas.ver')) {
      throw new Error('Sin permiso para ver documentos')
    }
  },

  _assertPuedeVerEnSucursal(session, sucursalId) {
    if (AccessService.can(session, 'documentos.ver')) {
      AccessService.assertInSucursal(session, 'documentos.ver', sucursalId, 'Acceso no autorizado')
      return
    }
    if (AccessService.can(session, 'facturas.ver')) {
      AccessService.assertInSucursal(session, 'facturas.ver', sucursalId, 'Acceso no autorizado')
      return
    }
    throw new Error('Sin permiso para ver documentos')
  },

  _assertPuedeAnular(session) {
    if (AccessService.can(session, 'documentos.anular')) return
    if (AccessService.can(session, 'facturas.anular')) return
    throw new Error('Sin permiso para anular documentos')
  },

  _assertPuedeAnularEnSucursal(session, sucursalId) {
    if (AccessService.can(session, 'documentos.anular')) {
      AccessService.assertInSucursal(session, 'documentos.anular', sucursalId, 'Acceso no autorizado')
      return
    }
    if (AccessService.can(session, 'facturas.anular')) {
      AccessService.assertInSucursal(session, 'facturas.anular', sucursalId, 'Acceso no autorizado')
      return
    }
    throw new Error('Sin permiso para anular documentos')
  },

  _assertPuedeCrear(session, tipo, sucursalId) {
    const config = this._getTypeConfig(tipo)
    const permission = config.permission
    if (permission && !AccessService.can(session, permission)) {
      if (tipo === 'FACTURA' && AccessService.can(session, 'facturas.emitir')) {
        AccessService.assertInSucursal(session, 'facturas.emitir', sucursalId, 'Acceso no autorizado a esta sucursal')
        return
      }
      if ((tipo === 'FACTURA' || tipo === 'VENTA_SIN_FACTURA') && AccessService.can(session, 'pos.vender')) {
        AccessService.assertInSucursal(session, 'pos.vender', sucursalId, 'Acceso no autorizado a esta sucursal')
        return
      }
      throw new Error('Sin permiso para crear ' + tipo)
    }
    AccessService.assertInSucursal(session, permission, sucursalId, 'Acceso no autorizado a esta sucursal')
  },

  _normalizePagos(pagos, total, config, session) {
    const moneda = this._getConfigValue('moneda', 'BOB')
    if (!config.requiresPayment) return []

    let pagosNormalizados = (pagos || []).map(pago => ({
      metodoPago: pago.metodoPago || 'EFECTIVO',
      monto: this._round2(this._num(pago.monto)),
      referencia: pago.referencia || '',
      moneda: pago.moneda || moneda,
      detalle: pago.detalle || '',
    })).filter(pago => pago.monto > 0 || pago.metodoPago === 'CREDITO')

    if (!pagosNormalizados.length) {
      pagosNormalizados = [{
        metodoPago: 'EFECTIVO',
        monto: this._round2(total),
        referencia: '',
        moneda: moneda,
        detalle: '',
      }]
    }

    const requiereMixto = pagosNormalizados.length > 1 || pagosNormalizados.some(pago => pago.metodoPago === 'MIXTO')
    if (requiereMixto) {
      AccessService.assert(session, 'pos.usar_pago_mixto', 'Sin permiso para usar pago mixto')
    }

    const totalPagado = this._round2(pagosNormalizados.reduce((sum, pago) => sum + pago.monto, 0))
    const usaCredito = pagosNormalizados.some(pago => pago.metodoPago === 'CREDITO')
    if (!usaCredito && Math.abs(totalPagado - this._round2(total)) > 0.01) {
      throw new Error('La suma de pagos debe coincidir con el total del documento')
    }
    if (usaCredito && totalPagado - this._round2(total) > 0.01) {
      throw new Error('Los pagos no pueden exceder el total del documento')
    }

    return pagosNormalizados
  },

  _calcularImpuesto(baseImponible, config) {
    if (!config.calculatesTax) return 0
    const ivaPct = this._num(this._getConfigValue('iva_porcentaje', 0))
    return this._round2(baseImponible * (ivaPct / 100))
  },

  _calcularDescuentoLinea(precioUnitario, cantidad, tipo, valor, montoFallback) {
    const base = this._round2(precioUnitario * cantidad)
    if (tipo === 'PORCENTAJE') {
      if (valor < 0 || valor > 100) throw new Error('El porcentaje de descuento debe estar entre 0 y 100')
      return this._round2(base * (valor / 100))
    }
    if (tipo === 'MONTO') {
      const monto = this._num(montoFallback, valor)
      if (monto < 0 || monto > base) throw new Error('El descuento no puede exceder el subtotal de la línea')
      return this._round2(monto)
    }
    return 0
  },

  _calcularDescuentoGlobal(subtotal, tipo, valor, montoFallback) {
    if (tipo === 'PORCENTAJE') {
      if (valor < 0 || valor > 100) throw new Error('El porcentaje de descuento global debe estar entre 0 y 100')
      return this._round2(subtotal * (valor / 100))
    }
    if (tipo === 'MONTO') {
      const monto = this._num(montoFallback, valor)
      if (monto < 0 || monto > subtotal) throw new Error('El descuento global no puede exceder el subtotal')
      return this._round2(monto)
    }
    return this._round2(this._num(montoFallback))
  },

  _generarNumero(tipo) {
    const config = this._getTypeConfig(tipo)
    const existentes = Sheets.getAll(this.SHEET_FACTURAS)
      .map(row => this._normalizeHeaderRow(row))
      .filter(row => row.tipo === tipo)
    return config.numeroPrefix + String(existentes.length + 1).padStart(6, '0')
  },

  _getTypeConfig(tipo) {
    const normalized = this._normalizeType(tipo)
    return this.TYPE_CONFIG[normalized] || this.TYPE_CONFIG.FACTURA
  },

  _normalizeType(tipo) {
    const code = String(tipo || 'FACTURA').trim().toUpperCase()
    return this.TYPE_CONFIG[code] ? code : 'FACTURA'
  },

  _normalizeHeaderRow(row) {
    const tipo = this._normalizeType(row.tipo)
    const config = this._getTypeConfig(tipo)
    return {
      id: row.id,
      numero: row.numero || '',
      tipo: tipo,
      cliente: row.cliente || 'Sin nombre',
      cliente_nit_ci: row.cliente_nit_ci || '',
      cliente_telefono: row.cliente_telefono || '',
      cliente_email: row.cliente_email || '',
      sucursal_id: row.sucursal_id || '',
      fecha: row.fecha || '',
      vigencia_hasta: row.vigencia_hasta || '',
      moneda: row.moneda || this._getConfigValue('moneda', 'BOB'),
      subtotal: row.subtotal,
      descuento_global_monto: row.descuento_global_monto,
      descuento_global_porcentaje: row.descuento_global_porcentaje,
      descuento_total: row.descuento_total,
      impuesto: row.impuesto,
      total: row.total,
      saldo_pendiente: row.saldo_pendiente,
      estado: row.estado || 'EMITIDA',
      usuario_id: row.usuario_id || '',
      notas: row.notas || '',
      observaciones: row.observaciones || '',
      documento_origen_id: row.documento_origen_id || '',
      requiere_pago: row.requiere_pago !== undefined ? row.requiere_pago : config.requiresPayment,
      afecta_stock: row.afecta_stock !== undefined ? row.afecta_stock : config.affectsStock,
      es_fiscal: row.es_fiscal !== undefined ? row.es_fiscal : config.isFiscal,
    }
  },

  _appendObservation(current, message) {
    const text = String(current || '').trim()
    if (!text) return message
    return text + ' | ' + message
  },

  _getConfigValue(clave, fallback) {
    const config = Sheets.getBy('Config', 'clave', clave)
    return config && config.valor !== undefined ? config.valor : fallback
  },

  _ensureSchema() {
    this._ensureSheet(
      this.SHEET_FACTURAS,
      [
        'id', 'numero', 'tipo', 'cliente', 'sucursal_id', 'fecha', 'subtotal', 'impuesto', 'total',
        'estado', 'usuario_id', 'notas', 'cliente_nit_ci', 'cliente_telefono', 'cliente_email',
        'vigencia_hasta', 'moneda', 'descuento_global_monto', 'descuento_global_porcentaje',
        'descuento_total', 'saldo_pendiente', 'observaciones', 'documento_origen_id',
        'requiere_pago', 'afecta_stock', 'es_fiscal',
      ]
    )
    this._ensureSheet(
      this.SHEET_DETALLE,
      [
        'id', 'factura_id', 'producto_id', 'cantidad', 'precio_unitario', 'subtotal',
        'precio_lista', 'descuento_tipo', 'descuento_valor', 'descuento_monto', 'notas',
      ]
    )
    this._ensureSheet(
      this.SHEET_PAGOS,
      ['id', 'documento_id', 'metodo_pago', 'monto', 'referencia', 'moneda', 'detalle', 'fecha', 'usuario_id']
    )
  },

  _ensureSheet(name, headers) {
    const spreadsheet = Sheets.getSpreadsheet()
    let sheet = spreadsheet.getSheetByName(name)
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name)
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      return
    }

    const lastColumn = Math.max(sheet.getLastColumn(), 1)
    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      .map(header => String(header || '').trim())
      .filter(Boolean)

    const missing = headers.filter(header => currentHeaders.indexOf(header) === -1)
    if (!missing.length) return

    missing.forEach(header => {
      sheet.insertColumnAfter(sheet.getLastColumn())
      sheet.getRange(1, sheet.getLastColumn()).setValue(header)
    })
  },

  _sheetExists(name) {
    try {
      return !!Sheets.getSpreadsheet().getSheetByName(name)
    } catch (_e) {
      return false
    }
  },

  _num(value, fallback) {
    const resolved = value !== undefined && value !== null && value !== '' ? value : fallback
    const number = Number(resolved)
    return isNaN(number) ? 0 : number
  },

  _bool(value, fallback) {
    if (value === undefined || value === null || value === '') return !!fallback
    if (value === true || value === 1 || String(value).toUpperCase() === 'TRUE') return true
    if (value === false || value === 0 || String(value).toUpperCase() === 'FALSE') return false
    return !!fallback
  },

  _round2(value) {
    return Math.round(this._num(value) * 100) / 100
  },
}
