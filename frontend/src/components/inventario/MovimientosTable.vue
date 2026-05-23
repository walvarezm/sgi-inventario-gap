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

      <template #body-cell-modo="{ value }">
        <q-td>
          <q-chip dense size="sm" color="primary" text-color="white" :label="value" />
        </q-td>
      </template>

      <template #body-cell-fechaRegistro="{ value }">
        <q-td>
          <div>{{ formatDate(value) }}</div>
          <div class="text-caption text-muted">{{ formatTime(value) }}</div>
        </q-td>
      </template>

      <template #body-cell-referencia="{ row }">
        <q-td>
          <div class="text-weight-medium">{{ row.referencia }}</div>
          <div class="text-caption text-muted">{{ row.referenciaTipo }}</div>
        </q-td>
      </template>

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

      <template #body-cell-cantidadTotal="{ value, row }">
        <q-td class="text-center">
          <div class="text-weight-bold">{{ value }}</div>
          <div class="text-caption text-muted">{{ row.totalLineas }} línea(s)</div>
        </q-td>
      </template>

      <template #body-cell-acciones="{ row }">
        <q-td class="text-center">
          <q-btn
            v-if="canEdit && row.editable"
            flat
            round
            dense
            icon="edit"
            color="primary"
            @click="emit('edit', row.id)"
          >
            <q-tooltip>Editar</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { QTableColumn } from 'quasar'
import type { MovimientoCabecera, ModoMovimiento, TipoMovimiento } from 'src/types'
import { TIPO_MOVIMIENTO_LABELS } from 'src/types'
import { useSucursal } from 'src/composables/useSucursal.ts'
import { useAuthStore } from 'src/stores/authStore'

const { getNombre } = useSucursal()
const authStore = useAuthStore()

const props = withDefaults(
  defineProps<{
    movimientos: MovimientoCabecera[]
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{ refresh: []; edit: [id: string] }>()

const busqueda = ref('')
const filtroTipo = ref<TipoMovimiento | null>(null)
const filtroModo = ref<ModoMovimiento | null>(null)
const canEdit = computed(
  () =>
    authStore.can('inventario.editar_movimientos') ||
    authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)

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

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}
</script>
