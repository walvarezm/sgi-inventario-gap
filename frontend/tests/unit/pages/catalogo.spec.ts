// =============================================================
// catalogo.spec.ts — Tests de la lógica del catálogo (Fase 4)
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { ProductoCatalogo } from 'src/types'

// Mock del cataloStore
vi.mock('src/stores/cataloStore', () => ({
  useCataloStore: () => ({
    getCatalogo: vi.fn().mockResolvedValue([]),
    invalidateCache: vi.fn(),
    loading: ref(false),
    error: ref(null),
  }),
}))

const mockCatalogo: ProductoCatalogo[] = [
  {
    id: '1', sku: 'ZAP001', marca: 'Nike', nombre: 'Zapato Air Max',
    descripcion: 'Zapato deportivo running', categoriaId: 'cat-1',
    precioOfrecido: 200, precioFinal: 150, stock: 15,
    imagenUrl: '', qrCode: 'ZAP001', stockBajo: false,
  },
  {
    id: '2', sku: 'CAM001', marca: 'Adidas', nombre: 'Camisa Polo',
    descripcion: 'Camisa casual algodón', categoriaId: 'cat-2',
    precioOfrecido: 80, precioFinal: 65, stock: 3,
    imagenUrl: '', qrCode: 'CAM001', stockBajo: true,
  },
  {
    id: '3', sku: 'GOR001', marca: 'Puma', nombre: 'Gorra Sport',
    descripcion: 'Gorra deportiva ajustable', categoriaId: 'cat-1',
    precioOfrecido: 45, precioFinal: 35, stock: 0,
    imagenUrl: '', qrCode: 'GOR001', stockBajo: true,
  },
  {
    id: '4', sku: 'BOL001', marca: 'Nike', nombre: 'Bolso Gym',
    descripcion: 'Bolso para entrenamiento', categoriaId: 'cat-3',
    precioOfrecido: 120, precioFinal: 95, stock: 8,
    imagenUrl: '', qrCode: 'BOL001', stockBajo: false,
  },
]

describe('useCatalogo — Fase 4', () => {
  let useCatalogo: () => ReturnType<typeof import('src/composables/useCatalogo').useCatalogo>

  beforeEach(async () => {
    const mod = await import('src/composables/useCatalogo')
    useCatalogo = mod.useCatalogo
  })

  it('filtra solo productos con stock bajo', () => {
    const { productos, conStockBajo } = useCatalogo()
    productos.value = mockCatalogo
    expect(conStockBajo.value).toHaveLength(2)
    expect(conStockBajo.value.every((p) => p.stockBajo)).toBe(true)
  })

  it('detecta correctamente productos agotados (stock = 0)', () => {
    const { productos } = useCatalogo()
    productos.value = mockCatalogo
    const agotados = productos.value.filter((p) => p.stock === 0)
    expect(agotados).toHaveLength(1)
    expect(agotados[0].sku).toBe('GOR001')
  })

  it('filtra por categoría correctamente', () => {
    const { productos, categoriaFiltro, productosFiltrados } = useCatalogo()
    productos.value = mockCatalogo
    categoriaFiltro.value = 'cat-1'
    expect(productosFiltrados.value).toHaveLength(2)
    expect(productosFiltrados.value.every((p) => p.categoriaId === 'cat-1')).toBe(true)
  })

  it('búsqueda por descripción funciona', () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = mockCatalogo
    busqueda.value = 'running'
    expect(productosFiltrados.value).toHaveLength(1)
    expect(productosFiltrados.value[0].sku).toBe('ZAP001')
  })

  it('filtros combinados: categoría + búsqueda', () => {
    const { productos, busqueda, categoriaFiltro, productosFiltrados } = useCatalogo()
    productos.value = mockCatalogo
    categoriaFiltro.value = 'cat-1'
    busqueda.value = 'nike'
    // cat-1 tiene ZAP001 (Nike) y GOR001 (Puma)
    // filtro de búsqueda 'nike' → solo ZAP001
    expect(productosFiltrados.value).toHaveLength(1)
    expect(productosFiltrados.value[0].sku).toBe('ZAP001')
  })

  it('toggle de vista cambia entre tabla y tarjetas', () => {
    const { vistaTabla, toggleVista } = useCatalogo()
    expect(vistaTabla.value).toBe(true) // tabla por defecto
    toggleVista()
    expect(vistaTabla.value).toBe(false) // tarjetas
    toggleVista()
    expect(vistaTabla.value).toBe(true)  // tabla de nuevo
  })

  it('limpiarFiltros restablece todos los filtros', () => {
    const { busqueda, categoriaFiltro, limpiarFiltros } = useCatalogo()
    busqueda.value = 'nike'
    categoriaFiltro.value = 'cat-1'
    limpiarFiltros()
    expect(busqueda.value).toBe('')
    expect(categoriaFiltro.value).toBeNull()
  })

  it('totalProductos cuenta todos sin importar filtros aplicados', () => {
    const { productos, totalProductos, busqueda } = useCatalogo()
    productos.value = mockCatalogo
    busqueda.value = 'nike' // solo 2 filtrados, pero totalProductos = 4
    expect(totalProductos.value).toBe(4)
  })
})
