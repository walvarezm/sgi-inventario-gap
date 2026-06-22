import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { LocalStorage } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'

const STORAGE_KEY = 'sgi_sucursal_activa'

/**
 * Estado global de la sucursal activa.
 *
 * - Usuarios no-admin: la sucursal activa está fijada a su propia sucursal
 *   (no se puede cambiar).
 * - Usuarios admin / supervisor / con permiso `sucursales.ver`: la sucursal
 *   activa puede cambiarse desde el selector del header o desde cualquier
 *   página. Persiste en LocalStorage.
 */
export const useSucursalActivaStore = defineStore('sucursal-activa', () => {
  const authStore = useAuthStore()
  const sucursalStore = useSucursalStore()

  const puedeCambiarSucursal = computed(
    () => authStore.isGlobal || authStore.can('sucursales.ver'),
  )

  function readPersisted(): string | null {
    if (typeof window === 'undefined') return null
    const stored = LocalStorage.getItem(STORAGE_KEY)
    return typeof stored === 'string' && stored ? stored : null
  }

  const overrideId = ref<string | null>(readPersisted())

  const sucursalId = computed<string>(() => {
    if (!puedeCambiarSucursal.value) {
      return authStore.sucursalId ?? ''
    }
    return overrideId.value ?? authStore.sucursalId ?? ''
  })

  const sucursal = computed(() => {
    const id = sucursalId.value
    if (!id) return null
    return sucursalStore.getById(id) ?? null
  })

  function setSucursal(id: string): void {
    if (!puedeCambiarSucursal.value) return
    //if (!id || !sucursalStore.getById(id)) return
    if (!id) return
    overrideId.value = id
    LocalStorage.set(STORAGE_KEY, id)
  }

  function reset(): void {
    overrideId.value = null
    LocalStorage.remove(STORAGE_KEY)
  }

  // Si el usuario cambia de rol/cuenta y su sucursal ya no es válida, limpiar
  watch(
    () => authStore.sucursalId,
    (nuevo) => {
      if (!nuevo) {
        overrideId.value = null
        return
      }
      if (overrideId.value && !sucursalStore.getById(overrideId.value)) {
        overrideId.value = nuevo
        LocalStorage.set(STORAGE_KEY, nuevo)
      }
    },
  )

  return {
    puedeCambiarSucursal,
    sucursalId,
    sucursal,
    setSucursal,
    reset,
  }
})
