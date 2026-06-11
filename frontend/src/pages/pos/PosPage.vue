<template>
  <q-page class="sgi-page">
    <div class="row items-center q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md">
        <div class="sgi-page-title">Punto de Venta</div>
        <div class="text-muted text-body2">
          Ventas, proformas y cotizaciones desde un solo flujo
        </div>
      </div>
      <div class="col-12 col-md-auto">
        <q-select
          v-model="sucursalActiva"
          :options="opcionesSucursal"
          outlined
          dense
          emit-value
          map-options
          style="min-width: 240px"
          :disable="!authStore.isGlobal"
          @update:model-value="cargarCatalogo"
        >
          <template #prepend><q-icon name="store" /></template>
        </q-select>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-lg-8">
        <div class="q-mb-md" style="position: relative">
          <ProductoBuscador
            v-model="pos.busqueda.value"
            :resultados="pos.resultadosBusqueda.value as ProductoCatalogo[]"
            @seleccionar="agregarDesdeResultado"
            @escanear="activarEscaner"
          />
        </div>

        <q-card class="sgi-card carrito-card" flat>
          <q-card-section class="row items-center q-pb-sm">
            <div class="text-subtitle1 text-weight-bold">
              <q-icon name="shopping_cart" class="q-mr-xs" />
              Carrito (Productos)
              <q-badge v-if="pos.cantidadItems.value" color="primary" floating>
                {{ pos.cantidadItems.value }}
              </q-badge>
            </div>
            <q-space />
            <q-btn
              v-if="pos.carrito.value.length"
              flat
              dense
              color="negative"
              icon="delete_sweep"
              label="Vaciar"
              size="sm"
              @click="confirmarVaciar"
            />
          </q-card-section>

          <q-separator />

          <q-scroll-area style="height: 520px" class="q-pa-sm">
            <div
              v-if="!pos.carrito.value.length"
              class="full-width column flex-center q-pa-xl text-muted"
            >
              <q-icon name="shopping_cart" size="48px" style="opacity: 0.2" class="q-mb-sm" />
              <span class="text-body2">Carrito vacío</span>
              <span class="text-caption">Busca o toca un producto para agregarlo</span>
            </div>

            <CarritoItem
              v-for="item in pos.carrito.value"
              :key="item.productoId"
              :item="item"
              @quitar="quitarItem"
              @cambiar-cantidad="pos.actualizarCantidad"
              @cambiar-precio="pos.actualizarPrecio"
              @cambiar-descuento="pos.actualizarDescuento"
            />
          </q-scroll-area>

          <q-separator />

          <q-card-section v-if="false" class="q-pb-sm">
            <div class="text-subtitle2 text-weight-bold">Acceso rápido</div>
          </q-card-section>
          <q-card-section v-if="false" class="q-pt-none">
            <div v-if="cargandoCatalogo" class="flex flex-center q-pa-xl">
              <q-spinner color="primary" size="40px" />
            </div>
            <div v-else class="row q-col-gutter-md">
              <!-- Vista tarjetas -->
              <!--              <CatalogoTarjeta
                :productos="productosCatalogo.slice(0, 20)"
                :loading="pos.procesando.value"
                @ver-qr="agregarDesdeResultado"
                @editar="agregarDesdeResultado"
              />-->

              <div
                v-for="producto in productosCatalogo.slice(0, 9)"
                :key="producto.id"
                class="col-6 col-sm-4 col-md-4"
              >
                <q-card
                  class="producto-rapido-card cursor-pointer sgi-card catalogo-card"
                  flat
                  bordered
                  :class="{ agotado: producto.stock <= 0 }"
                  @click="agregarDesdeResultado(producto)"
                >
                  <div class="card-image-wrapper">
                    <ProductoImagenIFrame
                      :imagen-url="producto.imagenUrl"
                      :width="40"
                      :height="40"
                      :imagen-location="producto.imagenLocation"
                      :type="'card'"
                    />
                    <q-badge
                      v-if="producto.stock <= 0"
                      floating
                      color="grey"
                      label="Agotado"
                      class="edit-fab"
                    />
                  </div>

                  <div class="q-pa-xs">
                    <div class="text-caption ellipsis text-weight-medium">
                      {{ producto.sku }} | {{ producto.marca }}
                    </div>
                    <div class="text-caption ellipsis text-weight-medium">
                      {{ producto.nombre }}
                      <q-tooltip>{{ producto.nombre }}</q-tooltip>
                    </div>
                    <div class="text-subtitle2 text-positive text-weight-bold">
                      {{ formatCurrency(producto.precioFinal) }}
                    </div>
                    <div class="text-right">
                      <q-chip
                        dense
                        size="sm"
                        :color="
                          producto.stock <= 0 ? 'grey' : producto.stockBajo ? 'orange' : 'positive'
                        "
                        text-color="white"
                      >
                        Stock: {{ producto.stock }}
                      </q-chip>
                    </div>
                  </div>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card class="sgi-card" flat>
          <!--          <q-card-section class="row items-center q-pb-sm">
            <div class="text-subtitle1 text-weight-bold">
              <q-icon name="shopping_cart" class="q-mr-xs" />
              Carrito
              <q-badge v-if="pos.cantidadItems.value" color="primary" floating>
                {{ pos.cantidadItems.value }}
              </q-badge>
            </div>
            <q-space />
            <q-btn
              v-if="pos.carrito.value.length"
              flat
              dense
              color="negative"
              icon="delete_sweep"
              label="Vaciar"
              size="sm"
              @click="confirmarVaciar"
            />
          </q-card-section>-->

          <q-separator />

          <q-card-section class="q-gutter-sm">
            <q-select
              :model-value="pos.tipoDocumento.value"
              :options="tiposDocumentoDisponibles"
              label="Tipo de documento"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="pos.setTipoDocumento"
            >
              <template #prepend><q-icon name="receipt_long" /></template>
            </q-select>
            <q-separator />
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-8">
                <q-input v-model="pos.cliente.value.nombre" label="Cliente" outlined dense>
                  <template #prepend><q-icon name="person" /></template>
                </q-input>
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="pos.cliente.value.nitCi" label="NIT/CI" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="pos.cliente.value.telefono" label="Teléfono" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="pos.cliente.value.email" label="Email" outlined dense />
              </div>
              <div v-if="pos.esDocumentoComercial.value" class="col-12 col-sm-6">
                <q-input
                  v-model="pos.vigenciaHasta.value"
                  label="Vigencia"
                  outlined
                  dense
                  type="date"
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!--          <q-scroll-area style="height: 320px" class="q-pa-sm">
            <div
              v-if="!pos.carrito.value.length"
              class="full-width column flex-center q-pa-xl text-muted"
            >
              <q-icon name="shopping_cart" size="48px" style="opacity: 0.2" class="q-mb-sm" />
              <span class="text-body2">Carrito vacío</span>
              <span class="text-caption">Busca o toca un producto para agregarlo</span>
            </div>

            <CarritoItem
              v-for="item in pos.carrito.value"
              :key="item.productoId"
              :item="item"
              @quitar="quitarItem"
              @cambiar-cantidad="pos.actualizarCantidad"
              @cambiar-precio="pos.actualizarPrecio"
              @cambiar-descuento="pos.actualizarDescuento"
            />
          </q-scroll-area>

          <q-separator />-->

          <q-card-section class="q-gutter-sm">
            <div v-if="pos.requierePago.value" class="q-gutter-sm">
              <div class="text-subtitle2 text-weight-medium">Pago</div>
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-8 q-pb-xs">
                  <q-select
                    :model-value="metodoPagoActual"
                    :options="opcionesPago"
                    label="Modalidad de pago"
                    outlined
                    dense
                    emit-value
                    map-options
                    @update:model-value="onMetodoPago"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-btn
                    v-if="metodoPagoActual === 'MIXTO'"
                    outline
                    dense
                    color="primary"
                    icon="add"
                    label="Agregar pago"
                    @click="pos.agregarPagoMixto"
                  />
                </div>
              </div>

              <div
                v-for="(pago, index) in pos.pagos.value"
                :key="`${pago.metodoPago}-${index}`"
                class="row q-col-gutter-sm items-center q-pb-xs"
              >
                <div class="col-12 col-sm-4">
                  <q-select
                    :model-value="pago.metodoPago"
                    :options="opcionesPagoItem"
                    label="Método"
                    outlined
                    dense
                    emit-value
                    map-options
                    @update:model-value="pos.actualizarPago(index, { metodoPago: $event })"
                  />
                </div>
                <div class="col-12 col-sm-3">
                  <q-input
                    :model-value="pago.monto"
                    label="Monto"
                    type="number"
                    outlined
                    dense
                    step="0.01"
                    @update:model-value="pos.actualizarPago(index, { monto: Number($event) || 0 })"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input
                    :model-value="pago.referencia"
                    label="Referencia"
                    outlined
                    dense
                    @update:model-value="
                      pos.actualizarPago(index, { referencia: String($event || '') })
                    "
                  />
                </div>
                <div class="col-12 col-sm-1 text-right">
                  <q-btn
                    v-if="pos.pagos.value.length > 1"
                    flat
                    round
                    dense
                    color="negative"
                    icon="close"
                    @click="pos.quitarPagoMixto(index)"
                  />
                </div>
              </div>
            </div>
            <q-separator />
            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <q-input
                  v-model="pos.notas.value"
                  label="Notas"
                  outlined
                  dense
                  type="textarea"
                  autogrow
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="pos.observaciones.value"
                  label="Observaciones"
                  outlined
                  dense
                  type="textarea"
                  autogrow
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-py-sm">
            <div class="row items-center q-mb-xs">
              <span class="text-muted">Subtotal:</span>
              <q-space />
              <span>{{ formatCurrency(pos.subtotal.value) }}</span>
            </div>
            <div class="row items-center q-mb-xs">
              <span class="text-muted">Descuento:</span>
              <q-space />
              <span>{{ formatCurrency(pos.descuentoTotal.value) }}</span>
            </div>
            <div class="row items-center q-mb-xs">
              <span class="text-muted">Impuesto:</span>
              <q-space />
              <span>{{ formatCurrency(pos.impuesto.value) }}</span>
            </div>
            <div class="row items-center text-h6 text-weight-bold">
              <span>Total:</span>
              <q-space />
              <span class="text-positive">{{ formatCurrency(pos.totalDocumento.value) }}</span>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-btn
              :label="accionPrincipal.label"
              :icon="accionPrincipal.icon"
              color="primary"
              unelevated
              size="md"
              class="full-width"
              :loading="pos.procesando.value"
              :disable="!pos.carrito.value.length || !sucursalActiva"
              @click="procesar"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="dialogDocumentoEmitido">
      <q-card class="sgi-card q-pa-lg text-center" style="min-width: 320px">
        <q-icon name="check_circle" color="positive" size="64px" />
        <div class="text-h6 text-weight-bold q-mt-sm">¡Operación completada!</div>
        <div class="text-muted q-mb-lg">
          {{ mensajeExito }}
        </div>
        <div class="row q-gutter-sm justify-center">
          <q-btn
            outline
            color="primary"
            icon="print"
            label="Imprimir"
            @click="imprimirUltimoDocumento"
          />
          <q-btn
            color="primary"
            unelevated
            label="Nueva operación"
            @click="dialogDocumentoEmitido = false"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useCataloStore } from 'src/stores/cataloStore'
