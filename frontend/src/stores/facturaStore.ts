// =============================================================
// facturaStore.ts — Estado global de documentos de venta y POS
// =============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DocumentoVenta,
  DocumentoVentaForm,
  ItemCarrito,
  MetodoPago,
  TipoDescuento,
} from 'src/types'
import { facturaService } from 'src/services/facturaService'
//import { useLoading } from 'src/composables/useLoading.ts'

function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function calcularDescuentoLinea(
  precioUnitario: number,
  cantidad: number,
  descuentoTipo: TipoDescuento,
  descuentoValor: number,
): number {
  const base = round2(precioUnitario * cantidad)
  if (descuentoTipo === 'PORCENTAJE') return round2(base * ((descuentoValor || 0) / 100))
  if (descuentoTipo === 'MONTO') return round2(descuentoValor || 0)
  return 0
}

function recalcularItem(item: ItemCarrito): ItemCarrito {
  const descuentoMonto = calcularDescuentoLinea(
    item.precioUnitario,
    item.cantidad,
    item.descuentoTipo,
    item.descuentoValor,
  )
  return {
    ...item,
    descuentoMonto,
    subtotal: round2((item.precioUnitario * item.cantidad) - descuentoMonto),
  }
}

export const useFacturaStore = defineStore('factura', () => {
  const items = ref<DocumentoVenta[]>([])
  const carrito = ref<ItemCarrito[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const emitidas = computed(() => items.value.filter((doc) => doc.estado === 'EMITIDA'))
  const subtotalCarrito = computed(() => round2(carrito.value.reduce((sum, item) => sum + item.subtotal, 0)))
  const descuentoTotalCarrito = computed(() =>
    round2(carrito.value.reduce((sum, item) => sum + item.descuentoMonto, 0)),
  )
  const totalCarrito = computed(() => subtotalCarrito.value)
  const cantidadItemsCarrito = computed(() =>
    carrito.value.reduce((sum, item) => sum + item.cantidad, 0),
  )

  async function fetchAll(filtros?: {
    sucursalId?: string
    estado?: string
    tipo?: string
    desde?: string
    hasta?: string
  }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await facturaService.getAll(filtros)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function create(form: DocumentoVentaForm): Promise<DocumentoVenta> {
    saving.value = true
    error.value = null
    try {
      const nuevo = await facturaService.create(form)
      items.value.unshift(nuevo)
      return nuevo
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
      const index = items.value.findIndex((doc) => doc.id === id)
      if (index !== -1) items.value[index] = { ...items.value[index], estado: 'ANULADA' }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function convertir(payload: {
    documentoOrigenId: string
    tipoDestino: 'FACTURA' | 'VENTA_SIN_FACTURA'
    pagos?: Array<{
      metodoPago: MetodoPago
      monto: number
      referencia?: string
      moneda?: string
      detalle?: string
    }>
  }): Promise<DocumentoVenta> {
    saving.value = true
    error.value = null
    try {
      const convertido = await facturaService.convertir(payload)
      items.value.unshift(convertido)
      const origen = items.value.find((doc) => doc.id === payload.documentoOrigenId)
      if (origen) origen.estado = 'CONVERTIDA'
      return convertido
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function imprimirFactura(id: string): Promise<void> {
    const html = await facturaService.generarHtml(id)
    const ventana = window.open('', '_blank','popup')
    if (ventana) {
      ventana.document.write(html)
      ventana.document.close()
      setTimeout(() => {
        ventana.print()
        ventana.close()
      }, 400)
    }
  }

  function agregarAlCarrito(item: ItemCarrito): void {
    const existente = carrito.value.find((entry) => entry.productoId === item.productoId)
    if (existente) {
      const nuevaCantidad = existente.cantidad + item.cantidad
      if (nuevaCantidad > existente.stockDisponible) return
      existente.cantidad = nuevaCantidad
      Object.assign(existente, recalcularItem(existente))
      return
    }
    carrito.value.push(recalcularItem({ ...item }))
  }

  function actualizarCantidad(productoId: string, cantidad: number): void {
    const item = carrito.value.find((entry) => entry.productoId === productoId)
    if (!item) return
    if (cantidad <= 0) {
      quitarDelCarrito(productoId)
      return
    }
    if (cantidad > item.stockDisponible) return
    item.cantidad = cantidad
    Object.assign(item, recalcularItem(item))
  }

  function actualizarPrecioUnitario(productoId: string, precioUnitario: number): void {
    const item = carrito.value.find((entry) => entry.productoId === productoId)
    if (!item) return
    item.precioUnitario = Math.max(0, round2(precioUnitario))
    Object.assign(item, recalcularItem(item))
  }

  function actualizarDescuento(productoId: string, descuentoTipo: TipoDescuento, descuentoValor: number): void {
    const item = carrito.value.find((entry) => entry.productoId === productoId)
    if (!item) return
    item.descuentoTipo = descuentoTipo
    item.descuentoValor = Math.max(0, round2(descuentoValor))
    Object.assign(item, recalcularItem(item))
  }

  function actualizarNotas(productoId: string, notas: string): void {
    const item = carrito.value.find((entry) => entry.productoId === productoId)
    if (!item) return
    item.notas = notas
  }

  function quitarDelCarrito(productoId: string): void {
    carrito.value = carrito.value.filter((entry) => entry.productoId !== productoId)
  }

  function limpiarCarrito(): void {
    carrito.value = []
  }

  function clearError(): void {
    error.value = null
  }

  return {
    items,
    carrito,
    loading,
    saving,
    error,
    emitidas,
    subtotalCarrito,
    descuentoTotalCarrito,
    totalCarrito,
    cantidadItemsCarrito,
    fetchAll,
    create,
    anular,
    convertir,
    imprimirFactura,
    agregarAlCarrito,
    actualizarCantidad,
    actualizarPrecioUnitario,
    actualizarDescuento,
    actualizarNotas,
    quitarDelCarrito,
    limpiarCarrito,
    clearError,
  }
})
