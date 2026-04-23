<template>
  <q-page class="sgi-page">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Dashboard</div>
        <div class="text-muted text-body2 q-mt-xs">
          Bienvenido, <strong>{{ authStore.nombreUsuario }}</strong>
          · {{ formatDateTime(new Date().toISOString()) }}
        </div>
      </div>
      <q-space />
      <div class="row q-gutter-sm items-center">
        <!-- Selector de sucursal -->
        <q-select
          v-if="authStore.isGlobal"
          v-model="sucursalFiltro"
          :options="[{ label: 'Todas las sucursales', value: null }, ...opcionesSucursal]"
          outlined dense emit-value map-options
          style="min-width:200px"
          @update:model-value="cargarTodo"
        />
        <q-btn flat round icon="refresh" color="primary" :loading="cargando" @click="cargarTodo">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ── KPI Cards ─────────────────────────────────────── -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Ventas hoy -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="sgi-card kpi-card" flat>
          <q-card-section class="row items-center no-wrap">
            <div class="col">
              <div class="kpi-label">Ventas hoy</div>
              <div class="kpi-value text-primary">
                <template v-if="cargando"><q-skeleton type="text" width="80%" /></template>
                <template v-else>{{ formatCurrency(kpis?.ventasHoy ?? 0) }}</template>
              </div>
              <div class="kpi-sub text-muted">{{ kpis?.facturasCantidadHoy ?? 0 }} factura(s)</div>
            </div>
            <q-icon name="today" color="primary" size="40px" style="opacity:0.5" />
          </q-card-section>
          <q-linear-progress :value="ventasHoyProgress" color="primary" size="3px" />
        </q-card>
      </div>

      <!-- Ventas del mes -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="sgi-card kpi-card" flat>
          <q-card-section class="row items-center no-wrap">
            <div class="col">
              <div class="kpi-label">Ventas del mes</div>
              <div class="kpi-value text-positive">
                <template v-if="cargando"><q-skeleton type="text" width="80%" /></template>
                <template v-else>{{ formatCurrency(kpis?.ventasMes ?? 0) }}</template>
              </div>
              <div class="kpi-sub text-muted">{{ kpis?.facturasCantidadMes ?? 0 }} factura(s)</div>
            </div>
            <q-icon name="calendar_month" color="positive" size="40px" style="opacity:0.5" />
          </q-card-section>
          <q-linear-progress :value="0.6" color="positive" size="3px" />
        </q-card>
      </div>

      <!-- Stock bajo -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="sgi-card kpi-card" flat>
          <q-card-section class="row items-center no-wrap">
            <div class="col">
              <div class="kpi-label">Alertas de stock</div>
              <div class="kpi-value" :class="(kpis?.stockBajo ?? 0) > 0 ? 'text-negative' : 'text-positive'">
                <template v-if="cargando"><q-skeleton type="text" width="60%" /></template>
                <template v-else>{{ kpis?.stockBajo ?? 0 }}</template>
              </div>
              <div class="kpi-sub text-muted">productos bajo mínimo</div>
            </div>
            <q-icon
              :name="(kpis?.stockBajo ?? 0) > 0 ? 'warning' : 'check_circle'"
              :color="(kpis?.stockBajo ?? 0) > 0 ? 'negative' : 'positive'"
              size="40px" style="opacity:0.5"
            />
          </q-card-section>
          <q-linear-progress
            :value="(kpis?.stockBajo ?? 0) > 0 ? 0.8 : 0.1"
            :color="(kpis?.stockBajo ?? 0) > 0 ? 'negative' : 'positive'"
            size="3px"
          />
        </q-card>
      </div>

      <!-- Valor inventario -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="sgi-card kpi-card" flat>
          <q-card-section class="row items-center no-wrap">
            <div class="col">
              <div class="kpi-label">Valor inventario</div>
              <div class="kpi-value text-teal">
                <template v-if="cargando"><q-skeleton type="text" width="80%" /></template>
                <template v-else>{{ formatCurrency(kpis?.valorInventario ?? 0) }}</template>
              </div>
              <div class="kpi-sub text-muted">{{ kpis?.productosActivos ?? 0 }} productos activos</div>
            </div>
            <q-icon name="inventory" color="teal" size="40px" style="opacity:0.5" />
          </q-card-section>
          <q-linear-progress :value="0.5" color="teal" size="3px" />
        </q-card>
      </div>
    </div>

    <!-- ── Gráfico + Top Productos ────────────────────────── -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Gráfico de ventas -->
      <div class="col-12 col-md-8">
        <GraficoVentas
          :datos="datosVentas"
          :loading="cargandoVentas"
          titulo="Ventas últimos 30 días"
        />
      </div>

      <!-- Top productos -->
      <div class="col-12 col-md-4">
        <q-card class="sgi-card" flat style="height:100%">
          <q-card-section class="q-pb-sm">
            <div class="text-subtitle1 text-weight-bold">Top 5 Productos</div>
            <div class="text-caption text-muted">Más vendidos este mes</div>
          </q-card-section>

          <div v-if="cargandoTop" class="q-pa-md">
            <q-skeleton v-for="n in 5" :key="n" type="text" class="q-mb-sm" />
          </div>

          <q-list separator v-else-if="topProductos.length">
            <q-item v-for="(p, i) in topProductos" :key="p.productoId" dense>
              <q-item-section avatar>
                <q-avatar
                  size="28px"
                  :color="i === 0 ? 'amber' : i === 1 ? 'grey-4' : i === 2 ? 'deep-orange-2' : 'blue-grey-1'"
                  :text-color="i === 0 ? 'white' : 'grey-8'"
                  font-size="13px"
                >
                  {{ i + 1 }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="ellipsis text-weight-medium" style="max-width:150px">
                  {{ p.nombre }}
                </q-item-label>
                <q-item-label caption>{{ p.sku }} · {{ p.marca }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-positive text-weight-bold">{{ p.cantidadVendida }}</div>
                <div class="text-caption text-muted">unid.</div>
              </q-item-section>
            </q-item>
          </q-list>

          <div v-else class="flex flex-center q-pa-xl text-muted">
            <span class="text-caption">Sin ventas en el período</span>
          </div>
        </q-card>
      </div>
    </div>

    <!-- ── Accesos rápidos ────────────────────────────────── -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="sgi-card" flat>
          <q-card-section class="q-pb-sm">
            <div class="text-subtitle1 text-weight-bold">Accesos rápidos</div>
          </q-card-section>
          <q-card-section class="q-pt-none row q-col-gutter-sm">
            <div v-for="acc in accesosRapidos" :key="acc.name" class="col-6 col-sm-4 col-md-2">
              <q-btn
                v-if="authStore.hasRole(acc.roles as Rol[])"
                :to="{ name: acc.name }"
                flat unelevated
                class="acceso-btn full-width"
                :color="acc.color"
              >
                <div class="column items-center q-pa-sm">
                  <q-icon :name="acc.icon" size="28px" />
                  <div class="text-caption q-mt-xs text-weight-medium">{{ acc.label }}</div>
                </div>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { reporteService } from 'src/services/reporteService'
import type { KPIs, PuntoVentas, TopProducto, Rol } from 'src/types'
import { formatCurrency, formatDateTime } from 'src/utils/formatters'
import GraficoVentas from 'src/components/reportes/GraficoVentas.vue'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()

const sucursalFiltro = ref<string | null>(
  authStore.isGlobal ? null : (authStore.sucursalId ?? null),
)

const kpis = ref<KPIs | null>(null)
const datosVentas = ref<PuntoVentas[]>([])
const topProductos = ref<TopProducto[]>([])

const cargando = ref(false)
const cargandoVentas = ref(false)
const cargandoTop = ref(false)

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: s.nombre, value: s.id })),
)

