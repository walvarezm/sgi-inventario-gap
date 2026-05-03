// =============================================================
// ProductoService.gs — CRUD completo de Productos con imagen y QR
// =============================================================

const ProductoService = {

  getAll(payload) {
    const soloActivos = !payload || payload.todos !== true
    let productos = Sheets.getAll('Productos')
    if (soloActivos) {
      productos = productos.filter(p => p.activo === true || p.activo === 'TRUE' || p.activo === 1)
    }
    return productos.map(this._mapear)
  },

  getById(payload) {
    const p = Sheets.getBy('Productos', 'id', payload.id)
    if (!p) throw new Error('Producto no encontrado: ' + payload.id)
    return this._mapear(p)
  },

  getBySku(payload) {
    const p = Sheets.getBy('Productos', 'sku', payload.sku)
    if (!p) throw new Error('Producto no encontrado con SKU: ' + payload.sku)
    return this._mapear(p)
  },

  create(payload, session) {
    this._validar(payload)
    this._validarSkuUnico(payload.sku)

    const id = Sheets.generateId()
    const nuevo = {
      id: id,
      sku: payload.sku.trim().toUpperCase(),
      marca: payload.marca || '',
      nombre: payload.nombre.trim(),
      descripcion: payload.descripcion || '',
      categoria_id: payload.categoriaId || '',
      unidad: payload.unidad || 'Unidad',
      precio_compra: Number(payload.precioCompra) || 0,
      precio_ofrecido: Number(payload.precioOfrecido) || 0,
      precio_final: Number(payload.precioFinal) || 0,
      stock_minimo: Number(payload.stockMinimo) || 0,
      imagen_url: payload.imagenUrl || '',
      qr_code: payload.qrCode || payload.sku.trim().toUpperCase(),
      activo: true,
      fecha_creacion: new Date().toISOString(),
    }

    Sheets.insert('Productos', nuevo)
    this._invalidarCachesCatalogo()
    LogService.registrar(session.userId, 'CREATE', 'Productos', null,
      'Producto creado: ' + nuevo.nombre + ' [' + nuevo.sku + ']')
    return this._mapear(nuevo)
  },

  update(payload, session) {
    if (!payload.id) throw new Error('ID de producto requerido')

    const existente = Sheets.getBy('Productos', 'id', payload.id)
    if (!existente) throw new Error('Producto no encontrado: ' + payload.id)

    if (payload.sku && payload.sku.toUpperCase() !== String(existente.sku).toUpperCase()) {
      this._validarSkuUnico(payload.sku)
    }

    const cambios = {}
    if (payload.sku !== undefined)           cambios.sku = payload.sku.trim().toUpperCase()
    if (payload.marca !== undefined)          cambios.marca = payload.marca
    if (payload.nombre !== undefined)         cambios.nombre = payload.nombre.trim()
    if (payload.descripcion !== undefined)    cambios.descripcion = payload.descripcion
    if (payload.categoriaId !== undefined)    cambios.categoria_id = payload.categoriaId
    if (payload.unidad !== undefined)         cambios.unidad = payload.unidad
    if (payload.precioCompra !== undefined)   cambios.precio_compra = Number(payload.precioCompra)
    if (payload.precioOfrecido !== undefined) cambios.precio_ofrecido = Number(payload.precioOfrecido)
    if (payload.precioFinal !== undefined)    cambios.precio_final = Number(payload.precioFinal)
    if (payload.stockMinimo !== undefined)    cambios.stock_minimo = Number(payload.stockMinimo)
    if (payload.imagenUrl !== undefined)      cambios.imagen_url = payload.imagenUrl
    if (payload.qrCode !== undefined)         cambios.qr_code = payload.qrCode
    if (payload.activo !== undefined)         cambios.activo = payload.activo

    const actualizado = Sheets.update('Productos', payload.id, cambios)
    this._invalidarCachesCatalogo()
    LogService.registrar(session.userId, 'UPDATE', 'Productos', null, 'ID: ' + payload.id)
    return this._mapear(actualizado)
  },

  remove(payload, session) {
    if (session.rol !== 'ADMINISTRADOR') {
      throw new Error('Solo el Administrador puede eliminar productos')
    }
    Sheets.update('Productos', payload.id, { activo: false })
    this._invalidarCachesCatalogo()
    LogService.registrar(session.userId, 'DELETE', 'Productos', null, 'ID: ' + payload.id)
    return true
  },

  subirImagen(payload, session) {
    if (!payload.base64) throw new Error('base64 es requerido')
    if (!payload.mimeType) throw new Error('mimeType es requerido')

    const folderId = CONFIG.DRIVE_IMAGENES
    if (!folderId) throw new Error('DRIVE_FOLDER_IMAGENES no configurado')

    const folder = DriveApp.getFolderById(folderId)
    const nombre = payload.nombre || ('producto_' + Date.now() + '.jpg')
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.base64), payload.mimeType, nombre
    )
    const file = folder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId()

    LogService.registrar(session.userId, 'UPLOAD', 'Productos', null, 'Imagen: ' + nombre)
    return url
  },

  _validar(payload) {
    if (!payload.sku || !payload.sku.trim()) throw new Error('SKU es requerido')
    if (!payload.nombre || !payload.nombre.trim()) throw new Error('Nombre es requerido')
    if (payload.precioFinal === undefined || payload.precioFinal === null) {
      throw new Error('Precio final es requerido')
    }
  },

  _validarSkuUnico(sku) {
    const existente = Sheets.getBy('Productos', 'sku', sku.trim().toUpperCase())
    if (existente) throw new Error('Ya existe un producto con el SKU: ' + sku)
  },

  _invalidarCachesCatalogo() {
    try {
      const sucursales = Sheets.getAll('Sucursales')
      const cache = CacheService.getScriptCache()
      sucursales.forEach(s => cache.remove('catalogo_' + s.id))
    } catch (e) {
      Logger.log('Error invalidando cache catalogo: ' + e.message)
    }
  },

  _mapear(p) {
    return {
      id: p.id,
      sku: p.sku,
      marca: p.marca || '',
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoriaId: p.categoria_id || '',
      unidad: p.unidad || 'Unidad',
      precioCompra: Number(p.precio_compra) || 0,
      precioOfrecido: Number(p.precio_ofrecido) || 0,
      precioFinal: Number(p.precio_final) || 0,
      stockMinimo: Number(p.stock_minimo) || 0,
      imagenUrl: p.imagen_url || '',
      qrCode: p.qr_code || p.sku,
      activo: p.activo === true || p.activo === 'TRUE' || p.activo === 1,
      fechaCreacion: p.fecha_creacion || '',
    }
  },
}
