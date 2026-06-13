<template>
  <q-card class="sgi-card" flat>
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-subtitle1 text-weight-bold">Comprobantes de Movimiento</div>
      <q-space />
      <div class="col-12 col-sm-3">
        <q-input v-model="busqueda" placeholder="Buscar referencia…" outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <q-select
        v-model="filtroTipo"
        :options="opcionesTipo"
        label="Tipo"
        outlined
        dense
        emit-value
        map-options
        clearable
        class="col-12 col-sm-2 q-mx-sm"
      />
      <q-select
        v-model="filtroModo"
        :options="opcionesModo"
        label="Modo"
        outlined
        dense
        emit-value
        map-options
        clearable
        class="col-12 col-sm-2"
      />
      <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="emit('refresh')">
        <q-tooltip>Recargar</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-table
      :rows="movimientosFiltrados"
      :columns="columnas"
      :loading="loading"
      row-key="id"
      flat
      dense
      class="sgi-table"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="Sin movimientos registrados"
    >
      <!-- ── Tipo ── -->
      <template #body-cell-tipo="{ value }">
        <q-td>
          <q-chip
            dense
            size="sm"
            :color="colorTipo(value)"
            text-color="white"
            :label="labelTipo(value)"
          />
        </q-td>
      </template>

      <!-- ── Modo ── -->
      <template #body-cell-modo="{ value }">
        <q-td>
          <q-chip dense size="sm" color="primary" text-color="white" :label="value" />
        </q-td>
      </template>

      <!-- ── Fecha ── -->
      <template #body-cell-fechaRegistro="{ value }">
        <q-td>
          <div>{{ formatDate(value) }}</div>
          <div class="text-caption text-muted">{{ formatTime(value) }}</div>
        </q-td>
      </template>

      <!-- ── Referencia ── -->
      <template #body-cell-referencia="{ row }">
        <q-td>
          <div class="text-weight-medium">{{ row.referencia }}</div>
          <div class="text-caption text-muted">{{ row.referenciaTipo }}</div>
        </q-td>
      </template>

      <!-- ── Sucursales ── -->
      <template #body-cell-sucursales="{ row }">
        <q-td>
          <div v-if="row.sucursalOrigen">
            <span class="text-caption text-muted">Origen:</span>
            <span class="text-weight-medium">{{ getNombre(row.sucursalOrigen) }}</span>
          </div>
          <div v-if="row.sucursalDestino">
            <span class="text-caption text-muted">Destino:</span>
            <span class="text-weight-medium">{{ getNombre(row.sucursalDestino) }}</span>
          </div>
        </q-td>
      </template>

      <!-- ── Cantidad ── -->
      <template #body-cell-cantidadTotal="{ value, row }">
        <q-td class="text-center">
          <div class="text-weight-bold">{{ value }}</div>
          <div class="text-caption text-muted">{{ row.totalLineas }} línea(s)</div>
        </q-td>
      </template>

      <!-- ── Acciones de cabecera ── -->
      <template #body-cell-acciones="{ row }">
        <q-td class="text-center">
          <!-- Botón editar completo (abre dialog) -->
          <q-btn
            v-if="canEdit && row.editable"
            flat
            round
            dense
            icon="edit"
            color="primary"
            @click="emit('edit', row.id)"
          >
            <q-tooltip>Editar movimiento completo</q-tooltip>
          </q-btn>

          <!-- Botón expand / contraer líneas -->
          <q-btn
            flat
            round
            dense
            :icon="expandedRows.has(row.id) ? 'expand_less' : 'expand_more'"
            :color="expandedRows.has(row.id) ? 'secondary' : 'grey-6'"
            :loading="loadingDetalle.has(row.id)"
            @click="toggleExpand(row)"
          >
            <q-tooltip>
              {{ expandedRows.has(row.id) ? 'Contraer líneas' : 'Ver y editar líneas' }}
            </q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- ── Panel expandido: tabla de líneas de detalle ── -->
      <template #body="props">
        <q-tr :props="props">
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <!-- Tipo -->
            <template v-if="col.name === 'tipo'">
              <q-chip
                dense
                size="sm"
                :color="colorTipo(col.value)"
                text-color="white"
                :label="labelTipo(col.value)"
              />
            </template>

            <!-- Modo -->
            <template v-else-if="col.name === 'modo'">
              <q-chip dense size="sm" color="primary" text-color="white" :label="col.value" />
            </template>

            <!-- Fecha -->
            <template v-else-if="col.name === 'fechaRegistro'">
              <div>
                {{ formatDate(col.value) }}
                <span class="text-caption text-muted">{{ formatTime(col.value) }}</span>
              </div>
            </template>

            <!-- Referencia -->
            <template v-else-if="col.name === 'referencia'">
              <div class="text-weight-medium">{{ props.row.referencia }}</div>
              <div class="text-caption text-muted">{{ props.row.referenciaTipo }}</div>
            </template>

            <!-- Sucursales -->
            <template v-else-if="col.name === 'sucursales'">
              <div v-if="props.row.sucursalOrigen">
                <span class="text-caption text-muted">Origen:</span>
                <span class="text-weight-medium">{{ getNombre(props.row.sucursalOrigen) }}</span>
              </div>
              <div v-if="props.row.sucursalDestino">
                <span class="text-caption text-muted">Destino:</span>
                <span class="text-weight-medium">{{ getNombre(props.row.sucursalDestino) }}</span>
              </div>
            </template>

            <!-- Cantidad -->
            <template v-else-if="col.name === 'cantidadTotal'">
              <div class="text-weight-bold">{{ col.value }}</div>
              <div class="text-caption text-muted">{{ props.row.totalLineas }} línea(s)</div>
            </template>

            <!-- Acciones -->
            <template v-else-if="col.name === 'acciones'">
              <q-btn
                v-if="canEdit && props.row.editable"
                flat
                round
                dense
                icon="edit"
                color="primary"
                @click="emit('edit', props.row.id)"
              >
                <q-tooltip>Editar movimiento completo</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                :icon="expandedRows.has(props.row.id) ? 'expand_less' : 'expand_more'"
                :color="expandedRows.has(props.row.id) ? 'secondary' : 'grey-6'"
                :loading="loadingDetalle.has(props.row.id)"
                @click="toggleExpand(props.row)"
              >
                <q-tooltip>
                  {{ expandedRows.has(props.row.id) ? 'Contraer líneas' : 'Ver y editar líneas' }}
                </q-tooltip>
              </q-btn>
            </template>

            <!-- Default -->
            <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>

        <!-- ── Fila expandida de detalle ── -->
        <q-tr v-if="expandedRows.has(props.row.id)" :props="props" class="detalle-expand-row">
          <q-td :colspan="columnas.length" class="q-pa-none">
            <div class="detalle-panel q-pa-sm">
              <!-- Header del panel -->
              <div class="row items-center q-mb-xs q-px-sm">
                <q-icon name="list_alt" color="primary" size="18px" class="q-mr-xs" />
                <span class="text-caption text-weight-bold text-primary">
                  Líneas del comprobante
                  <q-badge
                    color="primary"
                    :label="
                      (detallesPorCabecera[props.row.id] ?? []).filter(
                        (i) => !deletedIds.has(i.id ?? ''),
                      ).length
                    "
                  />
                </span>
                <q-space />
                <span class="text-caption text-grey-6 q-mr-sm">
                  Editar o eliminar cada línea de forma independiente
                </span>
                <q-btn
                  dense
                  size="sm"
                  icon="refresh"
                  color="primary"
                  :loading="loadingDetalle.has(props.row.id)"
                  @click="recargarDetalle(props.row)"
                >
                  <q-tooltip>Recargar líneas</q-tooltip>
                </q-btn>
              </div>

              <!-- Loading skeleton -->
              <div v-if="loadingDetalle.has(props.row.id)" class="q-pa-md text-center text-grey-5">
                <q-spinner-dots color="primary" size="28px" />
                <div class="text-caption q-mt-xs">Cargando líneas…</div>
              </div>

              <!-- Sin líneas -->
              <div
                v-else-if="(detallesPorCabecera[props.row.id] ?? []).length === 0"
                class="q-pa-md text-center text-grey-5"
              >
                <q-icon name="inbox" size="32px" />
                <div class="text-caption">Sin líneas registradas</div>
              </div>

              <!-- Tabla de líneas editables -->
              <table
                v-else
                class="sgi-table detalle-table full-width"
                style="border-collapse: collapse"
              >
                <thead>
                  <tr class="detalle-header">
                    <th style="width: 40px" class="text-center text-caption">#</th>
                    <th style="width: 60px" class="text-left text-caption">Línea</th>
                    <th class="text-left text-caption">Producto</th>
                    <th style="width: 90px" class="text-center text-caption">Cantidad</th>
                    <th style="width: 110px" class="text-right text-caption">P. Venta</th>
                    <th style="width: 110px" class="text-right text-caption">P. Final</th>
                    <th class="text-left text-caption">Observación</th>
                    <th style="width: 110px" class="text-center text-caption">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <MovimientoDetalleRow
                    v-for="(detalle, idx) in detallesPorCabecera[props.row.id] ?? []"
                    :key="detalle.id ?? detalle.productoId + idx"
                    :item="detalle"
                    :row-index="idx"
                    :cabecera-id="props.row.id"
                    :tipo="props.row.tipo"
                    :total-rows="
                      (detallesPorCabecera[props.row.id] ?? []).filter(
                        (i) => !deletedIds.has(i.id ?? ''),
                      ).length
                    "
                    :sucursal-origen="props.row.sucursalOrigen"
                    :sucursal-destino="props.row.sucursalDestino"
                    @saved="onDetalleSaved(props.row.id, idx, $event)"
                    @deleted="onDetalleDeleted(props.row.id, detalle.id ?? '')"
                  />
                </tbody>
              </table>
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { QTableColumn } from 'quasar'
import type {
  MovimientoCabecera,
  ModoMovimiento,
  MovimientoDetalleItem,
  TipoMovimiento,
} from 'src/types'
import { TIPO_MOVIMIENTO_LABELS } from 'src/types'
import { useSucursal } from 'src/composables/useSucursal.ts'
import { useAuthStore } from 'src/stores/authStore'
import { inventarioService } from 'src/services/inventarioService'
import { useNotify } from 'src/composables/useNotify'
import MovimientoDetalleRow from './MovimientoDetalleRow.vue'
import { formatDate, formatDateTime, formatTime } from 'src/utils/formatters.ts'