const ventasHoyProgress = computed(() => {
  if (!kpis.value || !kpis.value.ventasMes) return 0
  return Math.min(kpis.value.ventasHoy / kpis.value.ventasMes, 1)
})

const accesosRapidos = [
  { name: 'pos',         label: 'Punto de Venta', icon: 'point_of_sale', color: 'primary',  roles: ['ADMINISTRADOR','SUPERVISOR','VENDEDOR'] },
  { name: 'inventario',  label: 'Inventario',     icon: 'warehouse',     color: 'teal',     roles: ['ADMINISTRADOR','SUPERVISOR','BODEGUERO'] },
  { name: 'catalogo',    label: 'Catálogo',       icon: 'menu_book',     color: 'indigo',   roles: ['ADMINISTRADOR','SUPERVISOR','BODEGUERO','VENDEDOR','CONTADOR'] },
  { name: 'productos',   label: 'Productos',      icon: 'inventory_2',   color: 'cyan',     roles: ['ADMINISTRADOR','SUPERVISOR'] },
  { name: 'proveedores', label: 'Proveedores',    icon: 'local_shipping',color: 'orange',   roles: ['ADMINISTRADOR','SUPERVISOR','BODEGUERO'] },
  { name: 'reportes',    label: 'Reportes',       icon: 'bar_chart',     color: 'positive', roles: ['ADMINISTRADOR','SUPERVISOR','CONTADOR'] },
]

// Fechas para filtros
function getFechaDesde30Dias(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}
function getFechaInicioMes(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

async function cargarKPIs(): Promise<void> {
  cargando.value = true
  try {
    kpis.value = await reporteService.getKPIs(
      sucursalFiltro.value ? { sucursalId: sucursalFiltro.value } : {},
    )
  } catch { /* continuar */ } finally {
    cargando.value = false
  }
}

async function cargarVentas(): Promise<void> {
  cargandoVentas.value = true
  try {
    datosVentas.value = await reporteService.getReporteVentas({
      sucursalId: sucursalFiltro.value ?? undefined,
      desde: getFechaDesde30Dias(),
      agruparPor: 'dia',
    })
  } catch { datosVentas.value = [] } finally {
    cargandoVentas.value = false
  }
}

async function cargarTopProductos(): Promise<void> {
  cargandoTop.value = true
  try {
    topProductos.value = await reporteService.getTopProductos({
      sucursalId: sucursalFiltro.value ?? undefined,
      desde: getFechaInicioMes(),
      limite: 5,
    })
  } catch { topProductos.value = [] } finally {
    cargandoTop.value = false
  }
}

async function cargarTodo(): Promise<void> {
  await Promise.all([cargarKPIs(), cargarVentas(), cargarTopProductos()])
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
  await cargarTodo()
})
</script>

<style scoped lang="scss">
.kpi-card {
  transition: box-shadow 0.2s;
  &:hover { box-shadow: var(--sgi-shadow-lg); }
  .kpi-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--sgi-text-muted);
    margin-bottom: 4px;
  }
  .kpi-value { font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
  .kpi-sub { font-size: 0.78rem; margin-top: 2px; }
}
.acceso-btn {
  border-radius: var(--sgi-radius-lg);
  border: 1px solid var(--sgi-border);
  &:hover { background: rgba(21,101,192,0.06); }
}
</style>
