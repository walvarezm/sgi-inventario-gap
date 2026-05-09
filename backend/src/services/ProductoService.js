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
    AccessService.assert(session, 'productos.crear', 'Sin permiso para crear productos')
    this._validar(payload)
    this._validarSkuUnico(payload.sku)

    const nuevo = this._construirProducto(payload)

    Sheets.insert('Productos', nuevo)
    this._invalidarCachesCatalogo()
    LogService.registrar(session.userId, 'CREATE', 'Productos', null,
      'Producto creado: ' + nuevo.nombre + ' [' + nuevo.sku + ']')
    return this._mapear(nuevo)
  },

  update(payload, session) {
    AccessService.assert(session, 'productos.editar', 'Sin permiso para editar productos')
    if (!payload.id) throw new Error('ID de producto requerido')

    const existente = Sheets.getBy('Productos', 'id', payload.id)
    if (!existente) throw new Error('Producto no encontrado: ' + payload.id)

    if (payload.sku && payload.sku.toUpperCase() !== String(existente.sku).toUpperCase()) {
      this._validarSkuUnico(payload.sku)
    }

    const cambios = {}
    if (payload.sku !== undefined)           cambios.sku = payload.sku.trim().toUpperCase()
    if (payload.marcaId !== undefined)       cambios.marca_id = payload.marcaId
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

    const skuFinal = cambios.sku !== undefined ? cambios.sku : String(existente.sku || '').trim().toUpperCase()
    const marcaFinal = cambios.marca !== undefined ? cambios.marca : (existente.marca || '')
    const nombreFinal = cambios.nombre !== undefined ? cambios.nombre : (existente.nombre || '')
    const precioOfrecidoFinal = cambios.precio_ofrecido !== undefined
      ? Number(cambios.precio_ofrecido) || 0
      : Number(existente.precio_ofrecido) || 0
    const precioFinal = cambios.precio_final !== undefined
      ? Number(cambios.precio_final) || 0
      : Number(existente.precio_final) || 0

    if (payload.qrCode === undefined) {
      cambios.qr_code = this._generarQrTexto(skuFinal, marcaFinal, nombreFinal, precioOfrecidoFinal, precioFinal)
    }

    const actualizado = Sheets.update('Productos', payload.id, cambios)
    this._invalidarCachesCatalogo()
    LogService.registrar(session.userId, 'UPDATE', 'Productos', null, 'ID: ' + payload.id)
    return this._mapear(actualizado)
  },

  importarMasivo(payload, session) {
    this._validarPermisoImportacion(session)

    const filas = payload && payload.rows
    const dryRun = !!(payload && payload.dryRun)
    const mode = payload && payload.mode ? String(payload.mode) : 'upsert'

    if (!filas || !filas.length) throw new Error('No se recibieron filas para importar')

    const existentes = {}
    Sheets.getAll('Productos').forEach(p => {
      existentes[String(p.sku || '').trim().toUpperCase()] = p
    })

    const resultados = []
    const nuevos = []
    let creados = 0
    let actualizados = 0
    let omitidos = 0
    let errores = 0

    filas.forEach((raw, idx) => {
      const fila = this._normalizarFilaImportacion(raw)
      const linea = Number(fila.__rowNumber) || idx + 2

      try {
        this._validarFilaImportacion(fila)

        const categoria = fila.categoria
          ? CategoriaService.ensureByNombre(fila.categoria, session)
          : null
        const marca = fila.marca
          ? MarcaService.ensureByNombre(fila.marca, session)
          : null

        const payloadProducto = {
          sku: fila.sku,
          marcaId: marca ? marca.id : '',
          marca: marca ? marca.nombre : fila.marca,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          categoriaId: categoria ? categoria.id : '',
          unidad: fila.unidad || 'Unidad',
          precioCompra: fila.precioCompra,
          precioOfrecido: fila.precioOfrecido,
          precioFinal: fila.precioFinal,
          stockMinimo: fila.stockMinimo,
          imagenUrl: fila.imagenUrl,
          qrCode: this._generarQrTexto(
            fila.sku,
            marca ? marca.nombre : fila.marca,
            fila.nombre,
            fila.precioOfrecido,
            fila.precioFinal
          ),
          activo: fila.activo,
        }

        const existente = existentes[fila.sku]

        if (existente && mode === 'create_only') {
          omitidos++
          resultados.push({
            rowNumber: linea,
            sku: fila.sku,
            action: 'skipped',
            message: 'SKU existente, omitido por modo create_only',
          })
          return
        }

        if (!existente) {
          const nuevo = this._construirProducto(payloadProducto)
          if (!dryRun) {
            nuevos.push(nuevo)
            existentes[nuevo.sku] = nuevo
          }
          creados++
          resultados.push({
            rowNumber: linea,
            sku: fila.sku,
            action: 'created',
            message: 'Producto listo para crear',
          })
          return
        }

        if (mode === 'create_only') {
          omitidos++
          resultados.push({
            rowNumber: linea,
            sku: fila.sku,
            action: 'skipped',
            message: 'SKU existente, omitido',
          })
          return
        }

        if (!dryRun) {
          const cambios = {
            sku: payloadProducto.sku,
            marcaId: payloadProducto.marcaId,
            marca: payloadProducto.marca,
            nombre: payloadProducto.nombre,
            descripcion: payloadProducto.descripcion,
            categoriaId: payloadProducto.categoriaId,
            unidad: payloadProducto.unidad,
            precioCompra: payloadProducto.precioCompra,
            precioOfrecido: payloadProducto.precioOfrecido,
            precioFinal: payloadProducto.precioFinal,
            stockMinimo: payloadProducto.stockMinimo,
            imagenUrl: payloadProducto.imagenUrl,
            qrCode: payloadProducto.qrCode,
            activo: payloadProducto.activo,
          }
          this.update({ id: existente.id, ...cambios }, session)
          existentes[fila.sku] = Sheets.getBy('Productos', 'id', existente.id)
        }
        actualizados++
        resultados.push({
          rowNumber: linea,
          sku: fila.sku,
          action: 'updated',
          message: 'Producto listo para actualizar',
        })
      } catch (err) {
        errores++
        resultados.push({
          rowNumber: linea,
          sku: fila.sku || '',
          action: 'error',
          message: err.message,
        })
      }
    })

    if (!dryRun && nuevos.length) {
      Sheets.insertMany('Productos', nuevos)
      nuevos.forEach(nuevo => {
        LogService.registrar(session.userId, 'IMPORT_CREATE', 'Productos', null,
          'Producto importado: ' + nuevo.nombre + ' [' + nuevo.sku + ']')
      })
    }

    if (!dryRun && (nuevos.length || actualizados > 0)) {
      this._invalidarCachesCatalogo()
    }

    return {
      dryRun: dryRun,
      summary: {
        total: filas.length,
        created: creados,
        updated: actualizados,
        skipped: omitidos,
        errors: errores,
      },
      results: resultados,
    }
  },

  importarStockInicial(payload, session) {
    this._validarPermisoImportacion(session)

    const filas = payload && payload.rows
    const dryRun = !!(payload && payload.dryRun)
    if (!filas || !filas.length) throw new Error('No se recibieron filas de stock inicial')

    const productos = Sheets.getAll('Productos')
    const productosBySku = {}
    productos.forEach(p => {
      productosBySku[String(p.sku || '').trim().toUpperCase()] = p
    })

    const sucursales = Sheets.getAll('Sucursales')
    const sucursalesMap = {}
    sucursales.forEach(s => {
      const id = String(s.id || '')
      const nombre = String(s.nombre || '').trim().toUpperCase()
      sucursalesMap[id] = s
      sucursalesMap[nombre] = s
    })

    const resultados = []
    let importados = 0
    let omitidos = 0
    let errores = 0

    filas.forEach((raw, idx) => {
      const fila = this._normalizarFilaStock(raw)
      const linea = Number(fila.__rowNumber) || idx + 2

      try {
        if (!fila.sku) throw new Error('SKU es requerido')
        if (!fila.sucursal) throw new Error('Sucursal es requerida')
        if (fila.stockInicial <= 0) {
          omitidos++
          resultados.push({
            rowNumber: linea,
            sku: fila.sku,
            action: 'skipped',
            message: 'Stock inicial menor o igual a 0, omitido',
          })
          return
        }

        const producto = productosBySku[fila.sku]
        if (!producto) throw new Error('Producto no encontrado para SKU: ' + fila.sku)

        const sucursal = sucursalesMap[fila.sucursal] || sucursalesMap[String(fila.sucursal).trim().toUpperCase()]
        if (!sucursal) throw new Error('Sucursal no encontrada: ' + fila.sucursal)

        if (!dryRun) {
          MovimientoService.entrada({
            productoId: producto.id,
            sucursalId: sucursal.id,
            cantidad: fila.stockInicial,
            referencia: fila.referencia || 'IMPORTACION-INICIAL',
            notas: fila.notas || 'Carga inicial desde Excel',
          }, session)
        }

        importados++
        resultados.push({
          rowNumber: linea,
          sku: fila.sku,
          action: 'imported',
          message: 'Stock inicial procesado para ' + sucursal.nombre,
        })
      } catch (err) {
        errores++
        resultados.push({
          rowNumber: linea,
          sku: fila.sku || '',
          action: 'error',
          message: err.message,
        })
      }
    })

    return {
      dryRun: dryRun,
      summary: {
        total: filas.length,
        imported: importados,
        skipped: omitidos,
        errors: errores,
      },
      results: resultados,
    }
  },

  remove(payload, session) {
    AccessService.assert(session, 'productos.desactivar', 'Sin permiso para desactivar productos')
    Sheets.update('Productos', payload.id, { activo: false })
    this._invalidarCachesCatalogo()
    LogService.registrar(session.userId, 'DELETE', 'Productos', null, 'ID: ' + payload.id)
    return true
  },

  subirImagen(payload, session) {
    AccessService.assert(session, 'productos.subir_imagen', 'Sin permiso para subir imágenes de productos')
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
    const url = 'https://drive.google.com/file/d/' + file.getId()
    //const url = 'https://drive.google.com/uc?export=view&id=' + file.getId()

    LogService.registrar(session.userId, 'UPLOAD', 'Productos', null, 'Imagen: ' + nombre)
    return file.getId() //url
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
      sucursales.forEach(s => {
        cache.remove('catalogo_' + s.id)
        cache.remove('catalogo_' + s.id + '_view')
        cache.remove('catalogo_' + s.id + '_edit')
      })
    } catch (e) {
      Logger.log('Error invalidando cache catalogo: ' + e.message)
    }
  },

  _mapear(p) {
    return {
      id: p.id,
      sku: p.sku,
      marcaId: p.marca_id || '',
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

  _validarPermisoImportacion(session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para importar productos en masa')
    }
  },

  _construirProducto(payload) {
    const sku = String(payload.sku || '').trim().toUpperCase()
    const marca = String(payload.marca || '').trim().toUpperCase()
    const nombre = String(payload.nombre || '').trim()
    const precioCompra = Number(payload.precioCompra) || 0
    const precioOfrecido = Number(payload.precioOfrecido) || 0
    const precioFinal = Number(payload.precioFinal) || 0

    return {
      id: Sheets.generateId(),
      sku: sku,
      marca_id: payload.marcaId || '',
      marca: marca,
      nombre: nombre,
      descripcion: payload.descripcion || '',
      categoria_id: payload.categoriaId || '',
      unidad: payload.unidad || 'Unidad',
      precio_compra: precioCompra,
      precio_ofrecido: precioOfrecido,
      precio_final: precioFinal,
      stock_minimo: Number(payload.stockMinimo) || 0,
      imagen_url: payload.imagenUrl || '',
      qr_code: payload.qrCode || this._generarQrTexto(sku, marca, nombre, precioOfrecido, precioFinal),
      activo: payload.activo !== undefined ? payload.activo : true,
      fecha_creacion: new Date().toISOString(),
    }
  },

  _generarQrTexto(sku, marca, nombre, precioOfrecido, precioFinal) {
    return [
      String(sku || '').trim().toUpperCase(),
      String(marca || '').trim().toUpperCase(),
      String(nombre || '').trim(),
      String(Number(precioOfrecido) || 0),
      String(Number(precioFinal) || 0),
    ].join(' | ')
  },

  _normalizarFilaImportacion(raw) {
    return {
      __rowNumber: raw.__rowNumber,
      sku: String(raw.sku || '').trim().toUpperCase(),
      marca: String(raw.marca || '').trim().toUpperCase(),
      nombre: String(raw.nombre || '').trim(),
      descripcion: String(raw.descripcion || '').trim(),
      categoria: String(raw.categoria || '').trim(),
      unidad: String(raw.unidad || 'Unidad').trim(),
      precioCompra: Number(raw.precioCompra) || 0,
      precioOfrecido: Number(raw.precioOfrecido) || 0,
      precioFinal: raw.precioFinal === '' || raw.precioFinal === null || raw.precioFinal === undefined
        ? null
        : Number(raw.precioFinal),
      stockMinimo: Number(raw.stockMinimo) || 0,
      imagenUrl: String(raw.imagenUrl || '').trim(),
      activo: raw.activo === undefined || raw.activo === null || raw.activo === ''
        ? true
        : raw.activo === true || String(raw.activo).trim().toUpperCase() === 'TRUE' || String(raw.activo).trim() === '1',
    }
  },

  _validarFilaImportacion(fila) {
    if (!fila.sku) throw new Error('SKU es requerido')
    if (!fila.nombre) throw new Error('Nombre es requerido')
    if (fila.precioFinal === null || isNaN(Number(fila.precioFinal))) {
      throw new Error('Precio final es requerido')
    }
  },

  _normalizarFilaStock(raw) {
    return {
      __rowNumber: raw.__rowNumber,
      sku: String(raw.sku || '').trim().toUpperCase(),
      sucursal: String(raw.sucursal || raw.sucursalId || '').trim(),
      stockInicial: Number(raw.stockInicial) || 0,
      referencia: String(raw.referencia || '').trim(),
      notas: String(raw.notas || '').trim(),
    }
  },
}
