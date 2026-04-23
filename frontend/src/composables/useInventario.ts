// =============================================================
// useInventario.ts — Composable de inventario por sucursal
// =============================================================
import { ref } from 'vue'
import type { InventarioItem, EntradaPayload, SalidaPayload, TransferenciaPayload } from 'src/types'
import { inventarioService } from 'src/services/inventarioService'
import { useNotify } from './useNotify'

export function useInventario() {
  const { notifySuccess, notifyError } = useNotify()
  const items = ref<InventarioItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  return { items, loading, error, cargarStock, registrarEntrada, registrarSalida, transferir }
}
