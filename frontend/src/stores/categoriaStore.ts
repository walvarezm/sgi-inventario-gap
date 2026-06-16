// =============================================================
// categoriaStore.ts — Estado global de categorías
// Optimizado con: useStoreCache (TTL + deduplicación) y
// useDataSync (propagación de cambios).
// =============================================================
import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Categoria } from 'src/types'
import { categoriaService, type CategoriaForm } from 'src/services/categoriaService'
import { useStoreCache } from 'src/composables/useStoreCache'
import { useDataSync } from 'src/composables/useDataSync'
import { useLoading } from 'src/composables/useLoading'

const TTL = 6 * 60 * 60 * 1000 // 6 horas (categorías son muy estáticas)

export const useCategoriaStore = defineStore('categoria', () => {
  // ── Caché ──────────────────────────────────────────────────
  const cache = useStoreCache<Categoria[]>({ ttl: TTL, name: 'categoria' })
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

  const cacheInfo = computed(() => ({
    isValid: cache.isValid.value,
    isStale: cache.isStale.value,
    lastFetchedAt: cache.lastFetchedAt.value,
  }))

  // ── Actions ────────────────────────────────────────────────

  async function fetchAll(force = false): Promise<void> {
    useLoading(true, 'Cargando Categorías...')
    try {
      await cache.fetch(force, () => categoriaService.getAll())
    } finally {
      useLoading(false)
    }
  }

  async function create(form: CategoriaForm): Promise<Categoria> {
    const nueva = await categoriaService.create(form)
    cache.pushItem(nueva)
    sync.emit('categoria:created', nueva)
    return nueva
  }

  async function update(id: string, changes: Partial<CategoriaForm>): Promise<Categoria> {
    const actualizada = await categoriaService.update(id, changes)
    cache.patchItem(id, 'id', actualizada)
    sync.emit('categoria:updated', actualizada)
    return actualizada
  }

  // ── Helpers ────────────────────────────────────────────────
  function getById(id: string): Categoria | undefined {
    return items.value.find((c) => c.id === id)
  }

  function clearError(): void {
    cache.error.value = null
  }

  function forceReload(): void {
    cache.invalidate()
  }

  return {
    items, loading, error, activas, options, cacheInfo,
    fetchAll, create, update, getById, clearError, forceReload,
  }
})
