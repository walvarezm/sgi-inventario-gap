// =============================================================
// useCatalogo.ts — Composable del catálogo por sucursal
// =============================================================
import { ref, computed } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { useCataloStore } from 'src/stores/cataloStore'

export function useCatalogo() {
  const cataloStore = useCataloStore()

  const productos = ref<ProductoCatalogo[]>([])
  const busqueda = ref('')
  const categoriaFiltro = ref<string | null>(null)
  const vistaTabla = ref(true)

  const productosFiltrados = computed(() => {
    let lista = productos.value
    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase()
      lista = lista.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q),
      )
    }
    if (categoriaFiltro.value) {
      lista = lista.filter((p) => p.categoriaId === categoriaFiltro.value)
    }
    return lista
  })

  const conStockBajo = computed(() => productos.value.filter((p) => p.stockBajo))
  const totalProductos = computed(() => productos.value.length)

  async function cargarCatalogo(sucursalId: string, force = false): Promise<void> {
    productos.value = await cataloStore.getCatalogo(sucursalId, force)
  }

  function limpiarFiltros(): void {
    busqueda.value = ''
    categoriaFiltro.value = null
  }

  function toggleVista(): void { vistaTabla.value = !vistaTabla.value }

  return {
    productos, busqueda, categoriaFiltro, vistaTabla,
    productosFiltrados, conStockBajo, totalProductos,
    loading: computed(() => cataloStore.loading),
    error: computed(() => cataloStore.error),
    cargarCatalogo, limpiarFiltros, toggleVista,
  }
}
