// =============================================================
// proveedorStore.ts — Estado global de proveedores y órdenes
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Proveedor, ProveedorForm, OrdenCompra, OrdenCompraForm, RecepcionPayload } from 'src/types'
import { proveedorService } from 'src/services/proveedorService'

export const useProveedorStore = defineStore('proveedor', () => {
  // ── State ────────────────────────────────────────────────
  const items = ref<Proveedor[]>([])
  const ordenes = ref<OrdenCompra[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const selected = ref<Proveedor | null>(null)
  const ordenSeleccionada = ref<OrdenCompra | null>(null)

  // ── Getters ──────────────────────────────────────────────
  const activos = computed(() => items.value.filter((p) => p.activo))

  const options = computed(() =>
    activos.value.map((p) => ({
      label: `${p.nombre}${p.rucNit ? ` — ${p.rucNit}` : ''}`,
      value: p.id,
    })),
  )

  const ordenesPendientes = computed(() =>
    ordenes.value.filter((o) => o.estado === 'PENDIENTE' || o.estado === 'PARCIAL'),
  )

  // ── Actions — Proveedores ─────────────────────────────────
  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await proveedorService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(form: ProveedorForm): Promise<Proveedor> {
    saving.value = true
    error.value = null
    try {
      const nuevo = await proveedorService.create(form)
      items.value.push(nuevo)
      return nuevo
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, changes: Partial<ProveedorForm>): Promise<Proveedor> {
    saving.value = true
    error.value = null
    try {
      const actualizado = await proveedorService.update(id, changes)
      const idx = items.value.findIndex((p) => p.id === id)
      if (idx !== -1) items.value[idx] = actualizado
      if (selected.value?.id === id) selected.value = actualizado
      return actualizado
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    saving.value = true
    try {
      await proveedorService.remove(id)
      items.value = items.value.filter((p) => p.id !== id)
      if (selected.value?.id === id) selected.value = null
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Actions — Órdenes de Compra ───────────────────────────
  async function fetchOrdenes(filtros?: { sucursalId?: string; estado?: string }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      ordenes.value = await proveedorService.getOrdenes(filtros)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createOrden(form: OrdenCompraForm): Promise<OrdenCompra> {
    saving.value = true
    error.value = null
    try {
      const nueva = await proveedorService.createOrden(form)
      ordenes.value.unshift(nueva)
      return nueva
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function recibirMercancia(payload: RecepcionPayload): Promise<OrdenCompra> {
    saving.value = true
    error.value = null
    try {
      const actualizada = await proveedorService.recibirMercancia(payload)
      const idx = ordenes.value.findIndex((o) => o.id === payload.ordenId)
      if (idx !== -1) ordenes.value[idx] = actualizada
      return actualizada
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function cancelarOrden(id: string): Promise<void> {
    saving.value = true
    try {
      await proveedorService.cancelarOrden(id)
      const idx = ordenes.value.findIndex((o) => o.id === id)
      if (idx !== -1) ordenes.value[idx] = { ...ordenes.value[idx], estado: 'CANCELADA' }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function getById(id: string): Proveedor | undefined {
    return items.value.find((p) => p.id === id)
  }

  function select(p: Proveedor | null): void { selected.value = p }
  function selectOrden(o: OrdenCompra | null): void { ordenSeleccionada.value = o }
  function clearError(): void { error.value = null }

  return {
    items, ordenes, loading, saving, error, selected, ordenSeleccionada,
    activos, options, ordenesPendientes,
    fetchAll, create, update, remove,
    fetchOrdenes, createOrden, recibirMercancia, cancelarOrden,
    getById, select, selectOrden, clearError,
  }
})
