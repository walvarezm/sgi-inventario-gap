// =============================================================
// main.gs — Router principal de la Web App SGI v1.1
// Actualizado Fase 7: Reportes y Dashboard
// =============================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond(400, 'Cuerpo de la petición vacío')
    }
    const body = JSON.parse(e.postData.contents)
    const { action, payload, token } = body
    if (!action) return respond(400, 'Acción requerida')

    if (action === 'login') {
      return respond(200, 'OK', Auth.login(payload.email, payload.password))
    }

    const session = Auth.verifyToken(token)

    const routes = {
      'verificarToken':          () => Auth.verifyToken(token),
      'getMiSesion':             () => Auth.verifyToken(token),
      // Seguridad
      'getUsuarios':             () => UsuarioService.getAll(payload, session),
      'getUsuarioById':          () => UsuarioService.getById(payload, session),
      'createUsuario':           () => UsuarioService.create(payload, session),
      'updateUsuario':           () => UsuarioService.update(payload, session),
      'deleteUsuario':           () => UsuarioService.remove(payload, session),
      'getRoles':                () => RolService.getAll(payload, session),
      'getRoleById':             () => RolService.getById(payload, session),
      'createRole':              () => RolService.create(payload, session),
      'updateRole':              () => RolService.update(payload, session),
      'deleteRole':              () => RolService.remove(payload, session),
      'getRolePermisos':         () => RolService.getPermisos(payload, session),
      'setRolePermisos':         () => RolService.setPermisos(payload, session),
      'getPermisos':             () => PermisoService.getAll(payload, session),
      // Sucursales
      'getSucursales':           () => SucursalService.getAll(),
      'getSucursalById':         () => SucursalService.getById(payload),
      'createSucursal':          () => SucursalService.create(payload, session),
      'updateSucursal':          () => SucursalService.update(payload, session),
      'deleteSucursal':          () => SucursalService.remove(payload, session),
      // Catálogo
      'getCatalogo':             () => CatalogoService.getBySucursal(payload, session),
      // Categorías
      'getCategorias':           () => CategoriaService.getAll(),
      'getCategoriaById':        () => CategoriaService.getById(payload),
      'createCategoria':         () => CategoriaService.create(payload, session),
      'updateCategoria':         () => CategoriaService.update(payload, session),
      // Marcas
      'getMarcas':               () => MarcaService.getAll(),
      'getMarcaById':            () => MarcaService.getById(payload),
      'createMarca':             () => MarcaService.create(payload, session),
      'updateMarca':             () => MarcaService.update(payload, session),
      // Productos
      'getProductos':            () => ProductoService.getAll(payload),
      'getProductoById':         () => ProductoService.getById(payload),
      'getProductoBySku':        () => ProductoService.getBySku(payload),
      'createProducto':          () => ProductoService.create(payload, session),
      'updateProducto':          () => ProductoService.update(payload, session),
      'deleteProducto':          () => ProductoService.remove(payload, session),
      'subirImagenProducto':     () => ProductoService.subirImagen(payload, session),
      'importarProductosMasivo': () => ProductoService.importarMasivo(payload, session),
      'importarStockInicial':    () => ProductoService.importarStockInicial(payload, session),
      'previewMigracionProductosSpreadsheet': () => MigracionProductoService.previewDesdeSpreadsheet(payload, session),
      'importarProductosSpreadsheet': () => MigracionProductoService.importarDesdeSpreadsheet(payload, session),
      // Inventario
      'getStockPorSucursal':     () => InventarioService.getStockPorSucursal(payload, session),
      'getStockProducto':        () => InventarioService.getStockProducto(payload),
      'getAlertasStock':         () => InventarioService.getAlertasStock(payload, session),
      // Movimientos
      'getMovimientos':          () => MovimientoService.getMovimientos(payload, session),
      'getMovimientosCabecera':  () => MovimientoService.getMovimientosCabecera(payload, session),
      'getMovimientoById':       () => MovimientoService.getMovimientoById(payload, session),
      'updateMovimiento':        () => MovimientoService.updateMovimiento(payload, session),
      'createMovimientoMasivo':  () => MovimientoService.createMovimientoMasivo(payload, session),
      'getMovimientoPlantillasReferencia': () => MovimientoService.getMovimientoPlantillasReferencia(),
      'registrarEntrada':        () => MovimientoService.entrada(payload, session),
      'registrarSalida':         () => MovimientoService.salida(payload, session),
      'transferir':              () => MovimientoService.transferir(payload, session),
      // Proveedores
      'getProveedores':          () => ProveedorService.getAll(payload),
      'getProveedorById':        () => ProveedorService.getById(payload),
      'createProveedor':         () => ProveedorService.create(payload, session),
      'updateProveedor':         () => ProveedorService.update(payload, session),
      'deleteProveedor':         () => ProveedorService.remove(payload, session),
      'getHistorialProveedor':   () => ProveedorService.getHistorial(payload),
      // Órdenes de Compra
      'getOrdenesCompra':        () => OrdenCompraService.getAll(payload, session),
      'getOrdenCompraById':      () => OrdenCompraService.getById(payload),
      'createOrdenCompra':       () => OrdenCompraService.create(payload, session),
      'recibirMercancia':        () => OrdenCompraService.recibirMercancia(payload, session),
      'cancelarOrdenCompra':     () => OrdenCompraService.cancelar(payload, session),
      // Facturación
      'getFacturas':             () => FacturaService.getAll(payload, session),
      'getFacturaById':          () => FacturaService.getById(payload, session),
      'createFactura':           () => FacturaService.create(payload, session),
      'anularFactura':           () => FacturaService.anular(payload, session),
      'generarHtmlFactura':      () => FacturaService.generarHtml(payload, session),
      // Documentos de venta
      'getDocumentosVenta':      () => DocumentoVentaService.getAll(payload, session),
      'getDocumentoVentaById':   () => DocumentoVentaService.getById(payload, session),
      'createDocumentoVenta':    () => DocumentoVentaService.create(payload, session),
      'anularDocumentoVenta':    () => DocumentoVentaService.anular(payload, session),
      'convertirDocumentoVenta': () => DocumentoVentaService.convertir(payload, session),
      'generarHtmlDocumentoVenta': () => DocumentoVentaService.generarHtml(payload, session),
      // ── FASE 7 — Reportes ──────────────────────────────
      'getKPIs':                 () => ReporteService.getKPIs(payload, session),
      'getReporteVentas':        () => ReporteService.getReporteVentas(payload, session),
      'getTopProductos':         () => ReporteService.getTopProductos(payload, session),
      'getReporteStock':         () => ReporteService.getReporteStock(payload, session),
      'getReporteMovimientos':   () => ReporteService.getReporteMovimientos(payload, session),
    }

    if (!routes[action]) return respond(404, 'Acción no encontrada: ' + action)
    const result = routes[action]()
    return respond(200, 'OK', result)

  } catch (err) {
    Logger.log('ERROR doPost: ' + err.message)
    const status = err.message.includes('Token') || err.message.includes('autorizado') ? 401 : 500
    return respond(status, err.message)
  }
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action
  if (!action || action === 'ping') {
    return respond(200, 'SGI API OK', {
      version: '1.1.0', timestamp: new Date().toISOString(), env: CONFIG.ENV,
    })
  }
  return respond(400, 'Usar POST para acciones de la API')
}
