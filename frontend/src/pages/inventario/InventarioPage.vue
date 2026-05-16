<template>
  <q-page class="sgi-page">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Inventario</div>
        <div class="text-muted text-body2 q-mt-xs">Control de stock por sucursal</div>
      </div>
      <q-space />
      <div class="row q-gutter-xs q-mx-sm">
        <q-btn
          outline
          color="positive"
          icon="add_circle"
          label="Entrada"
          @click="abrirDialog('entrada')"
        />
        <q-btn
          outline
          color="negative"
          icon="remove_circle"
          label="Salida"
          @click="abrirDialog('salida')"
        />
        <q-btn
          outline
          color="primary"
          icon="swap_horiz"
          label="Transferir"
          :disable="!authStore.isGlobal"
          @click="abrirDialog('transferencia')"
        >
          <q-tooltip v-if="!authStore.isGlobal">Solo Admin/Supervisor</q-tooltip>
        </q-btn>

        <!--        <div class="col-12 col-md-3">-->
        <q-select
          v-model="sucursalActiva"
          :options="opcionesSucursal"
          label="Sucursal"
          outlined
          dense
          emit-value
          map-options
          style="width: 250px"
          :disable="!authStore.isGlobal"
          @update:model-value="cargarDatos"
          :loading="sucursalStore.loading"
        >
          <template #prepend><q-icon name="store" /></template>
        </q-select>
        <!--        </div>-->
      </div>
    </div>

    <!-- Selector de sucursal -->
    <q-card v-if="false" class="sgi-card q-mb-md" flat>
      <q-expansion-item
        icon="tune"
        label="Filtros y búsqueda"
        caption="Sucursal, búsqueda y resumen de inventario"
        expand-separator
        :default-opened="!esMovil"
        header-class="sgi-filter-toggle"
      >
        <q-card-section class="row items-center q-col-gutter-sm sgi-filter-body">
          <div class="col-12 col-sm-2">
            <q-select
              v-model="sucursalActiva"
              :options="opcionesSucursal"
              label="Sucursal"
              outlined
              dense
              emit-value
              map-options
              :disable="!authStore.isGlobal"
              @update:model-value="cargarDatos"
            >
              <template #prepend><q-icon name="store" /></template>
            </q-select>
          </div>
          <div class="col-12 col-sm-3">
            <q-input v-model="busqueda" placeholder="Buscar producto…" outlined dense clearable>
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-2">
            <q-select
              v-model="categoriaFiltro"
              :options="[{ label: 'Todas las categorías', value: null }, ...categoriaStore.options]"
              label="Categoría"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-sm-2">
            <q-select
              v-model="marcaFiltro"
              :options="[{ label: 'Todas las marcas', value: null }, ...marcaStore.optionsName]"
              label="Marca"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <div class="col-auto">
            <q-btn
              flat
              round
              icon="refresh"
              color="primary"
              :loading="loadingStock"
              @click="cargarDatos"
            >
              <q-tooltip>Recargar</q-tooltip>
            </q-btn>
          </div>
          <q-space />

          <!-- KPIs rápidos -->
          <div class="row q-gutter-md">
            <div class="text-center">
              <div class="text-h6 text-weight-bold text-primary">{{ stockFiltrado.length }}</div>
              <div class="text-caption text-muted">Productos</div>
            </div>
            <q-separator vertical />
            <div class="text-center">
              <div class="text-h6 text-weight-bold text-negative">{{ alertas.length }}</div>
              <div class="text-caption text-muted">Alertas</div>
            </div>
            <q-separator vertical />
            <div class="text-center">
              <div class="text-h6 text-weight-bold text-positive">{{ totalUnidades }}</div>
              <div class="text-caption text-muted">Unidades</div>
            </div>
          </div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <!-- Alertas de stock bajo -->
    <q-banner
      v-if="alertas.length > 0"
      class="bg-orange-1 text-orange-10 rounded-borders q-mb-md"
      dense
    >
      <template #avatar><q-icon name="warning" color="warning" /></template>
      <span class="">
        <strong>{{ alertas.length }} producto(s) con stock bajo.</strong>
        {{ alertas.map((a) => a.sku).join(', ') }}
      </span>
    </q-banner>

    <!-- Tabs: Stock | Movimientos -->
    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="q-px-md q-py-xs">
        <q-tab name="stock" icon="warehouse" label="Stock actual" />
        <q-tab name="movimientos" icon="history" label="Movimientos" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tabActivo" animated>
        <!-- Tab: Stock -->
        <q-tab-panel name="stock" class="q-pa-none">
          <q-card-section class="row q-col-gutter-sm items-center q-pb-sm">
            <div class="text-subtitle1 text-weight-bold">Stock Actual</div>
            <q-space />
            <!-- Filtros inline -->
            <div class="col-12 col-sm-3">
              <q-input v-model="busqueda" placeholder="Buscar producto…" outlined dense clearable>
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-2">
              <q-select
                v-model="categoriaFiltro"
                :options="categoriaStore.options"
                label="Categoría"
                outlined
                dense
                emit-value
                map-options
                clearable
                :loading="categoriaStore.loading"
              />
            </div>
            <div class="col-12 col-sm-2">
              <q-select
                v-model="marcaFiltro"
                :options="[{ label: 'Todas las marcas', value: null }, ...marcaStore.optionsName]"
                label="Marca"
                outlined
                dense
                emit-value
                map-options
                clearable
                :loading="marcaStore.loading"
              />
            </div>

            <div class="col-auto">
              <q-btn
                flat
                round
                icon="refresh"
                color="primary"
                :loading="loadingStock"
                @click="cargarDatos"
              >
                <q-tooltip>Recargar</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>

          <q-table
            :rows="stockFiltrado"
            :columns="columnasStock"
            :loading="loadingStock"
            row-key="id"
            dense
            class="sgi-table"
            :pagination="{ rowsPerPage: 10 }"
            no-data-label="No hay registros de stock para esta sucursal"
          >
            <!-- Imagen -->
            <template #body-cell-imagenUrl="{ row }">
              <q-td>
                <q-avatar size="36px" square rounded>
                  <!--                  <img v-if="value" :src="value" loading="lazy" />-->
                  <ProductoImagenIFrame
                    v-if="row.imagenUrl"
                    :imagen-url="row.imagenUrl"
                    :width="36"
                    :height="36"
                    :imagen-location="row.imagenLocation"
                  />
                  <q-icon v-else name="image" color="grey-4" size="26px" />
                </q-avatar>
              </q-td>
            </template>

            <template #body-cell-nombre="{ value }">
              <q-td>
                <div class="text-weight-medium">{{ truncate(value) }}</div>
                <q-tooltip v-if="value.length > 50">
                  {{ value }}
                </q-tooltip>
              </q-td>
            </template>

            <template #body-cell-categoriaId="{ value }">
              <q-td>
                <!--                <q-chip
                  v-if="categoriaStore.getById(value)"
                  dense
                  outline
                  size="sm"
                  color="blue-12"
                  text-color="white"
                  class="q-pa-md"
                >
                  {{ categoriaStore.getById(value)?.nombre }}
                </q-chip>-->
                <span v-if="categoriaStore.getById(value)">
                  {{ categoriaStore.getById(value)?.nombre }}
                </span>
                <span v-else class="text-muted">—</span>
              </q-td>
            </template>

            <!-- Stock con indicador -->
            <template #body-cell-stockActual="{ row }">
              <q-td class="text-center">
                <q-chip
                  dense
                  outline
                  :color="row.stockBajo ? 'negative' : 'positive'"
                  text-color=""
                  :icon="row.stockBajo ? 'warning' : 'check'"
                >
                  {{ row.stockActual }} {{ row.stockActual > 1 ? row.unidad + 'es' : row.unidad }}
                </q-chip>
                <q-chip
                  v-if="row.stockBajo"
                  dense
                  outline
                  :color="'info'"
                  text-color=""
                  :icon="'info'"
                  size="sm"
                >
                  Minimo: {{ row.stockMinimo }}
                </q-chip>
              </q-td>
            </template>

            <template #no-data="{ message }">
              <div class="full-width column flex-center q-pa-xl text-muted">
                <q-icon name="warehouse" size="48px" style="opacity: 0.3" class="q-mb-md" />
                <span>{{ message }}</span>
              </div>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Tab: Movimientos -->
        <q-tab-panel name="movimientos" class="q-pa-none">
          <MovimientosTable
            :movimientos="movimientos"
            :loading="loadingMovimientos"
            @refresh="cargarMovimientos"
          />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialogs -->
    <q-dialog v-model="dialogEntrada" persistent>
      <EntradaForm
        @saved="onMovimientoGuardado"
        @cancelled="dialogEntrada = false"
        :stock-inventario="stock"
      />
    </q-dialog>
    <q-dialog v-model="dialogSalida" persistent>
      <SalidaForm @saved="onMovimientoGuardado" @cancelled="dialogSalida = false" />
    </q-dialog>
    <q-dialog v-model="dialogTransferencia" persistent>
      <TransferenciaForm @saved="onMovimientoGuardado" @cancelled="dialogTransferencia = false" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar, type QTableColumn } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import { useCategoriaStore } from 'src/stores/categoriaStore.ts'
