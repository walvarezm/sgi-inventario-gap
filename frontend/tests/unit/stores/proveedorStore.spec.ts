// =============================================================
// proveedorStore.spec.ts — Tests del store de proveedores
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Proveedor } from 'src/types'

const mockProveedores: Proveedor[] = [
  {
    id: 'prov-001', nombre: 'Distribuidora ABC', rucNit: '123456789',
    contacto: 'Juan Pérez', telefono: '591-2-2345678', email: 'abc@dist.bo',
    direccion: 'Av. Comercio 123', ciudad: 'La Paz', notas: '',
    activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prov-002', nombre: 'Importadora XYZ', rucNit: '987654321',
    contacto: 'María García', telefono: '591-4-3456789', email: 'xyz@import.bo',
    direccion: 'Calle Comercial 456', ciudad: 'Cochabamba', notas: '',
    activo: true, fechaCreacion: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'prov-003', nombre: 'Proveedor Inactivo', rucNit: '111222333',
    contacto: '', telefono: '', email: '',
    direccion: '', ciudad: 'El Alto', notas: '',
    activo: false, fechaCreacion: '2026-03-01T00:00:00.000Z',
  },
]

vi.mock('src/services/proveedorService', () => ({
  proveedorService: {
    getAll: vi.fn().mockResolvedValue(mockProveedores),
    create: vi.fn().mockImplementation((form) =>
      Promise.resolve({ ...form, id: 'prov-new', fechaCreacion: '2026-01-01' }),
    ),
    update: vi.fn().mockImplementation((id, changes) => {
      const original = mockProveedores.find((p) => p.id === id)
      return Promise.resolve({ ...original, ...changes })
    }),
    remove: vi.fn().mockResolvedValue(true),
    getOrdenes: vi.fn().mockResolvedValue([]),
    createOrden: vi.fn().mockResolvedValue({ id: 'ord-001', numero: 'OC-00001' }),
  },
}))

describe('useProveedorStore', () => {
  let store: ReturnType<typeof import('src/stores/proveedorStore').useProveedorStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    const { useProveedorStore } = await import('src/stores/proveedorStore')
    store = useProveedorStore()
  })

  it('inicia con estado vacío', () => {
    expect(store.items).toHaveLength(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll carga proveedores correctamente', async () => {
    await store.fetchAll()
    expect(store.items).toHaveLength(3)
    expect(store.loading).toBe(false)
  })

  it('activos filtra solo proveedores activos', async () => {
    await store.fetchAll()
    expect(store.activos).toHaveLength(2)
    expect(store.activos.every((p) => p.activo)).toBe(true)
  })

  it('options retorna formato {label, value}', async () => {
    await store.fetchAll()
    expect(store.options).toHaveLength(2)
    store.options.forEach((o) => {
      expect(o).toHaveProperty('label')
      expect(o).toHaveProperty('value')
    })
  })

  it('getById retorna el proveedor correcto', async () => {
    await store.fetchAll()
    expect(store.getById('prov-001')?.nombre).toBe('Distribuidora ABC')
    expect(store.getById('no-existe')).toBeUndefined()
  })

  it('create agrega el nuevo proveedor', async () => {
    await store.fetchAll()
    const antes = store.items.length
    await store.create({
      nombre: 'Nuevo Proveedor', rucNit: '555666777', contacto: '',
      telefono: '', email: '', direccion: '', ciudad: '', notas: '', activo: true,
    })
    expect(store.items).toHaveLength(antes + 1)
  })

  it('select y deselect funcionan', async () => {
    await store.fetchAll()
    store.select(store.items[0])
    expect(store.selected?.id).toBe('prov-001')
    store.select(null)
    expect(store.selected).toBeNull()
  })

  it('fetchOrdenes carga las órdenes', async () => {
    await store.fetchOrdenes()
    expect(store.ordenes).toHaveLength(0) // mock retorna []
  })
})
