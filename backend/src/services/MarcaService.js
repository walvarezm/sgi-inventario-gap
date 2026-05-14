// =============================================================
// MarcaService.gs — CRUD de Marcas de productos
// =============================================================

const MarcaService = {

  getAll(payload) {
    const soloActivas = !payload || payload.todos !== true

    // Intentar desde cache primero
/*    const cache = CacheService.getScriptCache()
    const cacheKey = soloActivas ? 'marcas_activas' : 'marcas_todas'
    const cached = cache.get(cacheKey)
    if (cached) return JSON.parse(cached)*/

    let marcas = Sheets.getAll('Marcas')
    if (soloActivas) {
      marcas = marcas.filter(
        m => m.activo === true || m.activo === 'TRUE' || m.activo === 1
      )
    }

    const resultado = marcas.map(this._mapear)
    //cache.put(cacheKey, JSON.stringify(resultado), 600) // 10 minutos
    return resultado
  },

  getById(payload) {
    const m = Sheets.getBy('Marcas', 'id', payload.id)
    if (!m) throw new Error('Marca no encontrada: ' + payload.id)
    return this._mapear(m)
  },

  create(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para crear marcas')
    }
    if (!payload.nombre || !payload.nombre.trim()) {
      throw new Error('El nombre de la marca es requerido')
    }

    // Verificar nombre único
    const existente = Sheets.getAll('Marcas').find(
      m => m.nombre.toLowerCase().trim() === payload.nombre.toLowerCase().trim()
    )
    if (existente) throw new Error('Ya existe una marca con el nombre: ' + payload.nombre)

    const nueva = {
      id: Sheets.generateId(),
      nombre: payload.nombre.trim().toUpperCase(),
      descripcion: payload.descripcion || payload.nombre.trim() || '',
      activo: true,
      fecha_creacion: new Date().toISOString(),
    }

    Sheets.insert('Marcas', nueva)
    //this._invalidarCache()
    LogService.registrar(session.userId, 'CREATE', 'Marcas', null,
      'Marca creada: ' + nueva.nombre)

    return this._mapear(nueva)
  },

  findByNombre(nombre) {
    if (!nombre || !String(nombre).trim()) return null
    const buscado = String(nombre).trim().toUpperCase()
    const marca = Sheets.getAll('Marcas').find(
      m => String(m.nombre || '').trim().toUpperCase() === buscado
    )
    return marca ? this._mapear(marca) : null
  },

  ensureByNombre(nombre, session) {
    if (!nombre || !String(nombre).trim()) return null
    const existente = this.findByNombre(nombre)
    if (existente) return existente
    return this.create({ nombre: String(nombre).trim() }, session)
  },

  update(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para actualizar marcas')
    }
    if (!payload.id) throw new Error('ID de marca requerido')

    const existente = Sheets.getBy('Marcas', 'id', payload.id)
    if (!existente) throw new Error('Marca no encontrada: ' + payload.id)

    // Verificar nombre único si cambia
    if (payload.nombre && payload.nombre.trim().toUpperCase() !== String(existente.nombre).toUpperCase()) {
      const duplicado = Sheets.getAll('Marcas').find(
        m => m.nombre.toLowerCase().trim() === payload.nombre.toLowerCase().trim() &&
             m.id !== payload.id
      )
      if (duplicado) throw new Error('Ya existe una marca con el nombre: ' + payload.nombre)
    }

    const cambios = {}
    if (payload.nombre !== undefined)      cambios.nombre = payload.nombre.trim().toUpperCase()
    if (payload.descripcion !== undefined) cambios.descripcion = payload.descripcion
    if (payload.activo !== undefined)      cambios.activo = payload.activo

    const actualizada = Sheets.update('Marcas', payload.id, cambios)
    //this._invalidarCache()
    LogService.registrar(session.userId, 'UPDATE', 'Marcas', null,
      'Marca actualizada: ' + payload.id)

    return this._mapear(actualizada)
  },

  remove(payload, session) {
    if (session.rol !== 'ADMINISTRADOR') {
      throw new Error('Solo el Administrador puede eliminar marcas')
    }
    const existente = Sheets.getBy('Marcas', 'id', payload.id)
    if (!existente) throw new Error('Marca no encontrada: ' + payload.id)

    // Soft-delete: marcar como inactiva
    Sheets.update('Marcas', payload.id, { activo: false })
    //this._invalidarCache()
    LogService.registrar(session.userId, 'DELETE', 'Marcas', null,
      'Marca eliminada: ' + existente.nombre)

    return true
  },

  _invalidarCache() {
    const cache = CacheService.getScriptCache()
    cache.remove('marcas_activas')
    cache.remove('marcas_todas')
  },

  _mapear(m) {
    return {
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion || '',
      activo: m.activo === true || m.activo === 'TRUE' || m.activo === 1,
      fechaCreacion: m.fecha_creacion || '',
    }
  },
}
