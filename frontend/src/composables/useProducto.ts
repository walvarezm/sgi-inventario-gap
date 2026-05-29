// =============================================================
// useCatalogo.ts — Composable del catálogo por sucursal
// =============================================================
import { ref } from 'vue'
import { useProductoStore } from 'src/stores/productoStore.ts'
import { truncate } from 'src/utils/formatters.ts'

export function useProduct() {
  const productoStore = useProductoStore()


  // ── Opciones de producto (filtrable) ─────────────────────────
  const opcionesProducto = ref(
    productoStore.activos.map((p) => ({
      label: truncate(`[${p.marca}][${p.sku}] — ${p.nombre}`, 100),
      value: p.id,
    })),
  )

  function filtrarProductos(val: string, update: (fn: () => void) => void): void {
    update(() => {
      // Divide el criterio en tokens y exige que TODOS estén presentes en algún campo
      const tokens = val
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0)

      opcionesProducto.value = productoStore.activos
        .filter((p) => {
          if (!tokens.length) return false
          const haystack = `${p.marca} ${p.sku} ${p.nombre}`.toLowerCase()
          return tokens.every((t) => haystack.includes(t))
        })
        .map((p) => ({
          label: truncate(`[${p.marca}] - [${p.sku}] — ${p.nombre}`, 100),
          value: p.id,
        }))
    })
  }

  return {
    opcionesProducto,
    filtrarProductos,



    /*productos,
    busqueda,
    categoriaFiltro,
    marcaFiltro,
    vistaTabla,
    conStockBajo,
    totalProductos,
    limpiarFiltros,*/
  }
}
