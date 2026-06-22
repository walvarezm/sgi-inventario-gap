<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useCataloStore } from 'src/stores/cataloStore'
import { useFacturaStore } from 'src/stores/facturaStore'
import { usePOS } from 'src/composables/usePOS'
import { formatCurrency } from 'src/utils/formatters'
import type { MetodoPago, TipoDocumentoVenta } from 'src/types'
import { TIPO_DOCUMENTO_LABELS } from 'src/types'
import ProductoBuscador from 'src/components/pos/ProductoBuscador.vue'
import CarritoItem from 'src/components/pos/CarritoItem.vue'
import POSPaymentMethods from 'src/components/pos/POSPaymentMethods.vue'
import SucursalSwitcher from 'src/components/catalogo/SucursalSwitcher.vue'
import { useLoading } from 'src/composables/useLoading'
import { useSucursalActivaStore } from 'src/stores/sucursalActiva.ts'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const sucursalActivaStore = useSucursalActivaStore()
const cataloStore = useCataloStore()
const facturaStore = useFacturaStore()
const $q = useQuasar()
const pos = usePOS()

const sucursalActivaSel = computed(() => sucursalActivaStore.sucursalId)
const sucursalActiva = ref<string>(sucursalActivaSel.value)
//const sucursalActiva = ref<string>(authStore.sucursalId ?? '')
const dialogDocumentoEmitido = ref(false)
const ultimoDocumentoId = ref('')
const ultimoDocumentoNumero = ref('')
const ultimoDocumentoTipo = ref<TipoDocumentoVenta>('FACTURA')
const customerExpanded = ref(false)

const esMovil = computed(() => $q.screen.lt.md)

const tiposDocumento: Array<{
  value: TipoDocumentoVenta
  label: string
  icon: string
  tone: string
}> = [
  { value: 'FACTURA', label: 'Factura', icon: 'receipt_long', tone: 'primary' },
  { value: 'VENTA_SIN_FACTURA', label: 'Venta sin fac.', icon: 'point_of_sale', tone: 'positive' },
  { value: 'PROFORMA', label: 'Proforma', icon: 'description', tone: 'info' },
  { value: 'COTIZACION', label: 'Cotización', icon: 'request_quote', tone: 'secondary' },
]

const tiposDocumentoDisponibles = computed(() => {
  return tiposDocumento.filter((t) => {
    if (t.value === 'FACTURA') {
      return authStore.can('pos.vender_factura') || authStore.can('facturas.emitir')
    }
    if (t.value === 'VENTA_SIN_FACTURA') return authStore.can('pos.vender_sin_factura')
    if (t.value === 'PROFORMA') return authStore.can('pos.crear_proforma')
    if (t.value === 'COTIZACION') return authStore.can('pos.crear_cotizacion')
    return false
  })
})

const metodoPagoActual = computed<MetodoPago>(() => {
  if (pos.pagos.value.length > 1) return 'MIXTO'
  return pos.pagos.value[0]?.metodoPago ?? 'EFECTIVO'
})

const accionPrincipal = computed(() => {
  switch (pos.tipoDocumento.value) {
    case 'VENTA_SIN_FACTURA':
      return { label: 'Registrar venta', icon: 'point_of_sale', tone: 'positive' }
    case 'PROFORMA':
      return { label: 'Generar proforma', icon: 'description', tone: 'info' }
    case 'COTIZACION':
      return { label: 'Generar cotización', icon: 'request_quote', tone: 'secondary' }
    default:
      return { label: 'Emitir factura', icon: 'receipt_long', tone: 'primary' }
  }
})

const mensajeExito = computed(() => {
  const tipo = TIPO_DOCUMENTO_LABELS[ultimoDocumentoTipo.value] || ultimoDocumentoTipo.value
  return `${tipo} ${ultimoDocumentoNumero.value} generada correctamente`
})

const botonHabilitado = computed(
  () => pos.carrito.value.length > 0 && !!sucursalActiva.value && !pos.procesando.value,
)

// ── Actions ────────────────────────────────────────────────────
function agregarDesdeResultado(producto: Parameters<typeof pos.agregarDesdeCatalogo>[0]): void {
  pos.agregarDesdeCatalogo(producto)
}

function activarEscaner(): void {
  $q.notify({ message: 'Escáner QR disponible en dispositivos móviles', icon: 'qr_code_scanner' })
}

