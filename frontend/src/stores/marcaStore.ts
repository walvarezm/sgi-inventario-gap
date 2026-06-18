// =============================================================
// marcaStore.ts — Estado global de marcas
// Optimizado con: useStoreCache (TTL + deduplicación) y
// useDataSync (propagación de cambios).
// =============================================================
import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Marca, MarcaForm } from 'src/types'
import { marcaService } from 'src/services/marcaService'
import { useStoreCache } from 'src/composables/useStoreCache'
import { useDataSync } from 'src/composables/useDataSync'
import { useLoading } from 'src/composables/useLoading'

const TTL = 6 * 60 * 60 * 1000 // 6 horas (marcas son muy estáticas)

export const useMarcaStore = defineStore('marca', () => {
  // ── Caché ──────────────────────────────────────────────────
  const cache = useStoreCache<Marca[]>({ ttl: TTL, name: 'marca' })
  const sync = useDataSync()

  // ── Alias de estado ────────────────────────────────────────
  const items = computed(() => cache.data.value ?? [])
  const loading = cache.loading
  const error = cache.error

  // ── Computed ───────────────────────────────────────────────
  const activas = computed(() =>
    items.value
      .filter((c) => c.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  )

  const options = computed(() =>
    activas.value.map((c) => ({ label: c.nombre, value: c.id })),
  )

  const optionsName = computed(() =>
    activas.value.map((c) => ({ label: c.nombre, value: c.nombre })),
  )

  const cacheInfo = computed(() => ({
    isValid: cache.isValid.value,
    isStale: cache.isStale.value,
    lastFetchedAt: cache.lastFetchedAt.value,
  }))

  // ── Actions ────────────────────────────────────────────────

  async function fetchAll(force = false): Promise<void> {
    useLoading(true, 'Cargando Marcas...')
    try {
      await cache.fetch(force, () => marcaService.getAll())
    } finally {
      useLoading(false)
    }
  }

  async function create(form: MarcaForm): Promise<Marca> {
    const nueva = await marcaService.create(form)
    cache.pushItem(nueva)
    sync.emit('marca:created', nueva)
    return nueva
  }

  async function update(id: string, changes: Partial<MarcaForm>): Promise<Marca> {
    const actualizada = await marcaService.update(id, changes)
    cache.patchItem(id, 'id', actualizada)
    sync.emit('marca:updated', actualizada)
    return actualizada
  }

  async function remove(id: string): Promise<void> {
    await marcaService.remove(id)
    cache.removeItem(id, 'id')
    sync.emit('marca:deleted', id)
  }

  // ── Helpers ────────────────────────────────────────────────
  function getById(id: string): Marca | undefined {
    return items.value.find((c) => c.id === id)
  }

  function clearError(): void {
    cache.error.value = null
  }

  function forceReload(): void {
    cache.invalidate()
  }

  return {
    items, loading, error, activas, options, optionsName, cacheInfo,
    fetchAll, create, update, remove, getById, clearError, forceReload,
  }
})
