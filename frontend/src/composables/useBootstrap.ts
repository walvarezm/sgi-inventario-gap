// =============================================================
// useBootstrap.ts — Carga inicial paralela post-login.
//
// PROPÓSITO:
//   Ejecutar una sola vez, justo después del login exitoso,
//   la carga de TODOS los catálogos maestros en paralelo
//   (Promise.all), eliminando los cold-starts secuenciales
//   que ocurren cuando cada módulo carga sus propios datos.
//
// COMPORTAMIENTO:
//   - Si los stores ya tienen datos válidos en caché, los
//     fetchAll internos retornan inmediatamente sin llamar
//     al backend (gracias a useStoreCache).
//   - Si alguno falla, los demás continúan (Promise.allSettled).
//   - Expone `bootstrapDone` y `bootstrapError` para que
//     LoginPage pueda mostrar feedback.
//
// USO en LoginPage.vue (tras login exitoso):
//   const bootstrap = useBootstrap()
//   await bootstrap.run()
//   router.push('/dashboard')
// =============================================================
import { ref } from 'vue'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useMarcaStore } from 'src/stores/marcaStore'
import { useLoading } from 'src/composables/useLoading'

const bootstrapDone = ref(false)
const bootstrapError = ref<string | null>(null)
const bootstrapRunning = ref(false)

export function useBootstrap() {
  /**
   * Carga en paralelo todos los catálogos maestros.
   * Llama a fetchAll de cada store; si el store ya tiene caché
   * válida, retorna sin ir al backend.
   *
   * @param force  Si true, invalida todas las cachés antes de recargar
   */
  async function run(force = false): Promise<void> {
    // Evitar doble ejecución concurrente
    if (bootstrapRunning.value) return

    bootstrapRunning.value = true
    bootstrapError.value = null
    useLoading(true, 'Inicializando sistema...')

    const productoStore = useProductoStore()
    const sucursalStore = useSucursalStore()
    const categoriaStore = useCategoriaStore()
    const marcaStore = useMarcaStore()

    if (force) {
      productoStore.forceReload()
      sucursalStore.forceReload()
      categoriaStore.forceReload()
      marcaStore.forceReload()
    }

    // Cargar en paralelo; si alguno falla no bloquea a los demás
    const results = await Promise.allSettled([
      productoStore.fetchAll(),
      sucursalStore.fetchAll(),
      categoriaStore.fetchAll(),
      marcaStore.fetchAll(),
    ])

    useLoading(false)
    bootstrapRunning.value = false

    // Recolectar errores parciales
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason as Error).message)

    if (errors.length) {
      bootstrapError.value = errors.join(' | ')
      // No lanzamos: la app puede funcionar con datos parciales
      console.warn('[Bootstrap] Errores parciales:', bootstrapError.value)
    } else {
      bootstrapDone.value = true
    }
  }

  /**
   * Refresca todos los catálogos maestros forzando recarga
   * desde el backend. Útil en el botón "Recargar todo" del
   * layout principal.
   */
  async function refresh(): Promise<void> {
    await run(true)
  }

  return {
    run,
    refresh,
    bootstrapDone,
    bootstrapError,
    bootstrapRunning,
  }
}
