// =============================================================
// usePOS.spec.ts — Tests del composable del Punto de Venta
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { ProductoCatalogo } from 'src/types'

vi.mock('src/services/facturaService', () => ({
  facturaService: {
    getAll:  vi.fn().mockResolvedValue([]),
    create:  vi.fn().mockResolvedValue({ id: 'f-001', numero: 'F-000001', total: 150 }),
    anular:  vi.fn().mockResolvedValue(true),
    generarHtml: vi.fn().mockResolvedValue('<html></html>'),
  },
}))

vi.mock('src/services/inventarioService', () => ({
  inventarioService: {
    getStockPorSucursal: vi.fn().mockResolvedValue([]),
    getStockProducto:    vi.fn().mockResolvedValue({ stockActual: 10 }),
  },
}))

const mockProducto: ProductoCatalogo = {
  id: 'p-001', sku: 'ZAP001', marca: 'Nike', nombre: 'Zapato Air',
  descripcion: '', categoriaId: 'cat-1',
  precioOfrecido: 200, precioFinal: 150, stock: 10,
  imagenUrl: '', qrCode: 'ZAP001', stockBajo: false,
}

describe('usePOS + facturaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('carrito inicia vacío', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    expect(store.carrito).toHaveLength(0)
    expect(store.totalCarrito).toBe(0)
  })

  it('agregarAlCarrito añade el ítem correctamente', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato Air',
      marca: 'Nike', imagenUrl: '', precioUnitario: 150,
      cantidad: 2, subtotal: 300, stockDisponible: 10,
    })
    expect(store.carrito).toHaveLength(1)
    expect(store.carrito[0].cantidad).toBe(2)
    expect(store.totalCarrito).toBe(300)
  })

  it('agregar el mismo producto incrementa la cantidad', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato Air',
      marca: 'Nike', imagenUrl: '', precioUnitario: 150,
      cantidad: 1, subtotal: 150, stockDisponible: 10,
    })
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato Air',
      marca: 'Nike', imagenUrl: '', precioUnitario: 150,
      cantidad: 2, subtotal: 300, stockDisponible: 10,
    })
    expect(store.carrito).toHaveLength(1)
    expect(store.carrito[0].cantidad).toBe(3)
    expect(store.totalCarrito).toBe(450)
  })

  it('quitarDelCarrito elimina el ítem', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato',
      marca: 'Nike', imagenUrl: '', precioUnitario: 150,
      cantidad: 1, subtotal: 150, stockDisponible: 5,
    })
    store.quitarDelCarrito('p-001')
    expect(store.carrito).toHaveLength(0)
    expect(store.totalCarrito).toBe(0)
  })

  it('actualizarCantidad modifica el subtotal', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato',
      marca: 'Nike', imagenUrl: '', precioUnitario: 100,
      cantidad: 1, subtotal: 100, stockDisponible: 10,
    })
    store.actualizarCantidad('p-001', 3)
    expect(store.carrito[0].cantidad).toBe(3)
    expect(store.carrito[0].subtotal).toBe(300)
    expect(store.totalCarrito).toBe(300)
  })

  it('limpiarCarrito vacía el carrito', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato',
      marca: 'Nike', imagenUrl: '', precioUnitario: 150,
      cantidad: 2, subtotal: 300, stockDisponible: 10,
    })
    store.limpiarCarrito()
    expect(store.carrito).toHaveLength(0)
    expect(store.totalCarrito).toBe(0)
  })

  it('cantidadItemsCarrito suma cantidades totales', async () => {
    const { useFacturaStore } = await import('src/stores/facturaStore')
    const store = useFacturaStore()
    store.agregarAlCarrito({
      productoId: 'p-001', sku: 'A', nombre: 'Prod A',
      marca: 'M', imagenUrl: '', precioUnitario: 10,
      cantidad: 3, subtotal: 30, stockDisponible: 10,
    })
    store.agregarAlCarrito({
      productoId: 'p-002', sku: 'B', nombre: 'Prod B',
      marca: 'M', imagenUrl: '', precioUnitario: 20,
      cantidad: 2, subtotal: 40, stockDisponible: 10,
    })
    expect(store.cantidadItemsCarrito).toBe(5)
    expect(store.totalCarrito).toBe(70)
  })
})
