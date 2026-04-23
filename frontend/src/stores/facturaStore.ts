// =============================================================
// facturaStore.ts — Estado global de facturas y POS
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Factura, FacturaForm, ItemCarrito } from 'src/types'
import { facturaService } from 'src/services/facturaService'

export const useFacturaStore = defineStore('factura', () => {
  // ── State ────────────────────────────────────────────────
  const items = ref<Factura[]>([])
  const carrito = ref<ItemCarrito[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // ── Getters ──────────────────────────────────────────────
  const emitidas = computed(() => items.value.filter((f) => f.estado === 'EMITIDA'))

  const totalCarrito = computed(() =>
    carrito.value.reduce((sum, item) => sum + item.subtotal, 0),
  )

  const cantidadItemsCarrito = computed(() =>
    carrito.value.reduce((sum, item) => sum + item.cantidad, 0),
  )

  // ── Actions — Facturas ────────────────────────────────────
  async function fetchAll(filtros?: { sucursalId?: string; estado?: string }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await facturaService.getAll(filtros)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(form: FacturaForm): Promise<Factura> {
    saving.value = true
    error.value = null
    try {
      const nueva = await facturaService.create(form)
      items.value.unshift(nueva)
      return nueva
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function anular(id: string): Promise<void> {
    saving.value = true
    try {
      await facturaService.anular(id)
      const idx = items.value.findIndex((f) => f.id === id)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], estado: 'ANULADA' }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function imprimirFactura(id: string): Promise<void> {
    const html = await facturaService.generarHtml(id)
    const ventana = window.open('', '_blank')
    if (ventana) {
      ventana.document.write(html)
      ventana.document.close()
      setTimeout(() => ventana.print(), 500)
    }
  }

  // ── Actions — Carrito POS ─────────────────────────────────
  function agregarAlCarrito(item: ItemCarrito): void {
    const existe = carrito.value.find((i) => i.productoId === item.productoId)
    if (existe) {
      const nuevaCantidad = existe.cantidad + item.cantidad
      if (nuevaCantidad > existe.stockDisponible) return
      existe.cantidad = nuevaCantidad
      existe.subtotal = nuevaCantidad * existe.precioUnitario
    } else {
      carrito.value.push({ ...item })
    }
  }

  function actualizarCantidad(productoId: string, cantidad: number): void {
    const item = carrito.value.find((i) => i.productoId === productoId)
    if (!item) return
    if (cantidad <= 0) {
      quitarDelCarrito(productoId)
      return
    }
    if (cantidad > item.stockDisponible) return
    item.cantidad = cantidad
    item.subtotal = cantidad * item.precioUnitario
  }

  function quitarDelCarrito(productoId: string): void {
    carrito.value = carrito.value.filter((i) => i.productoId !== productoId)
  }

  function limpiarCarrito(): void {
    carrito.value = []
  }

  function clearError(): void { error.value = null }

  return {
    items, carrito, loading, saving, error,
    emitidas, totalCarrito, cantidadItemsCarrito,
    fetchAll, create, anular, imprimirFactura,
    agregarAlCarrito, actualizarCantidad, quitarDelCarrito, limpiarCarrito, clearError,
  }
})