function confirmarVaciar(): void {
  $q.dialog({
    title: 'Vaciar carrito',
    message: `¿Deseas eliminar los ${pos.cantidadItems.value} producto(s) del carrito?`,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Vaciar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(() => pos.limpiarOperacion())
}

function onMetodoPago(value: MetodoPago): void {
  pos.setMetodoPago(value)
}

function onActualizarPago(
  index: number,
  patch: { metodoPago?: MetodoPago; monto?: number; referencia?: string },
): void {
  pos.actualizarPago(index, patch)
}

function quitarItem(productoId: string): void {
  pos.quitarItem(productoId)
  if (pos.pagos.value.length === 1 && pos.requierePago.value) {
    pos.actualizarPago(0, { monto: pos.totalDocumento.value })
  }
}

async function procesar(): Promise<void> {
  if (!sucursalActiva.value || !pos.carrito.value.length) return
  useLoading(true, 'Procesando venta…')
  try {
    const resultado = await pos.procesarVenta(sucursalActiva.value)
    ultimoDocumentoId.value = resultado.id
    ultimoDocumentoNumero.value = resultado.numero
    ultimoDocumentoTipo.value = resultado.tipo
    dialogDocumentoEmitido.value = true
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message, timeout: 5000 })
  } finally {
    useLoading(false)
  }
}

async function imprimirUltimoDocumento(): Promise<void> {
  if (!ultimoDocumentoId.value) return
  useLoading(true, 'Imprimiendo…')
  try {
    await facturaStore.imprimirFactura(ultimoDocumentoId.value)
  } finally {
    useLoading(false)
  }
}

function onCambioSucursal(_id: string): void {
  // Limpia la operación al cambiar de sucursal
  pos.limpiarOperacion()
  cargarCatalogo()
}

async function cargarCatalogo(): Promise<void> {
  if (!sucursalActiva.value) return
  try {
    await cataloStore.getCatalogo(sucursalActiva.value)
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message, timeout: 4000 })
  }
}

// ── Lifecycle ──────────────────────────────────────────────────
onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  if (!sucursalActiva.value && sucursalStore.activas.length > 0) {
    sucursalActiva.value = sucursalStore.activas[0].id
  }
  const firstOption = tiposDocumentoDisponibles.value[0]
  if (firstOption) pos.setTipoDocumento(firstOption.value)
  // Pre-cargar el catálogo de la sucursal activa para que la búsqueda funcione
  await cargarCatalogo()
  // Auto-collapse customer section on mobile
  if (esMovil.value) customerExpanded.value = false
  else customerExpanded.value = true
})

// Re-render customer expansion when crossing breakpoints
watch(esMovil, (m) => {
  customerExpanded.value = !m
})

watch(
  sucursalActivaSel,
  async (sucursalId) => {
    sucursalActiva.value = sucursalId
    //await onCambioSucursal(sucursalId)
    await cargarCatalogo()
  },
  { immediate: true },
)
</script>

<template>
  <q-page class="sgi-page pos-page">
    <!-- ── HERO ───────────────────────────────────────────── -->
    <header class="pos-hero">
      <div class="pos-hero__copy">
        <div class="pos-hero__eyebrow">
          <q-icon name="point_of_sale" size="14px" />
          <span>Punto de Venta</span>
        </div>
        <h1 class="sgi-page-title">Venta rápida</h1>
        <p class="pos-hero__subtitle">
          Busca productos, arma el carrito y emite el documento — todo en un solo flujo.
        </p>
      </div>

