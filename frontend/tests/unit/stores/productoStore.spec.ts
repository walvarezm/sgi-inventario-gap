// =============================================================
// productoStore.spec.ts — Tests del store de productos
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Producto } from 'src/types'

const mockProductos: Producto[] = [
  {
    id: 'p-001', sku: 'ZAP001', marca: 'Nike', nombre: 'Zapato Air',
    descripcion: 'Zapato deportivo', categoriaId: 'cat-1', unidad: 'Par',
    precioCompra: 80, precioOfrecido: 150, precioFinal: 120,
    stockMinimo: 5, imagenUrl: '', qrCode: 'ZAP001', activo: true,
    fechaCreacion: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p-002', sku: 'CAM001', marca: 'Adidas', nombre: 'Camisa Polo',
    descripcion: 'Camisa casual', categoriaId: 'cat-2', unidad: 'Unidad',
    precioCompra: 30, precioOfrecido: 65, precioFinal: 55,
    stockMinimo: 3, imagenUrl: 'https://drive.google.com/uc?id=abc', qrCode: 'CAM001',
    activo: true, fechaCreacion: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'p-003', sku: 'GOR001', marca: 'Puma', nombre: 'Gorra Sport',
    descripcion: 'Gorra deportiva', categoriaId: 'cat-1', unidad: 'Unidad',
    precioCompra: 15, precioOfrecido: 35, precioFinal: 28,
    stockMinimo: 10, imagenUrl: '', qrCode: 'GOR001', activo: false,
    fechaCreacion: '2026-02-01T00:00:00.000Z',
  },
]

vi.mock('src/services/productoService', () => ({
  productoService: {
    getAll: vi.fn().mockResolvedValue(mockProductos),
    create: vi.fn().mockImplementation((form) =>
      Promise.resolve({ ...form, id: 'p-new', sku: form.sku.toUpperCase(), fechaCreacion: '2026-01-01' }),
    ),
    update: vi.fn().mockImplementation((id, changes) => {
      const original = mockProductos.find((p) => p.id === id)
      return Promise.resolve({ ...original, ...changes })
    }),
    remove: vi.fn().mockResolvedValue(true),
    subirImagen: vi.fn().mockResolvedValue('https://drive.google.com/uc?id=newfile'),
  },
}))

describe('useProductoStore', () => {
  let store: ReturnType<typeof import('src/stores/productoStore').useProductoStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    const { useProductoStore } = await import('src/stores/productoStore')
    store = useProductoStore()
  })

  it('inicia con estado vacío', () => {
    expect(store.items).toHaveLength(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll carga productos correctamente', async () => {
    await store.fetchAll()
    expect(store.items).toHaveLength(3)
    expect(store.loading).toBe(false)
  })

  it('activos filtra solo productos activos', async () => {
    await store.fetchAll()
    expect(store.activos).toHaveLength(2)
    expect(store.activos.every((p) => p.activo)).toBe(true)
  })

  it('bySku permite acceso por SKU', async () => {
    await store.fetchAll()
    expect(store.bySku.get('ZAP001')?.nombre).toBe('Zapato Air')
    expect(store.bySku.get('NO_EXISTE')).toBeUndefined()
  })

  it('getById retorna el producto correcto', async () => {
    await store.fetchAll()
    expect(store.getById('p-001')?.nombre).toBe('Zapato Air')
    expect(store.getById('no-existe')).toBeUndefined()
  })

  it('findBySku retorna el producto correcto', async () => {
    await store.fetchAll()
    expect(store.findBySku('CAM001')?.marca).toBe('Adidas')
  })

  it('create agrega el nuevo producto al array', async () => {
    await store.fetchAll()
    const antes = store.items.length
    await store.create({
      sku: 'NEW001', marca: 'Test', nombre: 'Producto Nuevo', descripcion: '',
      categoriaId: '', unidad: 'Unidad', precioCompra: 10, precioOfrecido: 25,
      precioFinal: 20, stockMinimo: 2, imagenUrl: '', qrCode: '', activo: true,
    })
    expect(store.items).toHaveLength(antes + 1)
  })

  it('select y deselect funcionan correctamente', async () => {
    await store.fetchAll()
    store.select(store.items[0])
    expect(store.selected?.id).toBe('p-001')
    store.select(null)
    expect(store.selected).toBeNull()
  })

  it('remove elimina el producto del array', async () => {
    await store.fetchAll()
    const antes = store.items.length
    await store.remove('p-001')
    expect(store.items).toHaveLength(antes - 1)
    expect(store.getById('p-001')).toBeUndefined()
  })
})
