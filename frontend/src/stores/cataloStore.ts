// =============================================================
// cataloStore.ts — Catálogo por sucursal con cache TTL
// =============================================================
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { cataloService } from 'src/services/cataloService'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

interface CacheEntry {
  data: ProductoCatalogo[]
  ts: number
}

export const useCataloStore = defineStore('catalo', () => {
  const cache = ref<Record<string, CacheEntry>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function getCatalogo(sucursalId: string, forceRefresh = false): Promise<ProductoCatalogo[]> {
    const now = Date.now()
    const cached = cache.value[sucursalId]
    if (!forceRefresh && cached && now - cached.ts < CACHE_TTL) {
      return cached.data
    }
    loading.value = true
    error.value = null
    try {
      const data = await cataloService.getBySucursal(sucursalId)
      cache.value[sucursalId] = { data, ts: now }
      return data
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
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

  return { cache, loading, error, getCatalogo, invalidateCache, isCacheValid }
})
