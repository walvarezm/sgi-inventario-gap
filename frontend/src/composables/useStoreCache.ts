// =============================================================
// useStoreCache.ts — Caché con TTL, deduplicación de requests
// y refresh manual para stores de datos maestros.
//
// CARACTERÍSTICAS:
//  - TTL configurable por store (default 10 min)
//  - Guard de fetch en vuelo: si ya hay un request activo para
//    la misma clave, la segunda llamada espera el primero y
//    reutiliza su resultado (evita dobles llamadas paralelas)
//  - forceRefresh: omite el TTL y recarga desde el backend
//  - isStale: indica si el dato está próximo a expirar
//  - lastFetchedAt: timestamp de la última carga exitosa
// =============================================================
import { ref, computed } from 'vue'

export interface StoreCacheOptions {
  /** Tiempo de vida en milisegundos. Default: 30 minutos */
  ttl?: number
  /** Nombre del store para logs de debug */
  name?: string
}

export interface StoreCacheState<T> {
  data: T | null
  ts: number
}

/**
 * Composable genérico de caché para stores de datos maestros.
 *
 * Uso dentro de un defineStore:
 * ```ts
 * const cache = useStoreCache<Producto[]>({ ttl: 10 * 60 * 1000, name: 'producto' })
 * async function fetchAll(force = false) {
 *   return cache.fetch(force, () => productoService.getAll())
 * }
 * ```
 */
export function useStoreCache<T>(options: StoreCacheOptions = {}) {
  const { ttl = 30 * 60 * 1000, name = 'store' } = options

  // ── Estado interno ──────────────────────────────────────────
  const _data = ref<T | null>(null) as ReturnType<typeof ref<T | null>>
  const _ts = ref(0)
  const _loading = ref(false)
  const _error = ref<string | null>(null)

  // Guard: promesa en vuelo para deduplicación
  let _inflight: Promise<T> | null = null

  // ── Computed ────────────────────────────────────────────────
  const isValid = computed(() => {
    if (!_ts.value || _data.value === null) return false
    return Date.now() - _ts.value < ttl
  })

  const isStale = computed(() => {
    if (!_ts.value || _data.value === null) return true
    // Considera "stale" cuando queda menos del 20% del TTL
    return Date.now() - _ts.value > ttl * 0.8
  })

  const lastFetchedAt = computed(() =>
    _ts.value ? new Date(_ts.value).toLocaleTimeString('es-BO') : null,
  )

  const timeRest = computed(() =>{
    const d =  _ts.value + ttl
    return d ? new Date(d).toLocaleTimeString('es-BO'): null
  }
  )

  const hasData = computed(() => _data.value !== null && (_data.value as unknown[])?.length !== 0)

  // ── Métodos ─────────────────────────────────────────────────

  /**
   * Fetch principal con deduplicación y TTL.
   * @param force  Si true, ignora el TTL y refuerza la recarga
   * @param loader Función async que devuelve los datos frescos
   */
  async function fetch(force: boolean, loader: () => Promise<T>): Promise<T> {
    // Caché válida y no forzamos: retornar inmediatamente
    if (!force && isValid.value && _data.value !== null) {
      return _data.value as T
    }

    // Request ya en vuelo: reutilizar la misma promesa
    if (_inflight) {
      return _inflight
    }

    _loading.value = true
    _error.value = null

    _inflight = loader()
      .then((result) => {
        _data.value = result
        _ts.value = Date.now()
        return result
      })
      .catch((e: Error) => {
        _error.value = e.message
        throw e
      })
      .finally(() => {
        _loading.value = false
        _inflight = null
      })

    return _inflight
  }

  /**
   * Invalida la caché sin disparar un nuevo request.
   * El próximo fetchAll() recargará desde el backend.
   */
  function invalidate(): void {
    _ts.value = 0
    _data.value = null
    if (import.meta.env.DEV) {
      console.debug(`[useStoreCache:${name}] Cache invalidada`)
    }
  }

  /**
   * Actualiza un ítem concreto dentro del array cacheado
   * sin necesidad de recargar todo desde el backend.
   * Solo funciona cuando T es un array.
   */
  function patchItem<K extends keyof (T extends (infer U)[] ? U : never)>(
    id: string,
    idField: K,
    updatedItem: T extends (infer U)[] ? U : never,
  ): void {
    if (!Array.isArray(_data.value)) return
    const arr = _data.value as (T extends (infer U)[] ? U : never)[]
    const idx = arr.findIndex((item) => (item as Record<string, unknown>)[idField as string] === id)
    if (idx !== -1) {
      arr[idx] = updatedItem
    }
  }

  /**
   * Agrega un ítem al array cacheado sin recargar.
   * Solo funciona cuando T es un array.
   */
  function pushItem(newItem: T extends (infer U)[] ? U : never): void {
    if (!Array.isArray(_data.value)) return
    ;(_data.value as (T extends (infer U)[] ? U : never)[]).push(newItem)
  }

  /**
   * Elimina un ítem del array cacheado sin recargar.
   * Solo funciona cuando T es un array.
   */
  function removeItem<K extends keyof (T extends (infer U)[] ? U : never)>(
    id: string,
    idField: K,
  ): void {
    if (!Array.isArray(_data.value)) return
    const arr = _data.value as (T extends (infer U)[] ? U : never)[]
    const idx = arr.findIndex((item) => (item as Record<string, unknown>)[idField as string] === id)
    if (idx !== -1) arr.splice(idx, 1)
  }

  return {
    // Estado reactivo (solo lectura desde afuera)
    data: _data,
    loading: _loading,
    error: _error,
    // Computed
    isValid,
    isStale,
    lastFetchedAt,
    hasData,
    timeRest,
    // Métodos
    fetch,
    invalidate,
    patchItem,
    pushItem,
    removeItem,
  }
}
