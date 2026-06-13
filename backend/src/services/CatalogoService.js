// =============================================================
// CatalogoService.gs — Catálogo de productos por sucursal
// =============================================================

const CatalogoService = {

  getBySucursal(payload, session) {
    const sucursalId = payload.sucursal_id
    if (!sucursalId) throw new Error('sucursal_id es requerido')
    AccessService.assertInSucursal(session, 'catalogo.ver', sucursalId, 'Sin permiso para ver el catálogo de esta sucursal')

    const puedeEditarProductos = AccessService.can(session, 'productos.editar')

    const productos = Sheets.getAll('Productos').filter(p =>
      p.activo === true || p.activo === 'TRUE' || p.activo === 1
    )
    const inventario = Sheets.getAll('Inventario')

    // Construir mapa de filas de inventario por producto para la sucursal
    const inventarioMap = {}
    inventario
      .filter(i => String(i.sucursal_id) === String(sucursalId))
      .forEach(i => { inventarioMap[i.producto_id] = i })

    const resultado = productos.map(p => {
      const invItem = inventarioMap[p.id] || {}
      const stock   = Number(invItem.stock_actual) || 0

      // Resolver precios: propios de la sucursal o del producto base
      const precios = InventarioService._resolverPrecios(invItem, p)

      return {
        id:           p.id,
        sku:          p.sku,
        marcaId:      p.marca_id || '',
        marca:        p.marca || '',
        nombre:       p.nombre,
        descripcion:  p.descripcion || '',
        categoriaId:  p.categoria_id || '',
        precioCompra: puedeEditarProductos ? (Number(p.precio_compra) || 0) : undefined,
        precioOfrecido: precios.precioOfrecido,
        precioFinal:    precios.precioFinal,
        precioUsaBase:  precios.precioUsaBase,
        fechaPrecio:    invItem.fecha_precio || '',
        stock:          stock,
        imagenUrl:      p.imagen_url || '',
        imagenLocation: p.imagen_url ? 'drive' : 'local',
        qrCode:         p.qr_code || p.sku,
        stockBajo:      stock <= Number(p.stock_minimo || 0),
        stockMinimo:    p.stock_minimo || 0,
        sucursalId:     Object.keys(invItem).length ? sucursalId : '',
        productoSucursal: invItem,
      }
    })

    return resultado
  },

  /** Invalida el cache del catálogo de una sucursal */
  invalidarCache(sucursalId) {
    const cache = CacheService.getScriptCache()
    cache.remove('catalogo_' + sucursalId)
    cache.remove('catalogo_' + sucursalId + '_view')
    cache.remove('catalogo_' + sucursalId + '_edit')
  },
}
