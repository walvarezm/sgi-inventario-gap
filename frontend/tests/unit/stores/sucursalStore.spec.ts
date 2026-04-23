// =============================================================
// sucursalStore.spec.ts — Tests del store de sucursales
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Sucursal } from 'src/types'

const mockSucursales: Sucursal[] = [
  {
    id: 's-001', nombre: 'Casa Matriz', direccion: 'Av. Principal 123',
    ciudad: 'La Paz', telefono: '591-2-0000', email: 'matriz@sgi.bo',
    responsableId: 'u-001', activo: true, fechaCreacion: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 's-002', nombre: 'Sucursal Sur', direccion: 'Calle 21 de Calacoto',
    ciudad: 'La Paz', telefono: '591-2-1111', email: 'sur@sgi.bo',
    responsableId: 'u-002', activo: true, fechaCreacion: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 's-003', nombre: 'Sucursal Norte (Inactiva)', direccion: 'Av. Norte 456',
    ciudad: 'El Alto', telefono: '591-2-2222', email: 'norte@sgi.bo',
    responsableId: '', activo: false, fechaCreacion: '2026-02-01T00:00:00.000Z',
  },
]

vi.mock('src/services/sucursalService', () => ({
  sucursalService: {
    getAll: vi.fn().mockResolvedValue(mockSucursales),
    create: vi.fn().mockImplementation((form) =>
      Promise.resolve({ ...form, id: 's-new', fechaCreacion: '2026-01-01' }),
    ),
    update: vi.fn().mockImplementation((id, changes) => {
      const original = mockSucursales.find((s) => s.id === id)
      return Promise.resolve({ ...original, ...changes })
    }),
    remove: vi.fn().mockResolvedValue(true),
  },
}))

describe('useSucursalStore', () => {
  let store: ReturnType<typeof import('src/stores/sucursalStore').useSucursalStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    const { useSucursalStore } = await import('src/stores/sucursalStore')
    store = useSucursalStore()
  })

  it('inicia con estado vacío', () => {
    expect(store.items).toHaveLength(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll carga sucursales correctamente', async () => {
    await store.fetchAll()
    expect(store.items).toHaveLength(3)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('activas solo retorna sucursales con activo=true', async () => {
    await store.fetchAll()
    expect(store.activas).toHaveLength(2)
    expect(store.activas.every((s) => s.activo)).toBe(true)
  })

  it('options retorna formato {label, value}', async () => {
    await store.fetchAll()
    expect(store.options).toHaveLength(2)
    store.options.forEach((opt) => {
      expect(opt).toHaveProperty('label')
      expect(opt).toHaveProperty('value')
    })
  })

  it('getById retorna la sucursal correcta', async () => {
    await store.fetchAll()
    const sucursal = store.getById('s-001')
    expect(sucursal).toBeDefined()
    expect(sucursal?.nombre).toBe('Casa Matriz')
  })

  it('getById retorna undefined para ID inexistente', async () => {
    await store.fetchAll()
    expect(store.getById('no-existe')).toBeUndefined()
  })

  it('create agrega la nueva sucursal al array', async () => {
    await store.fetchAll()
    const countBefore = store.items.length
    await store.create({
      nombre: 'Nueva Sucursal', direccion: 'Av. Test 1', ciudad: 'Cochabamba',
      telefono: '', email: '', responsableId: '', activo: true,
    })
    expect(store.items).toHaveLength(countBefore + 1)
  })

  it('select asigna la sucursal seleccionada', async () => {
    await store.fetchAll()
    store.select(store.items[0])
    expect(store.selected?.id).toBe('s-001')
  })

  it('select con null limpia la selección', () => {
    store.select(null)
    expect(store.selected).toBeNull()
  })

  it('clearError limpia el error', () => {
    store.error = 'Error de prueba'
    store.clearError()
    expect(store.error).toBeNull()
  })
})
