// =============================================================
// useInventario.ts — Composable de inventario por sucursal
// =============================================================
import { ref } from 'vue'
import type {
  InventarioItem,
  EntradaPayload,
  SalidaPayload,
  TransferenciaPayload,
  ReferenciaMovimientoTemplate,
} from 'src/types'
import { inventarioService } from 'src/services/inventarioService'
import { useNotify } from './useNotify'


const REFERENCE_TEMPLATES: ReferenciaMovimientoTemplate[] = [
  {
    tipo: 'INICIO_INVENTARIO',
    textoBase: 'inicio de inventario, responsable de recepción: ',
    detalleLabel: 'Detalle de inicio de inventario',
  },
  {
    tipo: 'CIERRE_INVENTARIO',
    textoBase: 'cierre de inventario, responsable de entrega: ',
    detalleLabel: 'Detalle de cierre de inventario',
  },
  {
    tipo: 'REPOSICION_PRODUCTO',
    textoBase: 'reposición de producto, responsable de recepción: ',
    detalleLabel: 'Detalle de reposición',
  },
  {
    tipo: 'BAJA_PRODUCTO',
    textoBase: 'baja de producto, responsable de baja: ',
    detalleLabel: 'Detalle de baja de producto',
  },
  {
    tipo: 'OTRO',
    textoBase: '',
    detalleLabel: 'Detalle libre',
  },
]

export function useInventario() {
  const { notifySuccess, notifyError } = useNotify()
  const items = ref<InventarioItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const plantillasMovimiento = ref<ReferenciaMovimientoTemplate[]>([])

  async function cargarStock(sucursalId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await inventarioService.getStockPorSucursal(sucursalId)
    } catch (e) { error.value = (e as Error).message }
    finally { loading.value = false }
  }

  async function registrarEntrada(payload: EntradaPayload): Promise<void> {
    loading.value = true
    try {
      await inventarioService.registrarEntrada(payload)
      notifySuccess('Entrada registrada correctamente')
      await cargarStock(payload.sucursalId)
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg; notifyError(msg); throw e
    } finally { loading.value = false }
  }

  async function registrarSalida(payload: SalidaPayload): Promise<void> {
    loading.value = true
    try {
      await inventarioService.registrarSalida(payload)
      notifySuccess('Salida registrada correctamente')
      await cargarStock(payload.sucursalId)
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg; notifyError(msg); throw e
    } finally { loading.value = false }
  }

  async function transferir(payload: TransferenciaPayload): Promise<void> {
    loading.value = true
    try {
      await inventarioService.transferir(payload)
      notifySuccess('Transferencia realizada correctamente')
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg; notifyError(msg); throw e
    } finally { loading.value = false }
  }

  async function getMovimientoPlantillasReferencia(): Promise<ReferenciaMovimientoTemplate[] | undefined> {
    loading.value = true
    try {
      plantillasMovimiento.value = REFERENCE_TEMPLATES //await inventarioService.getMovimientoPlantillasReferencia()
      return plantillasMovimiento.value
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    plantillasMovimiento,
    cargarStock,
    registrarEntrada,
    registrarSalida,
    transferir,
    getMovimientoPlantillasReferencia,
  }
}
