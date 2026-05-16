// =============================================================
// CatalogoService.gs — Catálogo de productos por sucursal
// =============================================================

const CatalogoService = {

  getBySucursal(payload, session) {
    const sucursalId = payload.sucursal_id
    if (!sucursalId) throw new Error('sucursal_id es requerido')
    AccessService.assertInSucursal(session, 'catalogo.ver', sucursalId, 'Sin permiso para ver el catálogo de esta sucursal')

    const puedeEditarProductos = AccessService.can(session, 'productos.editar')

    // Usar cache de 5 minutos para mejorar performance
/*    const cacheKey = 'catalogo_' + sucursalId + '_' + (puedeEditarProductos ? 'edit' : 'view')
    const cache = CacheService.getScriptCache()
    const cached = cache.get(cacheKey)
    if (cached) return JSON.parse(cached)*/

    const productos = Sheets.getAll('Productos').filter(p =>
      p.activo === true || p.activo === 'TRUE' || p.activo === 1
    )
    const inventario = Sheets.getAll('Inventario')

    // Construir mapa de stock por producto para la sucursal
    const stockMap = {}
    inventario
      .filter(i => String(i.sucursal_id) === String(sucursalId))
      .forEach(i => {
        stockMap[i.producto_id] = Number(i.stock_actual) || 0
      })

    const resultado = productos.map(p => ({
      id: p.id,
      sku: p.sku,
      marcaId: p.marca_id || '',
      marca: p.marca || '',
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoriaId: p.categoria_id || '',
      precioCompra: puedeEditarProductos ? (Number(p.precio_compra) || 0) : undefined,
      precioOfrecido: Number(p.precio_ofrecido) || 0,
      precioFinal: Number(p.precio_final) || 0,
      stock: stockMap[p.id] !== undefined ? stockMap[p.id] : 0,
      imagenUrl: p.imagen_url || '',
      imagenLocation: p.imagen_url ? 'drive' : 'local',
      qrCode: p.qr_code || p.sku,
      stockBajo: (stockMap[p.id] || 0) <= Number(p.stock_minimo || 0),
      stockMinimo: p.stock_minimo || 0
    }))

    //cache.put(cacheKey, JSON.stringify(resultado), 600) // 5 minutos
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
