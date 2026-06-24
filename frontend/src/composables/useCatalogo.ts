// =============================================================
// useCatalogo.ts — Composable del catálogo por sucursal
// =============================================================
import { ref, computed } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { useCataloStore } from 'src/stores/cataloStore'
import { TODAS_LAS_SUCURSALES } from 'src/composables/useSucursalCatalog.ts'
//import { useLoading } from 'src/composables/useLoading.ts'

export function useCatalogo() {
  const cataloStore = useCataloStore()

  const productosSucursal = ref<ProductoCatalogo[]>([])
  const busqueda = ref('')
  const sucursalFiltro = ref<string | null>(null)
  const categoriaFiltro = ref<string | null>(null)
  const marcaFiltro = ref<string | null>(null)
  const vistaTabla = ref(true)
  const PRODUCTOS_SIN_RESTRICCION = new Set<string>(['f14fe181-7896-4c19-8a92-b87bc8511d09'])

  const productosTotalEnStock = computed(() => {
    const base = productosSucursal.value
    if (sucursalFiltro.value === null || sucursalFiltro.value === TODAS_LAS_SUCURSALES) {
      return base.filter((p) => !PRODUCTOS_SIN_RESTRICCION.has(p.id))
    }
    return base.filter(
      (p) =>
        p.sucursalId === sucursalFiltro.value &&
        !PRODUCTOS_SIN_RESTRICCION.has(p.id)
        )
  })

  const productosFiltrados = computed( () => {

    cataloStore.loading = true
    //useLoading(true, 'Cargando Catalogo Filtrado...')

    let lista = productosSucursal.value
      .filter((p) => !PRODUCTOS_SIN_RESTRICCION.has(p.id))

    /*   if (busqueda.value) {
      const q = busqueda.value.toLowerCase()
      lista = lista.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q),
      )
    }*/
    if (sucursalFiltro.value) {
      lista = lista.filter((p) => p.sucursalId === sucursalFiltro.value)
    }
    if (busqueda.value) {
      // Busqueda avanzada
      // Divide el criterio en tokens y exige que TODOS estén presentes en algún campo
      const tokens = busqueda.value
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0)

      lista = lista.filter((p) => {
        if (!tokens.length) return false
        const haystack = `${p.marca} ${p.sku} ${p.nombre}`.toLowerCase()
        return tokens.every((t) => haystack.includes(t))
      })
    }
    if (categoriaFiltro.value) {
      lista = lista.filter((p) => p.categoriaId === categoriaFiltro.value)
    }
    if (marcaFiltro.value) {
      lista = lista.filter((p) => p.marca === marcaFiltro.value || p.marcaId === marcaFiltro.value)
    }
    /*console.log('sucursalFiltro.value', sucursalFiltro.value)
    console.log('categoriaFiltro.value', categoriaFiltro.value)
    console.log('marcaFiltro.value', marcaFiltro.value)
    console.log('productos.value', productosSucursal.value)
    console.log('productosFiltrados', lista)*/

    cataloStore.loading = false
   // useLoading(false)

    return lista
  })

  const conStockBajo = computed(() =>
    productosSucursal.value.filter((p) => p.stockBajo)
  )
  const totalProductos = computed(() => productosSucursal.value.length)

  async function cargarCatalogo(sucursalId: string, force = false): Promise<void> {
    productosSucursal.value = await cataloStore.getCatalogo(sucursalId, force)
  }

  function limpiarFiltros(): void {
    busqueda.value = ''
    categoriaFiltro.value = null
    marcaFiltro.value = null
  }

  function toggleVista(): void { vistaTabla.value = !vistaTabla.value }

  return {
    productosTotalEnStock,
    productos: productosSucursal, busqueda, sucursalFiltro, categoriaFiltro, marcaFiltro, vistaTabla,
    productosFiltrados, conStockBajo, totalProductos,
    loading: computed(() => cataloStore.loading),
    error: computed(() => cataloStore.error),
    cargarCatalogo, limpiarFiltros, toggleVista,
  }
}
