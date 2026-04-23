// =============================================================
// sucursalStore.ts — Estado global de sucursales
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Sucursal, SucursalForm } from 'src/types'
import { sucursalService } from 'src/services/sucursalService'

export const useSucursalStore = defineStore('sucursal', () => {
  const items = ref<Sucursal[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const selected = ref<Sucursal | null>(null)

  const activas = computed(() => items.value.filter((s) => s.activo))
  const options = computed(() =>
    activas.value.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id })),
  )

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await sucursalService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(form: SucursalForm): Promise<Sucursal> {
    saving.value = true
    error.value = null
    try {
      const nueva = await sucursalService.create(form)
      items.value.push(nueva)
      return nueva
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, changes: Partial<SucursalForm>): Promise<Sucursal> {
    saving.value = true
    error.value = null
    try {
      const actualizada = await sucursalService.update(id, changes)
      const idx = items.value.findIndex((s) => s.id === id)
      if (idx !== -1) items.value[idx] = actualizada
      if (selected.value?.id === id) selected.value = actualizada
      return actualizada
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    saving.value = true
    error.value = null
    try {
      await sucursalService.remove(id)
      items.value = items.value.filter((s) => s.id !== id)
      if (selected.value?.id === id) selected.value = null
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function toggleActivo(id: string): Promise<void> {
    const sucursal = items.value.find((s) => s.id === id)
    if (!sucursal) return
    await update(id, { activo: !sucursal.activo })
  }

  function getById(id: string): Sucursal | undefined {
    return items.value.find((s) => s.id === id)
  }

  function select(sucursal: Sucursal | null): void { selected.value = sucursal }
  function clearError(): void { error.value = null }

  return {
    items, loading, saving, error, selected, activas, options,
    fetchAll, create, update, remove, toggleActivo, getById, select, clearError,
  }
})
