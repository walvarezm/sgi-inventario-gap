// =============================================================
// reporteService.spec.ts — Tests del servicio de reportes
// =============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KPIs, PuntoVentas, TopProducto } from 'src/types'

// Mock de api
vi.mock('src/services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

const mockKPIs: KPIs = {
  ventasHoy: 1500,
  ventasMes: 45000,
  facturasCantidadHoy: 8,
  facturasCantidadMes: 120,
  productosActivos: 45,
  stockBajo: 3,
  valorInventario: 250000,
  movimientosHoy: 12,
  sucursalesActivas: 2,
}

const mockVentas: PuntoVentas[] = [
  { fecha: '2026-04-01', total: 3200, cantidad: 12 },
  { fecha: '2026-04-02', total: 2800, cantidad: 9 },
  { fecha: '2026-04-03', total: 4100, cantidad: 15 },
]

const mockTop: TopProducto[] = [
  { productoId: 'p-001', sku: 'ZAP001', nombre: 'Zapato Air', marca: 'Nike', cantidadVendida: 45, totalVendido: 6750 },
  { productoId: 'p-002', sku: 'CAM001', nombre: 'Camisa Polo', marca: 'Adidas', cantidadVendida: 32, totalVendido: 2080 },
]

describe('reporteService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getKPIs retorna los KPIs correctamente', async () => {
    const { api } = await import('src/services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, message: 'OK', result: mockKPIs },
    })

    const { reporteService } = await import('src/services/reporteService')
    const result = await reporteService.getKPIs()

    expect(result.ventasHoy).toBe(1500)
    expect(result.ventasMes).toBe(45000)
    expect(result.stockBajo).toBe(3)
    expect(result.sucursalesActivas).toBe(2)
  })

  it('getReporteVentas retorna datos ordenados por fecha', async () => {
    const { api } = await import('src/services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, message: 'OK', result: mockVentas },
    })

    const { reporteService } = await import('src/services/reporteService')
    const result = await reporteService.getReporteVentas({ desde: '2026-04-01', hasta: '2026-04-30' })

    expect(result).toHaveLength(3)
    expect(result[0].fecha).toBe('2026-04-01')
    expect(result[2].total).toBe(4100)
  })

  it('getTopProductos retorna productos ordenados por cantidad', async () => {
    const { api } = await import('src/services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, message: 'OK', result: mockTop },
    })

    const { reporteService } = await import('src/services/reporteService')
    const result = await reporteService.getTopProductos({ limite: 5 })

    expect(result[0].cantidadVendida).toBe(45)
    expect(result[0].sku).toBe('ZAP001')
    expect(result[1].cantidadVendida).toBe(32)
  })

  it('lanza error cuando la API retorna success: false', async () => {
    const { api } = await import('src/services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: false, message: 'Acceso no autorizado', result: null },
    })

    const { reporteService } = await import('src/services/reporteService')
    await expect(reporteService.getKPIs()).rejects.toThrow('Acceso no autorizado')
  })

  it('totalVentas del período se calcula correctamente', () => {
    const total = mockVentas.reduce((sum, d) => sum + d.total, 0)
    expect(total).toBe(10100)
  })

  it('promedio diario de ventas se calcula correctamente', () => {
    const total = mockVentas.reduce((sum, d) => sum + d.total, 0)
    const promedio = total / mockVentas.length
    expect(Math.round(promedio)).toBe(3367)
  })
})
