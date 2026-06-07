// =============================================================
// productoStore.ts — Estado global de productos
// Optimizado con: useStoreCache (TTL + deduplicación) y
// useDataSync (propagación de cambios a otros stores).
// =============================================================
import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Producto, ProductoForm } from 'src/types'
import { productoService } from 'src/services/productoService'
import { useStoreCache } from 'src/composables/useStoreCache'
import { useDataSync } from 'src/composables/useDataSync'
import { useLoading } from 'src/composables/useLoading'

const TTL = 10 * 60 * 1000 // 10 minutos

export const useProductoStore = defineStore('producto', () => {
  // ── Caché ──────────────────────────────────────────────────
  const cache = useStoreCache<Producto[]>({ ttl: TTL, name: 'producto' })
  const sync = useDataSync()

  // ── Alias de estado (compat. con código existente) ─────────
  const items = computed(() => {
    return cache.data.value
      ? cache.data.value.sort((a, b) => {
          const marcaCompare = a.marca.localeCompare(b.marca)
          if (marcaCompare !== 0) return marcaCompare
          const skuCompare = a.sku.localeCompare(b.sku)
          if (skuCompare !== 0) return skuCompare
          return a.nombre.localeCompare(b.nombre)
        })
      : []
  })
  const loading = cache.loading
  const error = cache.error
  const saving = cache.loading // reutilizamos el mismo flag

  // ── Computed ───────────────────────────────────────────────
  const activos = computed(() =>
    items.value
      .filter((p) => p.activo)
      .sort((a, b) => {
        const marcaCompare = a.marca.localeCompare(b.marca)
        if (marcaCompare !== 0) return marcaCompare
        const skuCompare = a.sku.localeCompare(b.sku)
        if (skuCompare !== 0) return skuCompare
        return a.nombre.localeCompare(b.nombre)
      }),
  )

  const options = computed(() =>
    activos.value.map((p) => ({
      label: `[${p.marca}] [${p.sku}] — ${p.nombre}`,
      value: p.id,
    })),
  )

  const bySku = computed(() => {
    const map = new Map<string, Producto>()
    items.value.forEach((p) => map.set(p.sku, p))
    return map
  })

  // Metadatos de caché expuestos a la UI
  const cacheInfo = computed(() => ({
    isValid: cache.isValid.value,
    isStale: cache.isStale.value,
    lastFetchedAt: cache.lastFetchedAt.value,
  }))

  // ── Actions ────────────────────────────────────────────────

  /**
   * Carga todos los productos.
   * @param force Si true, ignora la caché y recarga desde GAS
   */
  async function fetchAll(force = false): Promise<void> {
    useLoading(true, 'Cargando Productos...')
    try {
      await cache.fetch(force, () => productoService.getAll())
    } finally {
      useLoading(false)
    }
  }

  async function create(form: ProductoForm): Promise<Producto> {
    useLoading(true, 'Creando Producto...')
    try {
      const nuevo = await productoService.create(form)
      // Actualización local inmediata sin refetch
      cache.pushItem(nuevo)
      // Notificar a otros stores (catálogo, POS, inventario)
      sync.emit('producto:created', nuevo)
      return nuevo
    } catch (e) {
      cache.error.value = (e as Error).message
      throw e
    } finally {
      useLoading(false)
    }
  }

  async function update(id: string, changes: Partial<ProductoForm>): Promise<Producto> {
    useLoading(true, 'Actualizando Producto...')
    try {
      const actualizado = await productoService.update(id, changes)
      // Parche local inmediato
      cache.patchItem(id, 'id', actualizado)
      // Propagar a catálogo, POS, inventario
      sync.emit('producto:updated', actualizado)
      return actualizado
    } catch (e) {
      cache.error.value = (e as Error).message
      throw e
    } finally {
      useLoading(false)
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await productoService.remove(id)
      cache.removeItem(id, 'id')
      sync.emit('producto:deleted', { id })
    } catch (e) {
      cache.error.value = (e as Error).message
      throw e
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function getById(id: string): Producto | undefined {
    return items.value.find((p) => p.id === id)
  }

  function findBySku(sku: string): Producto | undefined {
    return bySku.value.get(sku)
  }

  function getMarcaSkuNameProductById(id: string): string {
    const product = items.value.find((p) => p.id === id)
    return product ? '[' + product.marca + '] [' + product.sku + '] - ' + product.nombre : ''
  }

  function select(_producto: Producto | null): void {
    // Mantenemos compatibilidad; el selected se maneja localmente en pages
  }

  function clearError(): void {
    cache.error.value = null
  }

  /**
   * Invalida la caché local. El próximo fetchAll() irá al backend.
   * Útil cuando otro módulo sabe que los datos cambiaron externamente.
   */
  function forceReload(): void {
    cache.invalidate()
  }

  return {
    // Estado (compatible con código existente)
    items,
    options,
    loading,
    saving,
    error,
    // Computed
    activos,
    bySku,
    cacheInfo,
    // Actions
    fetchAll,
    create,
    update,
    remove,
    // Helpers
    getById,
    findBySku,
    select,
    clearError,
    forceReload,
    getMarcaSkuNameProductById,
  }
})
