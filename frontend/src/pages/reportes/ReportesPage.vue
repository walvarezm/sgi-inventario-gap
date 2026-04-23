<template>
  <q-page class="sgi-page">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Reportes</div>
        <div class="text-muted text-body2 q-mt-xs">Análisis de ventas, stock y movimientos</div>
      </div>
    </div>

    <!-- Filtros globales -->
    <q-card class="sgi-card q-mb-md" flat>
      <q-card-section class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-3">
          <q-select
            v-model="filtros.sucursalId"
            :options="[{ label: 'Todas las sucursales', value: undefined }, ...opcionesSucursal]"
            label="Sucursal" outlined dense emit-value map-options
            :disable="!authStore.isGlobal"
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="filtros.desde" label="Desde" outlined dense type="date" />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="filtros.hasta" label="Hasta" outlined dense type="date" />
        </div>
        <div class="col-12 col-sm-2">
          <q-select
            v-model="filtros.agruparPor"
            :options="[{ label: 'Por día', value: 'dia' }, { label: 'Por mes', value: 'mes' }]"
            label="Agrupar" outlined dense emit-value map-options
          />
        </div>
        <div class="col-auto">
          <q-btn color="primary" unelevated icon="search" label="Generar"
            :loading="cargando" @click="cargarReportes" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabs de reportes -->
    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="q-px-md q-pt-sm">
        <q-tab name="ventas"      icon="point_of_sale"   label="Ventas" />
        <q-tab name="top"         icon="emoji_events"    label="Top Productos" />
        <q-tab name="stock"       icon="warehouse"       label="Stock" />
        <q-tab name="movimientos" icon="swap_horiz"      label="Movimientos" />
      </q-tabs>
      <q-separator />

      <!-- ── Tab Ventas ─────────────────────────────────── -->
      <q-tab-panel name="ventas" class="q-pa-md">
        <GraficoVentas
          :datos="datosVentas"
          :loading="cargandoVentas"
          titulo="Ventas por período"
        />

        <!-- Resumen numérico -->
        <div class="row q-col-gutter-md q-mt-md" v-if="datosVentas.length">
          <div class="col-12 col-sm-4">
            <q-card class="sgi-card bg-blue-1" flat>
              <q-card-section class="text-center">
                <div class="text-caption text-muted">Total período</div>
                <div class="text-h5 text-weight-bold text-primary">
                  {{ formatCurrency(totalVentas) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-4">
            <q-card class="sgi-card bg-green-1" flat>
              <q-card-section class="text-center">
                <div class="text-caption text-muted">Facturas emitidas</div>
                <div class="text-h5 text-weight-bold text-positive">
                  {{ totalFacturas }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-4">
            <q-card class="sgi-card bg-teal-1" flat>
              <q-card-section class="text-center">
                <div class="text-caption text-muted">Promedio por día</div>
                <div class="text-h5 text-weight-bold text-teal">
                  {{ formatCurrency(promedioVentas) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- ── Tab Top Productos ──────────────────────────── -->
      <q-tab-panel name="top" class="q-pa-md">
        <div v-if="cargandoTop" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="48px" />
        </div>
        <div v-else-if="!topProductos.length" class="flex flex-center text-muted q-pa-xl">
          <div class="text-center">
            <q-icon name="emoji_events" size="64px" style="opacity:0.2" />
            <div class="q-mt-sm">Sin datos para el período</div>
          </div>
        </div>
        <div v-else>
          <!-- Tabla de top productos -->
          <q-table
            :rows="topProductos"
            :columns="columnasTop"
            row-key="productoId"
            flat class="sgi-table"
            :pagination="{ rowsPerPage: 10 }"
            hide-bottom
          >
            <template #body-cell-ranking="{ rowIndex }">
              <q-td class="text-center">
                <q-avatar
                  size="28px"
                  :color="rowIndex === 0 ? 'amber' : rowIndex === 1 ? 'grey-4' : rowIndex === 2 ? 'deep-orange-2' : 'blue-grey-1'"
                  :text-color="rowIndex < 3 ? 'white' : 'grey-8'"
                  font-size="13px"
                >
                  {{ rowIndex + 1 }}
                </q-avatar>
              </q-td>
            </template>
            <template #body-cell-totalVendido="{ value }">
              <q-td class="text-right text-weight-bold text-positive">{{ formatCurrency(value) }}</q-td>
            </template>
          </q-table>

          <!-- Exportar -->
          <div class="q-mt-md">
            <q-btn outline color="positive" icon="table_chart" label="Exportar CSV"
              size="sm" @click="exportarTopCSV" />
          </div>
        </div>
      </q-tab-panel>

      <!-- ── Tab Stock ──────────────────────────────────── -->
      <q-tab-panel name="stock" class="q-pa-none">
        <TablaStock
          :stock="reporteStock"
          :loading="cargandoStock"
          :nombre-sucursal="sucursalNombreFiltro"
        />
      </q-tab-panel>

      <!-- ── Tab Movimientos ────────────────────────────── -->
      <q-tab-panel name="movimientos" class="q-pa-md">
        <q-table
          :rows="movimientos"
          :columns="columnasMovimientos"
          :loading="cargandoMovimientos"
          row-key="id" flat class="sgi-table"
          :pagination="{ rowsPerPage: 20 }"
          no-data-label="Sin movimientos para los filtros seleccionados"
        >
          <template #body-cell-tipo="{ value }">
            <q-td>
              <q-chip dense size="sm"
                :color="colorMovimiento(value)" text-color="white"
                :icon="iconoMovimiento(value)" :label="value"
              />
            </q-td>
          </template>
          <template #body-cell-cantidad="{ row }">
            <q-td class="text-right">
              <span :class="row.tipo === 'ENTRADA' ? 'text-positive' : row.tipo === 'SALIDA' ? 'text-negative' : 'text-primary'"
                class="text-weight-bold">
                {{ row.tipo === 'ENTRADA' ? '+' : row.tipo === 'SALIDA' ? '-' : '↔' }}{{ row.cantidad }}
              </span>
            </q-td>
          </template>
          <template #body-cell-fecha="{ value }">
            <q-td>
              <div>{{ formatDate(value) }}</div>
              <div class="text-caption text-muted">{{ formatTime(value) }}</div>
            </q-td>
          </template>

          <template #no-data="{ message }">
            <div class="full-width column flex-center q-pa-xl text-muted">
              <q-icon name="swap_horiz" size="48px" style="opacity:0.3" class="q-mb-md" />
              <span>{{ message }}</span>
            </div>
          </template>
        </q-table>

        <!-- Exportar movimientos -->
        <div class="q-mt-md" v-if="movimientos.length">
          <q-btn outline color="positive" icon="table_chart" label="Exportar CSV"
            size="sm" @click="exportarMovimientosCSV" />
        </div>
      </q-tab-panel>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { QTableColumn } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { reporteService } from 'src/services/reporteService'
import { inventarioService } from 'src/services/inventarioService'
import type { PuntoVentas, TopProducto, ReporteStockItem, FiltroReporte } from 'src/types'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import GraficoVentas from 'src/components/reportes/GraficoVentas.vue'
import TablaStock from 'src/components/reportes/TablaStock.vue'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()

// ── Filtros ────────────────────────────────────────────────
const hoy = new Date()
const filtros = ref<FiltroReporte>({
  sucursalId: authStore.isGlobal ? undefined : (authStore.sucursalId ?? undefined),
  desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10),
  hasta: hoy.toISOString().slice(0, 10),
  agruparPor: 'dia',
})

const tabActivo = ref('ventas')

// ── Data ───────────────────────────────────────────────────
const datosVentas = ref<PuntoVentas[]>([])
const topProductos = ref<TopProducto[]>([])
const reporteStock = ref<ReporteStockItem[]>([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const movimientos = ref<any[]>([])

// ── Loading ────────────────────────────────────────────────
const cargando = ref(false)
const cargandoVentas = ref(false)
const cargandoTop = ref(false)
const cargandoStock = ref(false)
const cargandoMovimientos = ref(false)

// ── Computed ───────────────────────────────────────────────
const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: s.nombre, value: s.id })),
)

const sucursalNombreFiltro = computed(() => {
  if (!filtros.value.sucursalId) return 'Todas'
  return sucursalStore.getById(filtros.value.sucursalId)?.nombre ?? 'Sucursal'
})

const totalVentas = computed(() => datosVentas.value.reduce((s, d) => s + d.total, 0))
const totalFacturas = computed(() => datosVentas.value.reduce((s, d) => s + d.cantidad, 0))
const promedioVentas = computed(() =>
  datosVentas.value.length ? totalVentas.value / datosVentas.value.length : 0,
)

// ── Columnas ───────────────────────────────────────────────
const columnasTop: QTableColumn[] = [
  { name: 'ranking',        label: '#',           field: 'productoId',     align: 'center', style: 'width:50px' },
  { name: 'sku',            label: 'SKU',         field: 'sku',            align: 'left' },
  { name: 'nombre',         label: 'Producto',    field: 'nombre',         align: 'left',  sortable: true },
  { name: 'marca',          label: 'Marca',       field: 'marca',          align: 'left' },
  { name: 'cantidadVendida',label: 'Cant. Vend.', field: 'cantidadVendida',align: 'center', sortable: true },
  { name: 'totalVendido',   label: 'Total Vend.', field: 'totalVendido',   align: 'right',  sortable: true },
]

const columnasMovimientos: QTableColumn[] = [
  { name: 'tipo',           label: 'Tipo',       field: 'tipo',           align: 'left',  sortable: true },
  { name: 'productoNombre', label: 'Producto',   field: 'productoNombre', align: 'left' },
  { name: 'cantidad',       label: 'Cantidad',   field: 'cantidad',       align: 'right' },
  { name: 'referencia',     label: 'Referencia', field: 'referencia',     align: 'left' },
  { name: 'fecha',          label: 'Fecha',      field: 'fecha',          align: 'left',  sortable: true },
  { name: 'notas',          label: 'Notas',      field: 'notas',          align: 'left' },
]

// ── Helpers ────────────────────────────────────────────────
function colorMovimiento(tipo: string): string {
  return tipo === 'ENTRADA' ? 'positive' : tipo === 'SALIDA' ? 'negative' : tipo === 'TRANSFERENCIA' ? 'primary' : 'warning'
}
function iconoMovimiento(tipo: string): string {
  return tipo === 'ENTRADA' ? 'add_circle' : tipo === 'SALIDA' ? 'remove_circle' : tipo === 'TRANSFERENCIA' ? 'swap_horiz' : 'tune'
}
function formatTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

// ── Cargar datos ───────────────────────────────────────────
async function cargarReportes(): Promise<void> {
  cargando.value = true
  await Promise.all([
    cargarVentas(),
    cargarTop(),
    cargarStock(),
    cargarMovimientos(),
  ])
  cargando.value = false
}

async function cargarVentas(): Promise<void> {
  cargandoVentas.value = true
  try {
    datosVentas.value = await reporteService.getReporteVentas(filtros.value)
  } catch { datosVentas.value = [] } finally { cargandoVentas.value = false }
}

async function cargarTop(): Promise<void> {
  cargandoTop.value = true
  try {
    topProductos.value = await reporteService.getTopProductos({ ...filtros.value, limite: 10 })
  } catch { topProductos.value = [] } finally { cargandoTop.value = false }
}

async function cargarStock(): Promise<void> {
  cargandoStock.value = true
  try {
    reporteStock.value = await reporteService.getReporteStock({
      sucursalId: filtros.value.sucursalId,
    })
  } catch { reporteStock.value = [] } finally { cargandoStock.value = false }
}

async function cargarMovimientos(): Promise<void> {
  cargandoMovimientos.value = true
  try {
    movimientos.value = await inventarioService.getMovimientos(
      filtros.value.sucursalId ?? '',
      filtros.value.desde,
      filtros.value.hasta,
    )
  } catch { movimientos.value = [] } finally { cargandoMovimientos.value = false }
}

// ── Exportaciones CSV ──────────────────────────────────────
function exportarTopCSV(): void {
  const enc = ['Ranking', 'SKU', 'Producto', 'Marca', 'Cantidad_Vendida', 'Total_Vendido']
  const filas = topProductos.value.map((p, i) => [
    i + 1, p.sku, `"${p.nombre}"`, p.marca, p.cantidadVendida, p.totalVendido.toFixed(2),
  ])
  descargarCSV('top_productos', [enc, ...filas])
}

function exportarMovimientosCSV(): void {
  const enc = ['Tipo', 'Producto', 'SKU', 'Cantidad', 'Referencia', 'Fecha', 'Notas']
  const filas = movimientos.value.map((m) => [
    m.tipo, `"${m.productoNombre}"`, m.productoSku, m.cantidad,
    m.referencia, formatDate(m.fecha), `"${m.notas || ''}"`,
  ])
  descargarCSV('movimientos', [enc, ...filas])
}

function descargarCSV(nombre: string, filas: (string | number)[][]): void {
  const csv = filas.map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  await cargarReportes()
})
</script>
