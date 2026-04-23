// =============================================================
// useInventario.spec.ts — Tests del composable de inventario
// =============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { InventarioItem, EntradaPayload, SalidaPayload, TransferenciaPayload } from 'src/types'

// Mock del servicio de inventario
vi.mock('src/services/inventarioService', () => ({
  inventarioService: {
    getStockPorSucursal: vi.fn().mockResolvedValue([]),
    registrarEntrada:    vi.fn().mockResolvedValue({ id: 'm-001', tipo: 'ENTRADA', cantidad: 10 }),
    registrarSalida:     vi.fn().mockResolvedValue({ id: 'm-002', tipo: 'SALIDA',  cantidad: 5 }),
    transferir:          vi.fn().mockResolvedValue({ id: 'm-003', tipo: 'TRANSFERENCIA', cantidad: 3 }),
  },
}))

// Mock de useNotify
vi.mock('src/composables/useNotify', () => ({
  useNotify: () => ({
    notifySuccess: vi.fn(),
    notifyError:   vi.fn(),
  }),
}))

const mockStock: InventarioItem[] = [
  { id: 'inv-001', productoId: 'p-001', sucursalId: 's-001', stockActual: 15, fechaActualizacion: '2026-01-10' },
  { id: 'inv-002', productoId: 'p-002', sucursalId: 's-001', stockActual: 2,  fechaActualizacion: '2026-01-12' },
  { id: 'inv-003', productoId: 'p-003', sucursalId: 's-001', stockActual: 0,  fechaActualizacion: '2026-01-15' },
]

describe('useInventario', () => {
  let useInventario: () => ReturnType<typeof import('src/composables/useInventario').useInventario>

  beforeEach(async () => {
    const mod = await import('src/composables/useInventario')
    useInventario = mod.useInventario
  })

  it('inicia con estado vacío', () => {
    const { items, loading, error } = useInventario()
    expect(items.value).toHaveLength(0)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('cargarStock popula el array de items', async () => {
    const { inventarioService } = await import('src/services/inventarioService')
    vi.mocked(inventarioService.getStockPorSucursal).mockResolvedValueOnce(mockStock)

    const { items, cargarStock } = useInventario()
    await cargarStock('s-001')
    expect(items.value).toHaveLength(3)
  })

  it('registrarEntrada llama al servicio correcto', async () => {
    const { inventarioService } = await import('src/services/inventarioService')
    const { registrarEntrada } = useInventario()

    const payload: EntradaPayload = {
      productoId: 'p-001', sucursalId: 's-001', cantidad: 10, referencia: 'ORD-001',
    }
    await registrarEntrada(payload)
    expect(inventarioService.registrarEntrada).toHaveBeenCalledWith(payload)
  })

  it('registrarSalida llama al servicio correcto', async () => {
    const { inventarioService } = await import('src/services/inventarioService')
    const { registrarSalida } = useInventario()

    const payload: SalidaPayload = {
      productoId: 'p-001', sucursalId: 's-001', cantidad: 5, referencia: 'VTA-001',
    }
    await registrarSalida(payload)
    expect(inventarioService.registrarSalida).toHaveBeenCalledWith(payload)
  })

  it('transferir llama al servicio correcto', async () => {
    const { inventarioService } = await import('src/services/inventarioService')
    const { transferir } = useInventario()

    const payload: TransferenciaPayload = {
      productoId: 'p-001', sucursalOrigen: 's-001', sucursalDestino: 's-002', cantidad: 3,
    }
    await transferir(payload)
    expect(inventarioService.transferir).toHaveBeenCalledWith(payload)
  })
})
