// =============================================================
// usePOS.ts — Composable del Punto de Venta multidocumento
// =============================================================
import { ref, computed } from 'vue'
import { useFacturaStore } from 'src/stores/facturaStore'
import type {
  DocumentoVentaForm,
  ItemCarrito,
  MetodoPago,
  ProductoCatalogo,
  TipoDescuento,
  TipoDocumentoVenta,
} from 'src/types'
import { useCataloStore } from 'src/stores/cataloStore.ts'
import { useNotify } from 'src/composables/useNotify.ts'

function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function usePOS() {
  const facturaStore = useFacturaStore()
  const cataloStore = useCataloStore()
  const { notifyWarning } = useNotify()

  const busqueda = ref('')
  const tipoDocumento = ref<TipoDocumentoVenta>('FACTURA')
  const cliente = ref({
    nombre: 'Sin nombre',
    nitCi: '',
    telefono: '',
    email: '',
  })
  const notas = ref('')
  const observaciones = ref('')
  const vigenciaHasta = ref('')
  const procesando = ref(false)
  const pagos = ref<Array<{
    metodoPago: MetodoPago
    monto: number
    referencia: string
    detalle: string
  }>>([
    { metodoPago: 'EFECTIVO', monto: 0, referencia: '', detalle: '' },
  ])

  const sucursalActiva = computed(() => (cataloStore.sucursalIdCurrent as string) ?? '')
  const subtotal = computed(() => facturaStore.subtotalCarrito)
  const descuentoTotal = computed(() => facturaStore.descuentoTotalCarrito)
  const impuesto = computed(() =>
    tipoDocumento.value === 'FACTURA' //|| tipoDocumento.value === 'VENTA_SIN_FACTURA'
      ? round2(subtotal.value * 0.13)
      : 0,
  )
  const totalDocumento = computed(() => round2(subtotal.value + impuesto.value))
  const requierePago = computed(() =>
    tipoDocumento.value === 'FACTURA' || tipoDocumento.value === 'VENTA_SIN_FACTURA',
  )
  const esDocumentoComercial = computed(() =>
    tipoDocumento.value === 'PROFORMA' || tipoDocumento.value === 'COTIZACION',
  )

  const resultadosBusqueda = computed(() => {
    let resultado
    if (!busqueda.value.trim()) return []
    const q = busqueda.value.toLowerCase()
    const cache = cataloStore.cache[sucursalActiva.value]
    if (!cache) return []

    if (busqueda.value) {
      // Busqueda avanzada
      // Divide el criterio en tokens y exige que TODOS estén presentes en algún campo
      const tokens = busqueda.value
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0)

      resultado = cache.data.filter((p) => {
        if (!tokens.length) return false
        const haystack = `${p.marca} ${p.sku} ${p.nombre}`.toLowerCase()
        return tokens.every((t) => haystack.includes(t))
      })
    }

    return resultado

    /*return cache.data
      .filter((producto) =>
        producto.sku.toLowerCase().includes(q) ||
        producto.nombre.toLowerCase().includes(q) ||
        producto.marca.toLowerCase().includes(q),
      )
      .slice(0, 8)*/
  })

  function normalizarPagos(): DocumentoVentaForm['pagos'] {
    if (!requierePago.value) return []

    const total = totalDocumento.value
    const rows = pagos.value
      .map((pago) => ({
        metodoPago: pago.metodoPago,
        monto: round2(pago.monto),
        referencia: pago.referencia || '',
        detalle: pago.detalle || '',
        moneda: 'BOB',
      }))
      .filter((pago) => pago.metodoPago === 'CREDITO' || pago.monto > 0)

    if (!rows.length) {
      return [{
        metodoPago: 'EFECTIVO',
        monto: total,
        referencia: '',
        detalle: '',
        moneda: 'BOB',
      }]
    }

    if (rows.length === 1 && rows[0].metodoPago !== 'CREDITO' && rows[0].monto <= 0) {
      rows[0].monto = total
    }

    return rows
  }

  function agregarProducto(producto: {
    id: string
    sku: string
    nombre: string
    marca: string
    imagenUrl: string
    imagenLocation: string
    precioOfrecido?: number
    precioFinal: number
    stock: number
  }): void {
    if (producto.stock <= 0) {
      notifyWarning('Sin stock disponible')
      return
    }
    if (producto.precioFinal <= 0) {
      notifyWarning('El producto no tiene precio de venta configurado')
      return
    }

    const item: ItemCarrito = {
      productoId: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      marca: producto.marca,
      imagenUrl: producto.imagenUrl,
      imagenLocation: producto.imagenLocation,
      stockDisponible: producto.stock,
      precioLista: producto.precioOfrecido ?? producto.precioFinal,
      precioUnitario: producto.precioFinal,
      descuentoTipo: 'NINGUNO',
      descuentoValor: 0,
      descuentoMonto: 0,
      cantidad: 1,
      subtotal: producto.precioFinal,
      notas: '',
    }
    facturaStore.agregarAlCarrito(item)
    busqueda.value = ''
    sincronizarPagoSimple()
  }

  function agregarDesdeCatalogo(producto: ProductoCatalogo): void {
    agregarProducto({
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      marca: producto.marca,
      imagenUrl: producto.imagenUrl,
      imagenLocation: producto.imagenLocation,
      precioOfrecido: producto.precioOfrecido,
      precioFinal: producto.precioFinal,
      stock: producto.stock,
    })
  }

  function sincronizarPagoSimple(): void {
    if (!requierePago.value) return
    if (pagos.value.length === 1 && pagos.value[0]) {
      pagos.value[0].monto = totalDocumento.value
    }
  }

  function setTipoDocumento(tipo: TipoDocumentoVenta): void {
    tipoDocumento.value = tipo
    if (!requierePago.value) {
      pagos.value = [{ metodoPago: 'EFECTIVO', monto: 0, referencia: '', detalle: '' }]
    }
    sincronizarPagoSimple()
  }

  function setMetodoPago(metodoPago: MetodoPago): void {
    if (metodoPago === 'MIXTO') {
      pagos.value = [
        { metodoPago: 'EFECTIVO', monto: round2(totalDocumento.value / 2), referencia: '', detalle: '' },
        { metodoPago: 'QR', monto: round2(totalDocumento.value - round2(totalDocumento.value / 2)), referencia: '', detalle: '' },
      ]
      return
    }
    pagos.value = [{ metodoPago, monto: totalDocumento.value, referencia: '', detalle: '' }]
  }

  function actualizarPago(index: number, patch: Partial<(typeof pagos.value)[number]>): void {
    const current = pagos.value[index]
    if (!current) return
    pagos.value[index] = { ...current, ...patch }
  }

  function agregarPagoMixto(): void {
    pagos.value.push({ metodoPago: 'EFECTIVO', monto: 0, referencia: '', detalle: '' })
  }

  function quitarPagoMixto(index: number): void {
    if (pagos.value.length <= 1) return
    pagos.value.splice(index, 1)
  }

  function actualizarCantidad(productoId: string, cantidad: number): void {
    facturaStore.actualizarCantidad(productoId, cantidad)
    sincronizarPagoSimple()
  }

  function actualizarPrecio(productoId: string, precioUnitario: number): void {
    facturaStore.actualizarPrecioUnitario(productoId, precioUnitario)
    sincronizarPagoSimple()
  }

  function actualizarDescuento(productoId: string, descuentoTipo: TipoDescuento, descuentoValor: number): void {
    facturaStore.actualizarDescuento(productoId, descuentoTipo, descuentoValor)
    sincronizarPagoSimple()
  }

  function actualizarNotasItem(productoId: string, value: string): void {
    facturaStore.actualizarNotas(productoId, value)
  }

  function limpiarOperacion(): void {
    facturaStore.limpiarCarrito()
    cliente.value = { nombre: 'Sin nombre', nitCi: '', telefono: '', email: '' }
    notas.value = ''
    observaciones.value = ''
    vigenciaHasta.value = ''
    tipoDocumento.value = 'FACTURA'
    pagos.value = [{ metodoPago: 'EFECTIVO', monto: 0, referencia: '', detalle: '' }]
  }

  async function procesarVenta(sucursalId: string): Promise<{ id: string; tipo: TipoDocumentoVenta; numero: string }> {
    if (!facturaStore.carrito.length) throw new Error('El carrito está vacío')

    procesando.value = true
    try {
      const documento = await facturaStore.create({
        tipo: tipoDocumento.value,
        sucursalId,
        cliente: { ...cliente.value, nombre: cliente.value.nombre || 'Sin nombre' },
        items: facturaStore.carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioLista: item.precioLista,
          precioUnitario: item.precioUnitario,
          descuentoTipo: item.descuentoTipo,
          descuentoValor: item.descuentoValor,
          descuentoMonto: item.descuentoMonto,
          subtotal: item.subtotal,
          notas: item.notas || '',
        })),
        notas: notas.value,
        observaciones: observaciones.value,
        vigenciaHasta: esDocumentoComercial.value ? vigenciaHasta.value || undefined : undefined,
        pagos: normalizarPagos(),
      })
      limpiarOperacion()
      return { id: documento.id, tipo: documento.tipo, numero: documento.numero }
    } finally {
      procesando.value = false
    }
  }

  return {
    busqueda,
    tipoDocumento,
    cliente,
    notas,
    observaciones,
    vigenciaHasta,
    pagos,
    procesando,
    requierePago,
    esDocumentoComercial,
    resultadosBusqueda,
    carrito: computed(() => facturaStore.carrito),
    subtotal,
    descuentoTotal,
    impuesto,
    totalDocumento,
    totalCarrito: computed(() => facturaStore.totalCarrito),
    cantidadItems: computed(() => facturaStore.cantidadItemsCarrito),
    agregarProducto,
    agregarDesdeCatalogo,
    setTipoDocumento,
    setMetodoPago,
    actualizarPago,
    agregarPagoMixto,
    quitarPagoMixto,
    procesarVenta,
    quitarItem: facturaStore.quitarDelCarrito,
    actualizarCantidad,
    actualizarPrecio,
    actualizarDescuento,
    actualizarNotasItem,
    limpiarCarrito: facturaStore.limpiarCarrito,
    limpiarOperacion,
  }
}