<!--      <div class="pos-hero__actions">
        <SucursalSwitcher
          v-if="sucursalStore.activas.length > 0"
          v-model="sucursalActiva"
          :size="esMovil ? 'sm' : 'md'"
          @change="onCambioSucursal"
        />
      </div>-->
    </header>

    <!-- ── TYPE SELECTOR STRIP ────────────────────────────── -->
    <div class="pos-type-strip" role="tablist" aria-label="Tipo de documento">
      <button
        v-for="tipo in tiposDocumentoDisponibles"
        :key="tipo.value"
        type="button"
        role="tab"
        :aria-selected="pos.tipoDocumento.value === tipo.value"
        :class="[
          'pos-type-strip__btn',
          `pos-type-strip__btn--${tipo.tone}`,
          {
            'is-active': pos.tipoDocumento.value === tipo.value,
          },
        ]"
        @click="pos.setTipoDocumento(tipo.value)"
      >
        <q-icon :name="tipo.icon" size="16px" />
        <span>{{ tipo.label }}</span>
      </button>
      <q-space />
      <div v-if="pos.carrito.value.length > 0" class="pos-type-strip__count">
        <q-icon name="shopping_bag" size="14px" />
        <span>
          <strong>{{ pos.cantidadItems.value }}</strong>
          ítem{{ pos.cantidadItems.value === 1 ? '' : 's' }}
        </span>
      </div>
    </div>

    <div class="pos-layout">
      <!-- ── LEFT COLUMN: SEARCH + CART ───────────────────── -->
      <div class="pos-layout__main">
        <ProductoBuscador
          v-model="pos.busqueda.value"
          :resultados="pos.resultadosBusqueda.value as never[]"
          @seleccionar="agregarDesdeResultado"
          @escanear="activarEscaner"
        />

        <section class="cart-panel sgi-card">
          <header class="cart-panel__head">
            <div class="cart-panel__title">
              <q-icon name="shopping_cart" size="18px" />
              <span>Carrito</span>
              <span v-if="pos.cantidadItems.value > 0" class="cart-panel__badge">
                {{ pos.cantidadItems.value }}
              </span>
            </div>
            <button
              v-if="pos.carrito.value.length"
              type="button"
              class="cart-panel__clear"
              @click="confirmarVaciar"
            >
              <q-icon name="delete_sweep" size="16px" />
              <span>Vaciar</span>
            </button>
          </header>

          <div class="cart-panel__body">
            <div v-if="!pos.carrito.value.length" class="cart-panel__empty">
              <div class="cart-panel__empty-art">
                <q-icon name="shopping_cart" size="48px" />
              </div>
              <h3 class="cart-panel__empty-title">Tu carrito está vacío</h3>
              <p class="cart-panel__empty-text">
                Busca por nombre, SKU o escanea un código QR para empezar.
              </p>
            </div>

            <ul v-else class="cart-panel__list">
              <li v-for="item in pos.carrito.value" :key="item.productoId" class="cart-panel__li">
                <CarritoItem
                  :item="item"
                  @quitar="quitarItem"
                  @cambiar-cantidad="pos.actualizarCantidad"
                  @cambiar-precio="pos.actualizarPrecio"
                  @cambiar-descuento="pos.actualizarDescuento"
                />
              </li>
            </ul>
          </div>
        </section>
      </div>

      <!-- ── RIGHT COLUMN: CUSTOMER + PAYMENT + TOTALS ────── -->
      <aside class="pos-layout__side">
        <section class="sgi-card pos-side-card">
          <button
            type="button"
            class="pos-side-card__head"
            @click="customerExpanded = !customerExpanded"
          >
            <div class="pos-side-card__head-left">
              <q-icon name="person" size="16px" />
              <span class="pos-side-card__head-title">Cliente</span>
            </div>
            <span class="pos-side-card__head-value">
              {{ pos.cliente.value.nombre || 'Sin nombre' }}
              <q-icon
                :name="customerExpanded ? 'expand_less' : 'expand_more'"
                size="18px"
                class="pos-side-card__head-caret"
              />
            </span>
          </button>

          <Transition name="expand">
            <div v-if="customerExpanded" class="pos-side-card__body">
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-7">
                  <q-input
                    v-model="pos.cliente.value.nombre"
                    label="Nombre del cliente"
                    outlined
                    dense
                  >
                    <template #prepend><q-icon name="person" size="16px" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-5">
                  <q-input v-model="pos.cliente.value.nitCi" label="NIT / CI" outlined dense />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="pos.cliente.value.telefono"
                    label="Teléfono"
                    outlined
                    dense
                    type="tel"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="pos.cliente.value.email"
                    label="Email"
                    outlined
                    dense
                    type="email"
                  />
                </div>
                <div v-if="pos.esDocumentoComercial.value" class="col-12 col-sm-6">
                  <q-input
                    v-model="pos.vigenciaHasta.value"
                    label="Vigencia hasta"
                    outlined
                    dense
                    type="date"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <section v-if="pos.requierePago.value" class="sgi-card pos-side-card">
          <header class="pos-side-card__head pos-side-card__head--static">
            <div class="pos-side-card__head-left">
              <q-icon name="credit_card" size="16px" />
              <span class="pos-side-card__head-title">Pago</span>
            </div>
          </header>
          <div class="pos-side-card__body">
            <POSPaymentMethods
              :metodo-actual="metodoPagoActual"
              :pagos="pos.pagos.value as never[]"
              :require-pago="pos.requierePago.value"
              :disabled="!pos.carrito.value.length"
              @seleccionar-metodo="onMetodoPago"
              @agregar-pago-mixto="pos.agregarPagoMixto"
              @quitar-pago-mixto="pos.quitarPagoMixto"
              @actualizar-pago="onActualizarPago"
            />
          </div>
        </section>

        <section class="sgi-card pos-side-card">
          <header class="pos-side-card__head pos-side-card__head--static">
            <div class="pos-side-card__head-left">
              <q-icon name="sticky_note_2" size="16px" />
              <span class="pos-side-card__head-title">Notas y observaciones</span>
            </div>
          </header>
          <div class="pos-side-card__body">
            <q-input
              v-model="pos.notas.value"
              label="Notas"
              outlined
              dense
              type="textarea"
              autogrow
              class="q-mb-sm"
            />
            <q-input
              v-model="pos.observaciones.value"
              label="Observaciones"
              outlined
              dense
              type="textarea"
              autogrow
            />
          </div>
        </section>
      </aside>
    </div>

    <!-- ── STICKY ACTION BAR (desktop side / mobile bottom) ── -->
    <div
      class="pos-action-bar"
      :class="[
        `pos-action-bar--${accionPrincipal.tone}`,
        { 'pos-action-bar--ready': botonHabilitado },
      ]"
    >
      <div class="pos-action-bar__totals">
        <div class="pos-action-bar__row">
          <span class="pos-action-bar__label">Subtotal</span>
          <span class="pos-action-bar__value">{{ formatCurrency(pos.subtotal.value) }}</span>
        </div>
        <div v-if="pos.descuentoTotal.value > 0" class="pos-action-bar__row">
          <span class="pos-action-bar__label">Descuento</span>
          <span class="pos-action-bar__value pos-action-bar__value--warning">
            -{{ formatCurrency(pos.descuentoTotal.value) }}
          </span>
        </div>
        <div v-if="pos.impuesto.value > 0" class="pos-action-bar__row">
          <span class="pos-action-bar__label">Impuesto</span>
          <span class="pos-action-bar__value">{{ formatCurrency(pos.impuesto.value) }}</span>
        </div>
        <div class="pos-action-bar__row pos-action-bar__row--total">
          <span class="pos-action-bar__label">Total</span>
          <span class="pos-action-bar__total-value">
            {{ formatCurrency(pos.totalDocumento.value) }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="pos-action-bar__btn"
        :disabled="!botonHabilitado"
        @click="procesar"
      >
        <span v-if="pos.procesando.value" class="pos-action-bar__spinner">
          <q-spinner-dots size="22px" color="white" />
        </span>
        <q-icon v-else :name="accionPrincipal.icon" size="22px" />
        <span>{{ accionPrincipal.label }}</span>
        <q-icon name="arrow_forward" size="18px" class="pos-action-bar__arrow" />
      </button>
    </div>

    <!-- ── SUCCESS DIALOG ─────────────────────────────────── -->
    <q-dialog v-model="dialogDocumentoEmitido" persistent transition-show="jump-up">
      <q-card class="sgi-card pos-success-card">
        <div class="pos-success-card__art">
          <q-icon name="check_circle" size="56px" />
        </div>
        <h2 class="pos-success-card__title">¡Operación completada!</h2>
        <p class="pos-success-card__text">{{ mensajeExito }}</p>
        <div class="pos-success-card__actions">
          <q-btn
            outline
            color="primary"
            icon="print"
            label="Imprimir"
            no-caps
            @click="imprimirUltimoDocumento"
          />
          <q-btn
            color="primary"
            unelevated
            icon="add"
            label="Nueva operación"
            no-caps
            @click="dialogDocumentoEmitido = false"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
.pos-page {
  padding-bottom: 120px; // espacio para action bar fija
}

// ── Hero ──────────────────────────────────────────────────────
.pos-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 22px 24px;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--sgi-primary) 8%, transparent),
      transparent 60%
    ),
    var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  box-shadow: var(--sgi-shadow);
}

