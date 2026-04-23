// =============================================================
// usePOS.ts — Composable del Punto de Venta
// =============================================================
import { ref, computed } from 'vue'
import { useFacturaStore } from 'src/stores/facturaStore'
import { useProductoStore } from 'src/stores/productoStore'
import { inventarioService } from 'src/services/inventarioService'
import type { ItemCarrito, ProductoCatalogo } from 'src/types'

export function usePOS() {
  const facturaStore = useFacturaStore()
  const productoStore = useProductoStore()

  const busqueda = ref('')
  const cliente = ref('Sin nombre')
  const procesando = ref(false)

  const resultadosBusqueda = computed(() => {
    if (!busqueda.value.trim()) return []
    const q = busqueda.value.toLowerCase()
    return productoStore.activos
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q),
      )
      .slice(0, 8)
  })

  function agregarProducto(producto: {
    id: string
    sku: string
    nombre: string
    marca: string
    imagenUrl: string
    precioFinal: number
    stock: number
  }): void {
    if (producto.stock <= 0) return

    const item: ItemCarrito = {
      productoId: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      marca: producto.marca,
      imagenUrl: producto.imagenUrl,
      precioUnitario: producto.precioFinal,
      cantidad: 1,
      subtotal: producto.precioFinal,
      stockDisponible: producto.stock,
    }
    facturaStore.agregarAlCarrito(item)
    busqueda.value = ''
  }

  function agregarDesdeCatalogo(producto: ProductoCatalogo): void {
    agregarProducto({
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      marca: producto.marca,
      imagenUrl: producto.imagenUrl,
      precioFinal: producto.precioFinal,
      stock: producto.stock,
    })
  }

  async function procesarVenta(sucursalId: string): Promise<string> {
    if (!facturaStore.carrito.length) throw new Error('El carrito está vacío')

    procesando.value = true
    try {
      const factura = await facturaStore.create({
        cliente: cliente.value || 'Sin nombre',
        sucursalId,
        tipo: 'FACTURA',
        items: facturaStore.carrito.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      })
      facturaStore.limpiarCarrito()
      cliente.value = 'Sin nombre'
      return factura.id
    } finally {
      procesando.value = false
    }
  }

  return {
    busqueda,
    cliente,
    procesando,
    resultadosBusqueda,
    carrito: computed(() => facturaStore.carrito),
    totalCarrito: computed(() => facturaStore.totalCarrito),
    cantidadItems: computed(() => facturaStore.cantidadItemsCarrito),
    agregarProducto,
    agregarDesdeCatalogo,
    procesarVenta,
    quitarItem: facturaStore.quitarDelCarrito,
    actualizarCantidad: facturaStore.actualizarCantidad,
    limpiarCarrito: facturaStore.limpiarCarrito,
  }
}
