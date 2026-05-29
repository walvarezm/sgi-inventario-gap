// =============================================================
// cataloStore.ts — Catálogo por sucursal con cache TTL
// =============================================================
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { cataloService } from 'src/services/cataloService'
import { useLoading } from 'src/composables/useLoading.ts'

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

  async function getCatalogo(sucursalId: string, forceRefresh = false): Promise<ProductoCatalogo[]> {
    const now = Date.now()
    const cached = cache.value[sucursalId]
    sucursalIdCurrent.value = sucursalId
    if (!forceRefresh && cached && now - cached.ts < CACHE_TTL) {
      return cached.data
    }
    loading.value = true
    error.value = null
    useLoading(true, 'Cargando Catalogo por Sucursal...')
    try {
      const dataResult = await cataloService.getBySucursal(sucursalId)

      const data = dataResult.sort((a, b) => {
        // 1. Ordenar por MARCA (A-Z)
        const marcaCompare = a.marca.localeCompare(b.marca)
        if (marcaCompare !== 0) return marcaCompare
        // 2. Ordenar por SKU (A-Z)
        const skuCompare = a.sku.localeCompare(b.sku)
        if (skuCompare !== 0) return skuCompare
        // 3. Ordenar por NOMBRE (A-Z)
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
    if (sucursalId) { delete cache.value[sucursalId] } else { cache.value = {} }
  }

  function isCacheValid(sucursalId: string): boolean {
    const cached = cache.value[sucursalId]
    if (!cached) return false
    return Date.now() - cached.ts < CACHE_TTL
  }

  return { cache, loading, error, getCatalogo, invalidateCache, isCacheValid, sucursalIdCurrent }
})
