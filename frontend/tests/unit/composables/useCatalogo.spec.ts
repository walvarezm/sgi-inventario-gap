// =============================================================
// useCatalogo.spec.ts — Tests del composable de catálogo
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { ProductoCatalogo } from 'src/types'

vi.mock('src/stores/cataloStore', () => ({
  useCataloStore: () => ({
    getCatalogo: vi.fn().mockResolvedValue([]),
    loading: ref(false),
    error: ref(null),
  }),
}))

const mockProductos: ProductoCatalogo[] = [
  {
    id: '1', sku: 'A001', marca: 'Nike', nombre: 'Zapato Deportivo',
    descripcion: 'Zapato para correr', categoriaId: 'cat-1',
    precioOfrecido: 200, precioFinal: 150, stock: 10,
    imagenUrl: '', qrCode: 'A001', stockBajo: false,
  },
  {
    id: '2', sku: 'B002', marca: 'Adidas', nombre: 'Camisa Casual',
    descripcion: 'Camisa de algodón', categoriaId: 'cat-2',
    precioOfrecido: 80, precioFinal: 65, stock: 2,
    imagenUrl: '', qrCode: 'B002', stockBajo: true,
  },
  {
    id: '3', sku: 'C003', marca: 'Nike', nombre: 'Gorra',
    descripcion: 'Gorra deportiva', categoriaId: 'cat-1',
    precioOfrecido: 50, precioFinal: 40, stock: 0,
    imagenUrl: '', qrCode: 'C003', stockBajo: true,
  },
]

describe('useCatalogo', () => {
  let useCatalogo: () => ReturnType<typeof import('src/composables/useCatalogo').useCatalogo>

  beforeEach(async () => {
    const mod = await import('src/composables/useCatalogo')
    useCatalogo = mod.useCatalogo
  })

  it('inicia con estado vacío', () => {
    const { productos, busqueda, categoriaFiltro } = useCatalogo()
    expect(productos.value).toHaveLength(0)
    expect(busqueda.value).toBe('')
    expect(categoriaFiltro.value).toBeNull()
  })

  it('filtra por búsqueda de marca', () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = mockProductos
    busqueda.value = 'nike'
    expect(productosFiltrados.value).toHaveLength(2)
    expect(productosFiltrados.value.every((p) => p.marca === 'Nike')).toBe(true)
  })

  it('filtra por SKU', () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = mockProductos
    busqueda.value = 'B002'
    expect(productosFiltrados.value).toHaveLength(1)
    expect(productosFiltrados.value[0].sku).toBe('B002')
  })

  it('filtra por nombre', () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = mockProductos
    busqueda.value = 'gorra'
    expect(productosFiltrados.value).toHaveLength(1)
  })

  it('sin búsqueda retorna todos los productos', () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = mockProductos
    busqueda.value = ''
    expect(productosFiltrados.value).toHaveLength(3)
  })

  it('filtra por categoría', () => {
    const { productos, categoriaFiltro, productosFiltrados } = useCatalogo()
    productos.value = mockProductos
    categoriaFiltro.value = 'cat-1'
    expect(productosFiltrados.value).toHaveLength(2)
    expect(productosFiltrados.value.every((p) => p.categoriaId === 'cat-1')).toBe(true)
  })

  it('detecta correctamente productos con stock bajo', () => {
    const { productos, conStockBajo } = useCatalogo()
    productos.value = mockProductos
    expect(conStockBajo.value).toHaveLength(2)
    expect(conStockBajo.value.every((p) => p.stockBajo)).toBe(true)
  })

  it('cuenta correctamente el total de productos', () => {
    const { productos, totalProductos } = useCatalogo()
    productos.value = mockProductos
    expect(totalProductos.value).toBe(3)
  })

  it('limpiarFiltros resetea búsqueda y categoría', () => {
    const { busqueda, categoriaFiltro, limpiarFiltros } = useCatalogo()
    busqueda.value = 'nike'
    categoriaFiltro.value = 'cat-1'
    limpiarFiltros()
    expect(busqueda.value).toBe('')
    expect(categoriaFiltro.value).toBeNull()
  })

  it('toggleVista alterna entre tabla y tarjetas', () => {
    const { vistaTabla, toggleVista } = useCatalogo()
    expect(vistaTabla.value).toBe(true)
    toggleVista()
    expect(vistaTabla.value).toBe(false)
    toggleVista()
    expect(vistaTabla.value).toBe(true)
  })

  it('búsqueda es case-insensitive', () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = mockProductos
    busqueda.value = 'NIKE'
    expect(productosFiltrados.value).toHaveLength(2)
    busqueda.value = 'nike'
    expect(productosFiltrados.value).toHaveLength(2)
  })
})
