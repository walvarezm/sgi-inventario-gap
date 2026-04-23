<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-md">
      <div class="sgi-page-title">Punto de Venta</div>
      <q-space />
      <!-- Selector de sucursal -->
      <q-select
        v-model="sucursalActiva"
        :options="opcionesSucursal"
        outlined dense emit-value map-options
        style="min-width:220px"
        :disable="!authStore.isGlobal"
      >
        <template #prepend><q-icon name="store" /></template>
      </q-select>
    </div>

    <div class="row q-col-gutter-md">
      <!-- ── Columna izquierda: búsqueda + catálogo ──────── -->
      <div class="col-12 col-md-7">
        <!-- Buscador -->
        <div class="q-mb-md" style="position:relative">
          <ProductoBuscador
            v-model="pos.busqueda.value"
            :resultados="(pos.resultadosBusqueda.value as ProductoCatalogo[])"
            @seleccionar="agregarDesdeResultado"
            @escanear="activarEscaner"
          />
        </div>

        <!-- Grid de productos del catálogo (acceso rápido) -->
        <q-card class="sgi-card" flat>
          <q-card-section class="q-pb-sm">
            <div class="text-subtitle2 text-weight-bold">Acceso rápido</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div v-if="cargandoCatalogo" class="flex flex-center q-pa-xl">
              <q-spinner color="primary" size="40px" />
            </div>
            <div v-else class="row q-col-gutter-sm">
              <div
                v-for="p in productosCatalogo.slice(0, 20)"
                :key="p.id"
                class="col-6 col-sm-4 col-md-3"
              >
                <q-card
                  class="producto-rapido-card cursor-pointer"
                  flat bordered
                  :class="{ 'agotado': p.stock <= 0 }"
                  @click="pos.agregarDesdeCatalogo(p)"
                >
                  <q-img
                    :src="p.imagenUrl || ''"
                    style="height:70px"
                    fit="contain"
                    class="bg-grey-2"
                  >
                    <template #error>
                      <div class="absolute-full flex flex-center bg-grey-2">
                        <q-icon name="image" color="grey-4" size="28px" />
                      </div>
                    </template>
                  </q-img>
                  <div class="q-pa-xs">
                    <div class="text-caption ellipsis text-weight-medium">{{ p.nombre }}</div>
                    <div class="text-caption text-positive text-weight-bold">
                      {{ formatCurrency(p.precioFinal) }}
                    </div>
                    <q-chip dense size="xs"
                      :color="p.stock <= 0 ? 'grey' : p.stockBajo ? 'orange' : 'positive'"
                      text-color="white">
                      {{ p.stock }}
                    </q-chip>
                  </div>
                  <q-badge v-if="p.stock <= 0" floating color="grey" label="Agotado" />
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- ── Columna derecha: carrito + checkout ─────────── -->
      <div class="col-12 col-md-5">
        <q-card class="sgi-card carrito-card" flat>
          <!-- Header carrito -->
          <q-card-section class="row items-center q-pb-sm">
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
              flat dense color="negative" icon="delete_sweep" label="Vaciar"
              size="sm" @click="confirmarVaciar"
            />
          </q-card-section>

          <q-separator />

          <!-- Items del carrito -->
          <q-scroll-area style="height:340px" class="q-pa-sm">
            <div v-if="!pos.carrito.value.length" class="full-width column flex-center q-pa-xl text-muted">
              <q-icon name="shopping_cart" size="48px" style="opacity:0.2" class="q-mb-sm" />
              <span class="text-body2">Carrito vacío</span>
              <span class="text-caption">Busca o toca un producto para agregarlo</span>
            </div>

            <CarritoItem
              v-for="item in pos.carrito.value"
              :key="item.productoId"
              :item="item"
              @quitar="pos.quitarItem"
              @cambiar-cantidad="pos.actualizarCantidad"
            />
          </q-scroll-area>

          <q-separator />

          <!-- Totales -->
          <q-card-section class="q-py-sm">
            <div class="row items-center q-mb-xs">
              <span class="text-muted">Subtotal:</span>
              <q-space />
              <span>{{ formatCurrency(pos.totalCarrito.value) }}</span>
            </div>
            <div class="row items-center text-h6 text-weight-bold">
              <span>TOTAL:</span>
              <q-space />
              <span class="text-positive">{{ formatCurrency(pos.totalCarrito.value) }}</span>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Cliente y cobrar -->
          <q-card-section class="q-gutter-sm">
            <q-input
              v-model="pos.cliente.value"
              label="Nombre del cliente"
              outlined dense
            >
              <template #prepend><q-icon name="person" /></template>
            </q-input>

            <q-btn
              label="COBRAR Y EMITIR FACTURA"
              color="primary"
              unelevated
              size="md"
              class="full-width"
              icon="receipt_long"
              :loading="pos.procesando.value"
              :disable="!pos.carrito.value.length || !sucursalActiva"
              @click="cobrar"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog: Factura emitida -->
    <q-dialog v-model="dialogFacturaEmitida">
      <q-card class="sgi-card q-pa-lg text-center" style="min-width:320px">
        <q-icon name="check_circle" color="positive" size="64px" />
        <div class="text-h6 text-weight-bold q-mt-sm">¡Venta completada!</div>
        <div class="text-muted q-mb-lg">Factura emitida correctamente</div>
        <div class="row q-gutter-sm justify-center">
          <q-btn
            outline color="primary" icon="print" label="Imprimir"
            @click="imprimirUltimaFactura"
          />
          <q-btn
            color="primary" unelevated label="Nueva venta"
            @click="dialogFacturaEmitida = false"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useCataloStore } from 'src/stores/cataloStore'