import { useFacturaStore } from 'src/stores/facturaStore'
import { usePOS } from 'src/composables/usePOS'
import { formatCurrency } from 'src/utils/formatters'
import type { MetodoPago, ProductoCatalogo, TipoDocumentoVenta } from 'src/types'
import { TIPO_DOCUMENTO_LABELS } from 'src/types'
import ProductoBuscador from 'src/components/pos/ProductoBuscador.vue'
import CarritoItem from 'src/components/pos/CarritoItem.vue'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useLoading } from 'src/composables/useLoading.ts'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const cataloStore = useCataloStore()
const facturaStore = useFacturaStore()
const $q = useQuasar()
const pos = usePOS()

const sucursalActiva = ref(authStore.sucursalId ?? '')
const productosCatalogo = ref<ProductoCatalogo[]>([])
const cargandoCatalogo = ref(false)
const dialogDocumentoEmitido = ref(false)
const ultimoDocumentoId = ref('')
const ultimoDocumentoNumero = ref('')
const ultimoDocumentoTipo = ref<TipoDocumentoVenta>('FACTURA')

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((sucursal) => ({
    label: `${sucursal.nombre} — ${sucursal.ciudad}`,
    value: sucursal.id,
  })),
)

const tiposDocumentoDisponibles = computed(() => {
  const options: Array<{ label: string; value: TipoDocumentoVenta }> = []
  if (authStore.can('pos.vender_factura') || authStore.can('facturas.emitir')) {
    options.push({ label: TIPO_DOCUMENTO_LABELS.FACTURA, value: 'FACTURA' })
  }
  if (authStore.can('pos.vender_sin_factura')) {
    options.push({ label: TIPO_DOCUMENTO_LABELS.VENTA_SIN_FACTURA, value: 'VENTA_SIN_FACTURA' })
  }
  if (authStore.can('pos.crear_proforma')) {
    options.push({ label: TIPO_DOCUMENTO_LABELS.PROFORMA, value: 'PROFORMA' })
  }
  if (authStore.can('pos.crear_cotizacion')) {
    options.push({ label: TIPO_DOCUMENTO_LABELS.COTIZACION, value: 'COTIZACION' })
  }
  return options
})