import { useMarcaStore } from 'src/stores/marcaStore.ts'
import { truncate } from 'src/utils/formatters.ts'
import type { InventarioItem } from 'src/types'
import MovimientosTable from 'src/components/inventario/MovimientosTable.vue'
import EntradaForm from 'src/components/inventario/EntradaForm.vue'
import SalidaForm from 'src/components/inventario/SalidaForm.vue'
import TransferenciaForm from 'src/components/inventario/TransferenciaForm.vue'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useProductoStore } from 'src/stores/productoStore.ts'

type InventarioRow = InventarioItem & {
  stockMinimo: number
  stockBajo: boolean
  sku: string
  nombre: string
  marca: string
  marcaId: string
  categoriaId: string
  unidad: string
  imagenUrl: string
  imagenLocation: string
}

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const productoStore = useProductoStore()
const $q = useQuasar()
const esMovil = computed(() => $q.screen.lt.md)

// ── State ──────────────────────────────────────────────────────
const sucursalActiva = ref(authStore.isGlobal ? '' : (authStore.sucursalId ?? ''))
const busqueda = ref('')
const categoriaFiltro = ref(null)
const marcaFiltro = ref('')
const tabActivo = ref('stock')
const stock = ref<InventarioRow[]>([])
const movimientos = ref([])
const alertas = ref<InventarioRow[]>([])
const loadingStock = ref(false)
const loadingMovimientos = ref(false)
const dialogEntrada = ref(false)
const dialogSalida = ref(false)
const dialogTransferencia = ref(false)

