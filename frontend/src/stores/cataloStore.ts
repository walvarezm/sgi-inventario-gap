// =============================================================
// cataloStore.ts — Catálogo por sucursal con caché TTL.
// Suscrito a eventos DataSync de productos para mantener
// coherencia sin necesidad de refetch completo.
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Producto, ProductoCatalogo } from 'src/types'
import { cataloService } from 'src/services/cataloService'
import { useDataSync } from 'src/composables/useDataSync'
import { useLoading } from 'src/composables/useLoading'

const CACHE_TTL = 30 * 60 * 1000 // 30 minutos

interface CacheEntry {
  data: ProductoCatalogo[]
  ts: number
}

export const useCataloStore = defineStore('catalogo', () => {
  const cache = ref<Record<string, CacheEntry>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sucursalIdCurrent = ref<string | null>(null)
  const sync = useDataSync()

  // ── Suscripciones a DataSync ────────────────────────────────
  // Cuando productoStore actualiza un producto, parcheamos el
  // catálogo en memoria para todas las sucursales cacheadas,
  // sin necesidad de ir al backend.
  sync.on('producto:updated', (producto: Producto) => {
    Object.keys(cache.value).forEach((sucursalId) => {
      const entry = cache.value[sucursalId]
      if (!entry) return
      const idx = entry.data.findIndex((p) => p.id === producto.id)
      if (idx !== -1) {
        // Actualizar los campos del catálogo que vienen del producto maestro
        entry.data[idx] = {
          ...entry.data[idx],
          sku: producto.sku,
          marca: producto.marca,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          precioOfrecido: producto.precioOfrecido,
          precioFinal: producto.precioFinal,
          imagenUrl: producto.imagenUrl,
          qrCode: producto.qrCode,
          categoriaId: producto.categoriaId,
        }
      }
    })
  })

  // Si un producto fue eliminado/desactivado, quitarlo del catálogo en memoria
  sync.on('producto:deleted', ({ id }: { id: string }) => {
    Object.keys(cache.value).forEach((sucursalId) => {
      const entry = cache.value[sucursalId]
      if (!entry) return
      entry.data = entry.data.filter((p) => p.id !== id)
    })
  })

  // Si se emite invalidación explícita del catálogo
  sync.on('catalogo:invalidate', ({ sucursalId }: { sucursalId?: string }) => {
    invalidateCache(sucursalId)
  })

  // ── Computed ────────────────────────────────────────────────
  const cacheKeys = computed(() => Object.keys(cache.value))

  // ── Actions ────────────────────────────────────────────────
  async function getCatalogo(sucursalId: string, forceRefresh = false): Promise<ProductoCatalogo[]> {
    const now = Date.now()
    const cached = cache.value[sucursalId]
    sucursalIdCurrent.value = sucursalId

    if (!forceRefresh && cached && now - cached.ts < CACHE_TTL) {
      return cached.data
    }

    loading.value = true
    error.value = null
    useLoading(true, 'Cargando Catálogo de Sucursal Seleccionada...')

    try {
      const dataResult = await cataloService.getBySucursal(sucursalId)

      const data = dataResult.sort((a, b) => {
        const marcaCompare = a.marca.localeCompare(b.marca)
        if (marcaCompare !== 0) return marcaCompare
        const skuCompare = a.sku.localeCompare(b.sku)
        if (skuCompare !== 0) return skuCompare
        return a.nombre.localeCompare(b.nombre)
      })

      cache.value[sucursalId] = { data, ts: now }
      return data
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
      useLoading(false)
    }
  }

  function invalidateCache(sucursalId?: string): void {
    if (sucursalId) {
      delete cache.value[sucursalId]
    } else {
      cache.value = {}
    }
  }

  function isCacheValid(sucursalId: string): boolean {
    const cached = cache.value[sucursalId]
    if (!cached) return false
    return Date.now() - cached.ts < CACHE_TTL
  }

  return {
    cache,
    loading,
    error,
    sucursalIdCurrent,
    cacheKeys,
    getCatalogo,
    invalidateCache,
    isCacheValid,
  }
})