const { getNombre } = useSucursal()
const authStore = useAuthStore()
const { notifyError } = useNotify()

const props = withDefaults(
  defineProps<{
    movimientos: MovimientoCabecera[]
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{ refresh: []; edit: [id: string] }>()

// ── Estado local ─────────────────────────────────────────────────────────────
const busqueda = ref('')
const filtroTipo = ref<TipoMovimiento | null>(null)
const filtroModo = ref<ModoMovimiento | null>(null)

/** IDs de cabeceras cuyo panel de detalle está abierto */
const expandedRows = reactive<Set<string>>(new Set())

/** Detalles cargados por cabeceraId */
const detallesPorCabecera = reactive<Record<string, MovimientoDetalleItem[]>>({})

/** IDs de cabeceras cuyo detalle está cargando */
const loadingDetalle = reactive<Set<string>>(new Set())

/** IDs de líneas que ya fueron eliminadas (para ocultar visualmente) */
const deletedIds = reactive<Set<string>>(new Set())

// ── Permisos ─────────────────────────────────────────────────────────────────
const canEdit = computed(
  () =>
    authStore.can('inventario.editar_movimientos') ||
    authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)

// ── Filtros ──────────────────────────────────────────────────────────────────
const opcionesTipo = [
  { label: 'Todos', value: null },
  { label: 'Entradas', value: 'ENTRADA' },
  { label: 'Salidas', value: 'SALIDA' },
  { label: 'Transferencias', value: 'TRANSFERENCIA' },
]
const opcionesModo = [
  { label: 'Todos', value: null },
  { label: 'Unitario', value: 'UNITARIO' },
  { label: 'Masivo', value: 'MASIVO' },
]

const movimientosFiltrados = computed(() => {
  let rows = props.movimientos
  if (filtroTipo.value) rows = rows.filter((item) => item.tipo === filtroTipo.value)
  if (filtroModo.value) rows = rows.filter((item) => item.modo === filtroModo.value)
  if (!busqueda.value) return rows
  const q = busqueda.value.toLowerCase()
  return rows.filter(
    (item) =>
      String(item.referencia || '')
        .toLowerCase()
        .includes(q) ||
      String(item.notas || '')
        .toLowerCase()
        .includes(q),
  )
})

// ── Columnas ─────────────────────────────────────────────────────────────────
const columnas: QTableColumn[] = [
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  { name: 'modo', label: 'Modo', field: 'modo', align: 'center', sortable: true },
  { name: 'notas', label: 'Nota', field: 'notas', align: 'left', sortable: true },
  {
    name: 'fechaRegistro',
    label: 'Fecha registro',
    field: 'fechaRegistro',
    align: 'left',
    sortable: true,
  },
  { name: 'referencia', label: 'Referencia', field: 'referencia', align: 'left' },
  { name: 'sucursales', label: 'Sucursales', field: 'sucursales', align: 'left' },
  {
    name: 'cantidadTotal',
    label: 'Cantidad',
    field: 'cantidadTotal',
    align: 'center',
    sortable: true,
  },
  { name: 'acciones', label: 'Acciones', field: 'id', align: 'center' },
]

// ── Helpers de formato ────────────────────────────────────────────────────────
function labelTipo(tipo: TipoMovimiento): string {
  return TIPO_MOVIMIENTO_LABELS[tipo] ?? tipo
}

function colorTipo(tipo: TipoMovimiento): string {
  const map: Record<TipoMovimiento, string> = {
    ENTRADA: 'positive',
    SALIDA: 'negative',
    TRANSFERENCIA: 'primary',
    AJUSTE: 'warning',
  }
  return map[tipo] ?? 'grey'
}

/*function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}*/

// ── Expand / detalle ──────────────────────────────────────────────────────────
async function toggleExpand(row: MovimientoCabecera): Promise<void> {
  if (expandedRows.has(row.id)) {
    expandedRows.delete(row.id)
    return
  }
  expandedRows.add(row.id)
  await cargarDetalle(row)
}

async function cargarDetalle(row: MovimientoCabecera): Promise<void> {
  if (loadingDetalle.has(row.id)) return
  loadingDetalle.add(row.id)
  try {
    const movimiento = await inventarioService.getMovimientoById(row.id)
    detallesPorCabecera[row.id] = movimiento.items ?? []
  } catch (e) {
    notifyError((e as Error).message)
    expandedRows.delete(row.id)
  } finally {
    loadingDetalle.delete(row.id)
  }
}

async function recargarDetalle(row: MovimientoCabecera): Promise<void> {
  loadingDetalle.add(row.id)
  try {
    const movimiento = await inventarioService.getMovimientoById(row.id)
    detallesPorCabecera[row.id] = movimiento.items ?? []
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    loadingDetalle.delete(row.id)
  }
}

// ── Callbacks del componente hijo ─────────────────────────────────────────────
function onDetalleSaved(cabeceraId: string, idx: number, updated: MovimientoDetalleItem): void {
  const lista = detallesPorCabecera[cabeceraId]
  if (!lista) return
  lista.splice(idx, 1, updated)
  // Actualizar el totalLineas en el movimiento padre localmente
  const movimiento = props.movimientos.find((m) => m.id === cabeceraId)
  if (movimiento) {
    movimiento.cantidadTotal = lista.reduce((sum, i) => sum + (Number(i.cantidad) || 0), 0)
  }
}

function onDetalleDeleted(cabeceraId: string, detalleId: string): void {
  const lista = detallesPorCabecera[cabeceraId]
  if (!lista) return
  deletedIds.add(detalleId)
  const idx = lista.findIndex((i) => i.id === detalleId)
  if (idx !== -1) lista.splice(idx, 1)
  // Actualizar totales en el movimiento padre
  const movimiento = props.movimientos.find((m) => m.id === cabeceraId)
  if (movimiento) {
    movimiento.cantidadTotal = lista.reduce((sum, i) => sum + (Number(i.cantidad) || 0), 0)
    movimiento.totalLineas = lista.length
  }
}
</script>

<style scoped lang="scss">
.detalle-expand-row > td {
  padding: 0 !important;
  border-bottom: 2px solid rgba(25, 118, 210, 0.18);
}

.detalle-panel {
  background: rgba(25, 118, 210, 0.03);
  border-left: 3px solid var(--q-primary, #1976d2);
}

.detalle-table {
  font-size: inherit;
  /*border-collapse: collapse;*/
}

.detalle-header th {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 6px 8px !important;

  /*background: rgba(0, 0, 0, 0.04);
  border-bottom: 1px solid rgba(0, 0, 0, 0.5);
  font-weight: 600;
  color: #555;
  white-space: nowrap;*/
}

.detalle-table :deep(td) {
  /*border-bottom: 1px solid rgba(0, 0, 0, 0.05);*/
  /*vertical-align: middle;*/
  padding: 3px 6px;
}
</style>