// ── Computed ───────────────────────────────────────────────────
const opcionesSucursal = computed(() =>
  authStore.isGlobal
    ? sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id }))
    : sucursalStore.activas
        .filter((s) => s.id === authStore.sucursalId)
        .map((s) => ({ label: s.nombre, value: s.id })),
)

const stockFiltrado = computed(() => {
  let products = stock.value
  if (busqueda.value) {
    const q = busqueda.value.toLowerCase()
    products = products.filter(
      (s) =>
        String(s.sku ?? '')
          .toLowerCase()
          .includes(q) ||
        String(s.nombre ?? '')
          .toLowerCase()
          .includes(q) ||
        String(s.marca ?? '')
          .toLowerCase()
          .includes(q),
    )
  }

  if (categoriaFiltro.value) {
    products = products.filter((p) => p.categoriaId === categoriaFiltro.value)
  }

  if (marcaFiltro.value) {
    products = products.filter(
      (p) => p.marca === marcaFiltro.value || p.marcaId === marcaFiltro.value,
    )
  }

  return products
})

const totalUnidades = computed(() => stock.value.reduce((sum, s) => sum + s.stockActual, 0))

const columnasStock: QTableColumn[] = [
  { name: 'imagenUrl', label: '', field: 'imagenUrl', align: 'center', style: 'width:52px' },
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left', sortable: true },
  { name: 'nombre', label: 'Producto', field: 'nombre', align: 'left', sortable: true },
  { name: 'categoriaId', label: 'Categoria', field: 'categoriaId', align: 'left', sortable: true },
  { name: 'marca', label: 'Marca', field: 'marca', align: 'left', sortable: true },
  { name: 'stockActual', label: 'Stock', field: 'stockActual', align: 'center', sortable: true },
  { name: 'fechaActualizacion', label: 'Actualizado', field: 'fechaActualizacion', align: 'left' },
]

// ── Actions ────────────────────────────────────────────────────
function abrirDialog(tipo: 'entrada' | 'salida' | 'transferencia'): void {
  if (tipo === 'entrada') dialogEntrada.value = true
  if (tipo === 'salida') dialogSalida.value = true
  if (tipo === 'transferencia') dialogTransferencia.value = true
}

async function cargarStock(): Promise<void> {
  if (!sucursalActiva.value) return
  loadingStock.value = true
  try {
    stock.value = (await inventarioService.getStockPorSucursal(
      sucursalActiva.value,
    )) as InventarioRow[]

    console.log('stock.value', stock.value)

    /*alertas.value = (await inventarioService.getAlertasStock(
      sucursalActiva.value,
    )) as InventarioRow[]*/

    alertas.value = stock.value.filter((s) => s.stockBajo)
  } catch (e) {
    console.error(e)
  } finally {
    loadingStock.value = false
  }
}

async function cargarMovimientos(): Promise<void> {
  if (!sucursalActiva.value) return
  loadingMovimientos.value = true
  try {
    movimientos.value = (await inventarioService.getMovimientos(sucursalActiva.value)) as never[]
    console.log('movimientos.value', movimientos.value)
  } catch (e) {
    console.error(e)
  } finally {
    loadingMovimientos.value = false
  }
}

async function cargarDatos(): Promise<void> {
  await Promise.all([cargarStock(), cargarMovimientos()])
}

function onMovimientoGuardado(): void {
  dialogEntrada.value = false
  dialogSalida.value = false
  dialogTransferencia.value = false
  void cargarDatos()
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  if (categoriaStore.items.length === 0 || marcaStore.items.length === 0)
    await Promise.all([categoriaStore.fetchAll(), marcaStore.fetchAll()])
  if (!sucursalActiva.value && sucursalStore.activas.length > 0) {
    sucursalActiva.value = sucursalStore.activas[0].id
    await cargarDatos()
  }
  productoStore.forceReload()
  await productoStore.fetchAll()
})
</script>
