// =============================================================
// sucursalStore.ts — Estado global de sucursales
// Optimizado con: useStoreCache (TTL + deduplicación) y
// useDataSync (propagación de cambios a otros stores).
// =============================================================
import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Sucursal, SucursalForm } from 'src/types'
import { sucursalService } from 'src/services/sucursalService'
import { useStoreCache } from 'src/composables/useStoreCache'
import { useDataSync } from 'src/composables/useDataSync'
import { useLoading } from 'src/composables/useLoading'

const TTL = 6 * 60 * 60 * 1000 // 6 horas (sucursales cambian poco)

export const useSucursalStore = defineStore('sucursal', () => {
  // ── Caché ──────────────────────────────────────────────────
  const cache = useStoreCache<Sucursal[]>({ ttl: TTL, name: 'sucursal' })
  const sync = useDataSync()

  // ── Alias de estado ────────────────────────────────────────
  const items = computed(() => cache.data.value ?? [])
  const loading = cache.loading
  const saving = cache.loading
  const error = cache.error

  // ── Computed ───────────────────────────────────────────────
  const activas = computed(() => items.value.filter((s) => s.activo))

  const options = computed(() =>
    activas.value.map((s) => ({ label: `${s.nombre}`, value: s.id })),
  )

  const cacheInfo = computed(() => ({
    isValid: cache.isValid.value,
    isStale: cache.isStale.value,
    lastFetchedAt: cache.lastFetchedAt.value,
    hasData: cache.hasData.value,
    data: cache.data.value,
    timeRest: cache.timeRest.value,
  }))

  // ── Actions ────────────────────────────────────────────────

  async function fetchAll(force = false): Promise<void> {
    useLoading(true, 'Cargando Sucursales...')
    try {
      await cache.fetch(force, () => sucursalService.getAll())
    } finally {
      useLoading(false)
    }
  }

  async function create(form: SucursalForm): Promise<Sucursal> {
    saving.value = true
    error.value = null
    try {
      const nueva = await sucursalService.create(form)
      cache.pushItem(nueva)
      sync.emit('sucursal:created', nueva)
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
      cache.patchItem(id, 'id', actualizada)
      sync.emit('sucursal:updated', actualizada)
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
      cache.removeItem(id, 'id')
      sync.emit('sucursal:deleted', { id })
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

  // ── Helpers ────────────────────────────────────────────────
  function getById(id: string): Sucursal | undefined {
    return items.value.find((s) => s.id === id)
  }

  function select(_sucursal: Sucursal | null): void {
    // Compatibilidad; el selected se maneja localmente en pages
  }

  function clearError(): void {
    cache.error.value = null
  }

  function forceReload(): void {
    cache.invalidate()
  }

  return {
    items, loading, saving, error, activas, options, cacheInfo,
    fetchAll, create, update, remove, toggleActivo,
    getById, select, clearError, forceReload,
  }
})