.pos-hero__copy {
  flex: 1;
  min-width: 240px;
}

.pos-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.pos-hero__subtitle {
  margin: 8px 0 0;
  color: var(--sgi-text-secondary);
  font-size: 0.9rem;
  max-width: 600px;
}

.pos-hero__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

// ── Type strip ───────────────────────────────────────────────
.pos-type-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 14px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  overflow-x: auto;
}

.pos-type-strip__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--sgi-text-secondary);
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    color var(--sgi-dur-fast) var(--sgi-ease-out),
    border-color var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-type-strip__btn:hover {
  background: var(--sgi-surface-sunken);
  color: var(--sgi-text);
}

.pos-type-strip__btn.is-active {
  background: color-mix(in srgb, var(--sgi-primary) 14%, transparent);
  color: var(--sgi-primary);
  border-color: color-mix(in srgb, var(--sgi-primary) 35%, var(--sgi-border));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--sgi-primary) 18%, transparent);
}

.pos-type-strip__btn--positive.is-active {
  background: color-mix(in srgb, var(--sgi-positive) 14%, transparent);
  color: var(--sgi-positive);
  border-color: color-mix(in srgb, var(--sgi-positive) 35%, var(--sgi-border));
}

.pos-type-strip__btn--info.is-active {
  background: color-mix(in srgb, var(--sgi-info) 14%, transparent);
  color: var(--sgi-info);
  border-color: color-mix(in srgb, var(--sgi-info) 35%, var(--sgi-border));
}

