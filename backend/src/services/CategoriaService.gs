// =============================================================
// CategoriaService.gs — CRUD de Categorías de productos
// =============================================================

const CategoriaService = {

  getAll() {
    const cache = CacheService.getScriptCache()
    const cached = cache.get('categorias_all')
    if (cached) return JSON.parse(cached)

    const data = Sheets.getAll('Categorias')
      .filter(c => c.activo === true || c.activo === 'TRUE' || c.activo === 1)
      .map(this._mapear)

    cache.put('categorias_all', JSON.stringify(data), 600) // 10 min
    return data
  },

  getById(payload) {
    const c = Sheets.getBy('Categorias', 'id', payload.id)
    if (!c) throw new Error('Categoría no encontrada: ' + payload.id)
    return this._mapear(c)
  },

  create(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para crear categorías')
    }
    if (!payload.nombre || !payload.nombre.trim()) throw new Error('Nombre es requerido')

    const nueva = {
      id: Sheets.generateId(),
      nombre: payload.nombre.trim(),
      descripcion: payload.descripcion || '',
      activo: true,
      fecha_creacion: new Date().toISOString(),
    }

    Sheets.insert('Categorias', nueva)
    CacheService.getScriptCache().remove('categorias_all')
    LogService.registrar(session.userId, 'CREATE', 'Categorias', null, 'Categoría: ' + nueva.nombre)
    return this._mapear(nueva)
  },

  update(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para actualizar categorías')
    }
    const cambios = {}
    if (payload.nombre !== undefined)      cambios.nombre = payload.nombre.trim()
    if (payload.descripcion !== undefined) cambios.descripcion = payload.descripcion
    if (payload.activo !== undefined)      cambios.activo = payload.activo

    const actualizada = Sheets.update('Categorias', payload.id, cambios)
    CacheService.getScriptCache().remove('categorias_all')
    LogService.registrar(session.userId, 'UPDATE', 'Categorias', null, 'ID: ' + payload.id)
    return this._mapear(actualizada)
  },

  _mapear(c) {
    return {
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      activo: c.activo === true || c.activo === 'TRUE' || c.activo === 1,
      fechaCreacion: c.fecha_creacion || '',
    }
  },
}