const opcionesPago = [
  { label: 'Efectivo', value: 'EFECTIVO' },
  { label: 'QR', value: 'QR' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Tarjeta', value: 'TARJETA' },
  { label: 'Crédito', value: 'CREDITO' },
  { label: 'Mixto', value: 'MIXTO' },
]

const opcionesPagoItem = [
  { label: 'Efectivo', value: 'EFECTIVO' },
  { label: 'QR', value: 'QR' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Tarjeta', value: 'TARJETA' },
  { label: 'Crédito', value: 'CREDITO' },
]

const metodoPagoActual = computed<MetodoPago>(() => {
  if (pos.pagos.value.length > 1) return 'MIXTO'
  return pos.pagos.value[0]?.metodoPago ?? 'EFECTIVO'
})

const accionPrincipal = computed(() => {
  switch (pos.tipoDocumento.value) {
    case 'VENTA_SIN_FACTURA':
      return { label: 'Registrar venta', icon: 'point_of_sale' }
    case 'PROFORMA':
      return { label: 'Generar proforma', icon: 'description' }
    case 'COTIZACION':
      return { label: 'Generar cotización', icon: 'request_quote' }
    default:
      return { label: 'Emitir factura', icon: 'receipt_long' }
  }
})

const mensajeExito = computed(() => {
  const tipo = TIPO_DOCUMENTO_LABELS[ultimoDocumentoTipo.value] || ultimoDocumentoTipo.value
  return `${tipo} ${ultimoDocumentoNumero.value} generada correctamente`
})

function agregarDesdeResultado(producto: ProductoCatalogo): void {
  pos.agregarDesdeCatalogo(producto)
}

function activarEscaner(): void {
  $q.notify({ message: 'Escáner QR disponible en dispositivos móviles', icon: 'qr_code_scanner' })
}

function confirmarVaciar(): void {
  $q.dialog({
    title: 'Vaciar carrito',
    message: '¿Deseas eliminar todos los productos del carrito?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Vaciar', color: 'negative', unelevated: true },
  }).onOk(() => pos.limpiarOperacion())
}

function onMetodoPago(value: MetodoPago): void {
  pos.setMetodoPago(value)
}

function quitarItem(productoId: string): void {
  pos.quitarItem(productoId)
  if (pos.pagos.value.length === 1 && pos.requierePago.value) {
    pos.actualizarPago(0, { monto: pos.totalDocumento.value })
  }
}

async function procesar(): Promise<void> {
  if (!sucursalActiva.value) return
  useLoading(true, 'Procesando Venta...')
  try {
    const resultado = await pos.procesarVenta(sucursalActiva.value)
    ultimoDocumentoId.value = resultado.id
    ultimoDocumentoNumero.value = resultado.numero
    ultimoDocumentoTipo.value = resultado.tipo
    dialogDocumentoEmitido.value = true
    cataloStore.invalidateCache(sucursalActiva.value)
    await cargarCatalogo()
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message, timeout: 5000 })
  } finally {
    useLoading(false)
  }
}