import { useFacturaStore } from 'src/stores/facturaStore'
import { usePOS } from 'src/composables/usePOS'
import { formatCurrency } from 'src/utils/formatters'
import type { ProductoCatalogo } from 'src/types'
import ProductoBuscador from 'src/components/pos/ProductoBuscador.vue'
import CarritoItem from 'src/components/pos/CarritoItem.vue'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const cataloStore = useCataloStore()
const facturaStore = useFacturaStore()
const $q = useQuasar()
const pos = usePOS()

const sucursalActiva = ref(authStore.sucursalId ?? '')
const productosCatalogo = ref<ProductoCatalogo[]>([])
const cargandoCatalogo = ref(false)
const dialogFacturaEmitida = ref(false)
const ultimaFacturaId = ref('')

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id })),
)

function agregarDesdeResultado(p: ProductoCatalogo): void {
  pos.agregarDesdeCatalogo(p)
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
  }).onOk(() => pos.limpiarCarrito())
}

async function cobrar(): Promise<void> {
  if (!sucursalActiva.value) return
  try {
    const facturaId = await pos.procesarVenta(sucursalActiva.value)
    ultimaFacturaId.value = facturaId
    dialogFacturaEmitida.value = true
    // Recargar catálogo para reflejar nuevo stock
    cataloStore.invalidateCache(sucursalActiva.value)
    await cargarCatalogo()
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message, timeout: 5000 })
  }
}

async function imprimirUltimaFactura(): Promise<void> {
  if (ultimaFacturaId.value) await facturaStore.imprimirFactura(ultimaFacturaId.value)
}

async function cargarCatalogo(): Promise<void> {
  if (!sucursalActiva.value) return
  cargandoCatalogo.value = true
  try {
    productosCatalogo.value = await cataloStore.getCatalogo(sucursalActiva.value)
  } finally {
    cargandoCatalogo.value = false
  }
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  if (!sucursalActiva.value && sucursalStore.activas.length > 0) {
    sucursalActiva.value = sucursalStore.activas[0].id
  }
  await cargarCatalogo()
})
</script>

<style scoped lang="scss">
.carrito-card { position: sticky; top: 80px; }
.producto-rapido-card {
  border-radius: var(--sgi-radius);
  transition: box-shadow 0.15s, transform 0.1s;
  &:hover:not(.agotado) { box-shadow: var(--sgi-shadow); transform: translateY(-1px); }
  &.agotado { opacity: 0.5; cursor: not-allowed; }
}
</style>
