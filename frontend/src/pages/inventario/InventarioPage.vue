<template>
  <q-page class="sgi-page">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Inventario</div>
        <div class="text-muted text-body2 q-mt-xs">
          Control de stock por sucursal
        </div>
      </div>
      <q-space />
      <div class="row q-gutter-sm">
        <q-btn
          outline color="positive" icon="add_circle" label="Entrada"
          @click="abrirDialog('entrada')"
        />
        <q-btn
          outline color="negative" icon="remove_circle" label="Salida"
          @click="abrirDialog('salida')"
        />
        <q-btn
          outline color="primary" icon="swap_horiz" label="Transferir"
          :disable="!authStore.isGlobal"
          @click="abrirDialog('transferencia')"
        >
          <q-tooltip v-if="!authStore.isGlobal">Solo Admin/Supervisor</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Selector de sucursal -->
    <q-card class="sgi-card q-mb-md" flat>
      <q-card-section class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-4">
          <q-select
            v-model="sucursalActiva"
            :options="opcionesSucursal"
            label="Sucursal"
            outlined dense emit-value map-options
            :disable="!authStore.isGlobal"
            @update:model-value="cargarDatos"
          >
            <template #prepend><q-icon name="store" /></template>
          </q-select>
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="busqueda" placeholder="Buscar producto…" outlined dense clearable>
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-auto">
          <q-btn flat round icon="refresh" color="primary" :loading="loadingStock" @click="cargarDatos">
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
    </q-card>

    <!-- Alertas de stock bajo -->
    <q-banner
      v-if="alertas.length > 0"
      class="bg-orange-1 rounded-borders q-mb-md"
      dense
    >
      <template #avatar><q-icon name="warning" color="warning" /></template>
      <strong>{{ alertas.length }} producto(s) con stock bajo.</strong>
      {{ alertas.map(a => a.sku).join(', ') }}
    </q-banner>

    <!-- Tabs: Stock | Movimientos -->
    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="q-px-md q-pt-sm">
        <q-tab name="stock" icon="warehouse" label="Stock actual" />
        <q-tab name="movimientos" icon="history" label="Movimientos" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tabActivo" animated>
        <!-- Tab: Stock -->
        <q-tab-panel name="stock" class="q-pa-none">
          <q-table
            :rows="stockFiltrado" :columns="columnasStock" :loading="loadingStock"
            row-key="id" flat class="sgi-table"
            :pagination="{ rowsPerPage: 20 }"
            no-data-label="No hay registros de stock para esta sucursal"
          >
            <!-- Imagen -->
            <template #body-cell-imagenUrl="{ value }">
              <q-td>
                <q-avatar size="36px" square rounded>
                  <img v-if="value" :src="value" loading="lazy" />
                  <q-icon v-else name="image" color="grey-4" size="26px" />
                </q-avatar>
              </q-td>
            </template>

            <!-- Stock con indicador -->
            <template #body-cell-stockActual="{ row }">
              <q-td class="text-center">
                <q-chip
                  dense :color="row.stockBajo ? 'negative' : 'positive'"
                  text-color="white" :icon="row.stockBajo ? 'warning' : 'check'"
                >
                  {{ row.stockActual }} {{ row.unidad }}
                </q-chip>
                <div class="text-caption text-muted">Mín: {{ row.stockMinimo }}</div>
              </q-td>
            </template>

            <template #no-data="{ message }">
              <div class="full-width column flex-center q-pa-xl text-muted">
                <q-icon name="warehouse" size="48px" style="opacity:0.3" class="q-mb-md" />
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
      <EntradaForm @saved="onMovimientoGuardado" @cancelled="dialogEntrada = false" />
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
import type { QTableColumn } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import type { InventarioItem, StockResumen } from 'src/types'
import EntradaForm from 'src/components/inventario/EntradaForm.vue'
import SalidaForm from 'src/components/inventario/SalidaForm.vue'
import TransferenciaForm from 'src/components/inventario/TransferenciaForm.vue'
import MovimientosTable from 'src/components/inventario/MovimientosTable.vue'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()

// ── State ──────────────────────────────────────────────────────
const sucursalActiva = ref(authStore.sucursalId ?? '')
const busqueda = ref('')
const tabActivo = ref('stock')
const stock = ref<(InventarioItem & Record<string, unknown>)[]>([])
const movimientos = ref([])
const alertas = ref<StockResumen[]>([])
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
  if (!busqueda.value.trim()) return stock.value
  const q = busqueda.value.toLowerCase()
  return stock.value.filter((s) =>
    String(s.sku ?? '').toLowerCase().includes(q) ||
    String(s.nombre ?? '').toLowerCase().includes(q) ||
    String(s.marca ?? '').toLowerCase().includes(q),
  )
})

const totalUnidades = computed(() => stock.value.reduce((sum, s) => sum + (s.stockActual as number), 0))

const columnasStock: QTableColumn[] = [
  { name: 'imagenUrl',   label: '',            field: 'imagenUrl',   align: 'center', style: 'width:52px' },
  { name: 'sku',         label: 'SKU',          field: 'sku',         align: 'left',  sortable: true },
  { name: 'nombre',      label: 'Producto',     field: 'nombre',      align: 'left',  sortable: true },
  { name: 'marca',       label: 'Marca',        field: 'marca',       align: 'left',  sortable: true },
  { name: 'stockActual', label: 'Stock',        field: 'stockActual', align: 'center', sortable: true },
  { name: 'fechaActualizacion', label: 'Actualizado', field: 'fechaActualizacion', align: 'left' },
]

// ── Actions ────────────────────────────────────────────────────
function abrirDialog(tipo: 'entrada' | 'salida' | 'transferencia'): void {
  if (tipo === 'entrada')      dialogEntrada.value = true
  if (tipo === 'salida')       dialogSalida.value = true
  if (tipo === 'transferencia') dialogTransferencia.value = true
}

async function cargarStock(): Promise<void> {
  if (!sucursalActiva.value) return
  loadingStock.value = true
  try {
    stock.value = await inventarioService.getStockPorSucursal(sucursalActiva.value) as never[]
    alertas.value = await inventarioService.getAlertasStock(sucursalActiva.value)
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
    movimientos.value = await inventarioService.getMovimientos(sucursalActiva.value) as never[]
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
  if (!sucursalActiva.value && sucursalStore.activas.length > 0) {
    sucursalActiva.value = sucursalStore.activas[0].id
  }
  await cargarDatos()
})
</script>