.pos-type-strip__btn--secondary.is-active {
  background: color-mix(in srgb, var(--sgi-text-secondary) 16%, transparent);
  color: var(--sgi-text);
  border-color: var(--sgi-border-strong);
}

.pos-type-strip__count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

// ── Layout ────────────────────────────────────────────────────
.pos-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(320px, 1fr);
  gap: 18px;
  align-items: start;
}

.pos-layout__main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.pos-layout__side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: calc(var(--sgi-header-height, 64px) + 12px);
  max-height: calc(100vh - var(--sgi-header-height, 64px) - 24px);
  overflow-y: auto;
  padding-bottom: 8px;
  padding-right: 4px;
  // scrollbar visible pero discreto
  scrollbar-width: thin;
}

@media (max-width: 1100px) {
  .pos-layout {
    grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr);
  }
}

@media (max-width: 900px) {
  .pos-layout {
    grid-template-columns: 1fr;
  }
  .pos-layout__side {
    position: static;
    max-height: none;
    overflow: visible;
  }
}

// ── Cart panel ───────────────────────────────────────────────
.cart-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cart-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--sgi-border);
  background: var(--sgi-surface-soft);
  gap: 12px;
}

.cart-panel__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--sgi-text);
  letter-spacing: -0.01em;
}

.cart-panel__badge {
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--sgi-primary);
  color: white;
  font-size: 0.72rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.cart-panel__clear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--sgi-border);
  background: var(--sgi-surface);
  color: var(--sgi-negative);
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    color var(--sgi-dur-fast) var(--sgi-ease-out);
}

.cart-panel__clear:hover {
  background: color-mix(in srgb, var(--sgi-negative) 10%, transparent);
}

.cart-panel__body {
  padding: 12px;
  overflow-y: auto;
  max-height: 60vh;
}

.cart-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cart-panel__li {
  list-style: none;
}

// ── Empty state ───────────────────────────────────────────────
.cart-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
  gap: 8px;
}

.cart-panel__empty-art {
  width: 80px;
  height: 80px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: color-mix(in srgb, var(--sgi-primary) 10%, transparent);
  color: var(--sgi-primary);
  margin-bottom: 8px;
}

.cart-panel__empty-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--sgi-text);
}

.cart-panel__empty-text {
  margin: 0;
  color: var(--sgi-text-muted);
  max-width: 320px;
  font-size: 0.88rem;
}

// ── Side cards (customer / payment / notes) ──────────────────
.pos-side-card {
  overflow: hidden;
}

.pos-side-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  background: var(--sgi-surface-soft);
  border-bottom: 1px solid var(--sgi-border);
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: var(--sgi-text);
  transition: background var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-side-card__head:hover:not(.pos-side-card__head--static) {
  background: var(--sgi-surface-sunken);
}

.pos-side-card__head--static {
  cursor: default;
  border-bottom: 1px solid var(--sgi-border);
}

.pos-side-card__head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sgi-text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.pos-side-card__head-title {
  color: var(--sgi-text);
}

