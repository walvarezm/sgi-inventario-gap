// =============================================================
// ProveedorService.gs — CRUD de Proveedores
// =============================================================

const ProveedorService = {

  getAll(payload) {
    const soloActivos = !payload || payload.todos !== true
    let proveedores = Sheets.getAll('Proveedores')
    if (soloActivos) {
      proveedores = proveedores.filter(
        p => p.activo === true || p.activo === 'TRUE' || p.activo === 1
      )
    }
    return proveedores.map(this._mapear)
  },

  getById(payload) {
    const p = Sheets.getBy('Proveedores', 'id', payload.id)
    if (!p) throw new Error('Proveedor no encontrado: ' + payload.id)
    return this._mapear(p)
  },

  create(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para crear proveedores')
    }
    this._validar(payload)

    // Verificar RUC único si se provee
    if (payload.rucNit && payload.rucNit.trim()) {
      const existente = Sheets.getAll('Proveedores').find(
        p => String(p.ruc_nit).trim() === payload.rucNit.trim()
      )
      if (existente) throw new Error('Ya existe un proveedor con el RUC/NIT: ' + payload.rucNit)
    }

    const nuevo = {
      id: Sheets.generateId(),
      nombre: payload.nombre.trim(),
      ruc_nit: payload.rucNit || '',
      contacto: payload.contacto || '',
      telefono: payload.telefono || '',
      email: payload.email || '',
      direccion: payload.direccion || '',
      ciudad: payload.ciudad || '',
      notas: payload.notas || '',
      activo: true,
      fecha_creacion: new Date().toISOString(),
    }

    Sheets.insert('Proveedores', nuevo)
    LogService.registrar(session.userId, 'CREATE', 'Proveedores', null,
      'Proveedor creado: ' + nuevo.nombre)
    return this._mapear(nuevo)
  },

  update(payload, session) {
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      throw new Error('Sin permiso para actualizar proveedores')
    }
    if (!payload.id) throw new Error('ID de proveedor requerido')

    const existente = Sheets.getBy('Proveedores', 'id', payload.id)
    if (!existente) throw new Error('Proveedor no encontrado: ' + payload.id)

    const cambios = {}
    if (payload.nombre !== undefined)    cambios.nombre = payload.nombre.trim()
    if (payload.rucNit !== undefined)     cambios.ruc_nit = payload.rucNit
    if (payload.contacto !== undefined)   cambios.contacto = payload.contacto
    if (payload.telefono !== undefined)   cambios.telefono = payload.telefono
    if (payload.email !== undefined)      cambios.email = payload.email
    if (payload.direccion !== undefined)  cambios.direccion = payload.direccion
    if (payload.ciudad !== undefined)     cambios.ciudad = payload.ciudad
    if (payload.notas !== undefined)      cambios.notas = payload.notas
    if (payload.activo !== undefined)     cambios.activo = payload.activo

    const actualizado = Sheets.update('Proveedores', payload.id, cambios)
    LogService.registrar(session.userId, 'UPDATE', 'Proveedores', null,
      'Proveedor actualizado: ' + payload.id)
    return this._mapear(actualizado)
  },

  remove(payload, session) {
    if (session.rol !== 'ADMINISTRADOR') {
      throw new Error('Solo el Administrador puede eliminar proveedores')
    }
    Sheets.update('Proveedores', payload.id, { activo: false })
    LogService.registrar(session.userId, 'DELETE', 'Proveedores', null,
      'Proveedor eliminado: ' + payload.id)
    return true
  },

  /** Historial de órdenes de un proveedor */
  getHistorial(payload) {
    const { proveedorId } = payload
    return Sheets.getAll('OrdenesCompra')
      .filter(o => String(o.proveedor_id) === String(proveedorId))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .map(o => ({
        id: o.id,
        numero: o.numero,
        fecha: o.fecha,
        estado: o.estado,
        total: Number(o.total) || 0,
        sucursalId: o.sucursal_id,
      }))
  },

  _validar(payload) {
    if (!payload.nombre || !payload.nombre.trim()) throw new Error('Nombre es requerido')
  },

  _mapear(p) {
    return {
      id: p.id,
      nombre: p.nombre,
      rucNit: p.ruc_nit || '',
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      ciudad: p.ciudad || '',
      notas: p.notas || '',
      activo: p.activo === true || p.activo === 'TRUE' || p.activo === 1,
      fechaCreacion: p.fecha_creacion || '',
    }
  },
}