async function imprimirUltimoDocumento(): Promise<void> {
  if (ultimoDocumentoId.value) {
    useLoading(true, 'Imprimiendo...')
    await facturaStore.imprimirFactura(ultimoDocumentoId.value)
    useLoading(false)
  }
}

async function cargarCatalogo(): Promise<void> {
  if (!sucursalActiva.value) return
  cargandoCatalogo.value = true
  try {
    productosCatalogo.value = await cataloStore.getCatalogo(sucursalActiva.value, true)
    productosCatalogo.value = productosCatalogo.value.map((producto) => ({
      ...producto,
      imagenLocation: producto.imagenLocation || (producto.imagenUrl ? 'drive' : 'local'),
      imagenUrl: producto.imagenUrl ? producto.imagenUrl : producto.sku,
    }))
  } finally {
    cargandoCatalogo.value = false
  }
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  if (!sucursalActiva.value && sucursalStore.activas.length > 0) {
    sucursalActiva.value = sucursalStore.activas[0].id
  }
  const firstOption = tiposDocumentoDisponibles.value[0]
  if (firstOption) pos.setTipoDocumento(firstOption.value)
  //await cargarCatalogo()
})
</script>

<style scoped lang="scss">
.carrito-card {
  position: sticky;
  top: 80px;
}

.producto-rapido-card {
  border-radius: 5px; /*var(--sgi-radius);*/
  background: var(--sgi-surface-alt);
  transition:
    box-shadow 0.15s,
    transform 0.1s;

  &:hover:not(.agotado) {
    box-shadow: var(--sgi-shadow);
    transform: translateY(-1px);
    background: rgba(21, 101, 192, 0.09);
  }

  &.agotado {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.catalogo-card {
  transition:
    box-shadow 0.2s,
    transform 0.15s;
  cursor: default;
  height: 100%;

  &:hover {
    box-shadow: var(--sgi-shadow-lg);
    transform: translateY(-6px);
  }

  .card-image-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: var(--sgi-radius-lg) var(--sgi-radius-lg) 0 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--sgi-primary) 10%, transparent), transparent),
      var(--sgi-surface-alt);
  }

  .catalogo-img {
    background: var(--sgi-surface-alt);
  }

  .qr-fab {
    position: absolute;
    bottom: 8px;
    right: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .edit-fab {
    position: absolute;
    top: 5px;
    right: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    height: 20px;
  }
}
</style>