.pos-side-card__head-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sgi-text-secondary);
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pos-side-card__head-caret {
  color: var(--sgi-text-muted);
  flex-shrink: 0;
}

.pos-side-card__body {
  padding: 14px 16px 16px;
}

// Expand transition
.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 280ms var(--sgi-ease-out),
    opacity 220ms var(--sgi-ease-out);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 600px;
  opacity: 1;
}

// ── Action bar ───────────────────────────────────────────────
.pos-action-bar {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 100;
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  box-shadow: var(--sgi-shadow-lg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.pos-action-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sgi-primary) 6%, transparent),
    transparent 60%
  );
  pointer-events: none;
}

.pos-action-bar__totals {
  display: grid;
  grid-template-columns: auto auto auto 1fr;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
  position: relative;
}

.pos-action-bar__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pos-action-bar__row--total {
  text-align: right;
  align-items: flex-end;
}

.pos-action-bar__label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sgi-text-muted);
}

.pos-action-bar__value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--sgi-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.pos-action-bar__value--warning {
  color: var(--sgi-warning);
}

.pos-action-bar__total-value {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--sgi-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
  line-height: 1;
}

.pos-action-bar__btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 240px;
  padding: 0 22px;
  height: 56px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--sgi-primary), var(--sgi-primary-hover));
  color: white;
  cursor: pointer;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--sgi-primary) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition:
    transform var(--sgi-dur-fast) var(--sgi-ease-out),
    box-shadow var(--sgi-dur-fast) var(--sgi-ease-out),
    filter var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-action-bar__btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 18px 36px color-mix(in srgb, var(--sgi-primary) 35%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.pos-action-bar__btn:active:not(:disabled) {
  transform: translateY(0);
}

.pos-action-bar__btn:disabled {
  filter: grayscale(0.4) opacity(0.55);
  cursor: not-allowed;
  box-shadow: none;
}

.pos-action-bar__spinner {
  display: inline-flex;
  align-items: center;
}

.pos-action-bar__arrow {
  transition: transform var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-action-bar__btn:hover:not(:disabled) .pos-action-bar__arrow {
  transform: translateX(3px);
}

// Tono del botón principal según tipo de documento
.pos-action-bar--positive .pos-action-bar__btn {
  background: linear-gradient(135deg, var(--sgi-positive), #0d9669);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--sgi-positive) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.pos-action-bar--info .pos-action-bar__btn {
  background: linear-gradient(135deg, var(--sgi-info), #0284c7);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--sgi-info) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.pos-action-bar--secondary .pos-action-bar__btn {
  background: linear-gradient(135deg, var(--sgi-text-secondary), #475569);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--sgi-text-secondary) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

// ── Success dialog ───────────────────────────────────────────
.pos-success-card {
  width: 100%;
  max-width: 380px;
  padding: 28px 24px 22px;
  border-radius: 18px !important;
  text-align: center;
}

.pos-success-card__art {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--sgi-positive) 14%, transparent);
  color: var(--sgi-positive);
}

.pos-success-card__title {
  margin: 0 0 6px;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--sgi-text);
}

.pos-success-card__text {
  margin: 0 0 18px;
  color: var(--sgi-text-secondary);
  font-size: 0.92rem;
}

.pos-success-card__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

// ── Mobile ───────────────────────────────────────────────────
@media (max-width: 900px) {
  .pos-page {
    padding-bottom: 140px;
  }
  .pos-hero {
    padding: 16px 18px;
  }
  .pos-action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }
  .pos-action-bar__totals {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 12px;
  }
  .pos-action-bar__row--total {
    grid-column: 1 / -1;
    text-align: left;
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
    align-items: baseline;
    border-top: 1px dashed var(--sgi-border);
    padding-top: 6px;
  }
  .pos-action-bar__total-value {
    font-size: 1.5rem;
  }
  .pos-action-bar__btn {
    min-width: 0;
    width: 100%;
    height: 52px;
  }
}

@media (max-width: 480px) {
  .pos-page {
    padding: 12px;
    padding-bottom: 140px;
  }
  .pos-type-strip {
    flex-wrap: nowrap;
    scrollbar-width: none;
  }
  .pos-type-strip::-webkit-scrollbar {
    display: none;
  }
  .cart-panel__body {
    max-height: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pos-action-bar__btn,
  .pos-action-bar__arrow,
  .pos-type-strip__btn,
  .cart-panel__clear {
    transition: none;
  }
}
</style>
