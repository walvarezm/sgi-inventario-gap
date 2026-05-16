<template>
  <q-card class="sgi-card" flat>
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-subtitle1 text-weight-bold">Historial de Movimientos</div>
      <q-space />
      <!-- Filtros inline -->
      <div class="col-12 col-sm-6 col-md-2">
        <q-input v-model="busqueda" placeholder="Buscar producto…" outlined dense clearable>
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
        class="col-12 col-sm-6 col-md-2 q-mx-sm"
      />
      <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="emit('refresh')">
        <q-tooltip>Recargar</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-table
      :rows="movimientosFiltrados"
      :columns="columnas"
      :loading="loading"
      dense
      row-key="id"
      flat
      class="sgi-table"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="Sin movimientos registrados"
    >
      <!-- Tipo badge -->
      <template #body-cell-tipo="{ value }">
        <q-td>
          <q-chip
            dense
            size="md"
            :color="colorTipo(value)"
            text-color="black"
            :icon="iconoTipo(value)"
            :label="labelTipo(value)"
          />
        </q-td>
      </template>

      <!-- Producto -->
      <template #body-cell-productoNombre="{ row }">
        <q-td>
          <div class="text-weight-medium">{{ truncate(row.productoNombre) }}</div>
          <q-tooltip v-if="row.productoNombre.length > 50">{{ row.productoNombre }}</q-tooltip>
        </q-td>
      </template>

      <template #body-cell-origenDestino="{ row }">
        <q-td>
          <span v-html="colOrigenDestino(row)"></span>
          <!--          <div v-if="row.sucursalOrigen">
            <span class="text-caption text-muted">Origen:</span>
            <span class="text-weight-medium">{{ getNombre(row.sucursalOrigen) }}</span>
          </div>
          <div v-if="row.sucursalDestino">
            <span class="text-caption text-muted">Destino:</span>
            <span class="text-weight-medium">{{ getNombre(row.sucursalDestino) }}</span>
          </div>-->
        </q-td>
      </template>

      <!-- Cantidad -->
      <template #body-cell-cantidad="{ row }">
        <q-td class="text-center">
          <span
            :class="
              row.tipo === 'ENTRADA'
                ? 'text-positive text-weight-bold text-subtitle1'
                : row.tipo === 'SALIDA'
                  ? 'text-negative text-weight-bold text-subtitle1'
                  : 'text-primary text-weight-bold text-subtitle1'
            "
          >
            {{ row.tipo === 'ENTRADA' ? '+' : row.tipo === 'SALIDA' ? '-' : '↔' }}{{ row.cantidad }}
          </span>
        </q-td>
      </template>

      <!-- Fecha -->
      <template #body-cell-fecha="{ value }">
        <q-td>
          <div>
            {{ formatDate(value) }}
            <span class="text-caption text-muted">{{ formatTime(value) }}</span>
          </div>
          <!--          <div class="text-caption text-muted">{{ formatTime(value) }}</div>-->
        </q-td>
      </template>

      <template #no-data="{ message }">
        <div class="full-width column flex-center q-pa-xl text-muted">
          <q-icon name="history" size="48px" style="opacity: 0.3" class="q-mb-md" />
          <span>{{ message }}</span>
        </div>
      </template>
    </q-table>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QTableColumn } from 'quasar'
import type { Movimiento, TipoMovimiento } from 'src/types'
import { TIPO_MOVIMIENTO_LABELS } from 'src/types'
import { useSucursal } from 'src/composables/useSucursal.ts'
import { truncate } from 'src/utils/formatters.ts'

const { getNombre } = useSucursal()

interface Props {
  movimientos: Movimiento[]
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ refresh: [] }>()

const filtroTipo = ref<TipoMovimiento | null>(null)
const busqueda = ref('')

const opcionesTipo = [
  { label: 'Todos', value: null },
  { label: 'Entradas', value: 'ENTRADA' },
  { label: 'Salidas', value: 'SALIDA' },
  { label: 'Transferencias', value: 'TRANSFERENCIA' },
  { label: 'Ajustes', value: 'AJUSTE' },
]

const movimientosFiltrados = computed(() => {
  let movimientos = props.movimientos

  if (filtroTipo.value) movimientos = movimientos.filter((m) => m.tipo === filtroTipo.value)

  if (!busqueda.value) return movimientos
  const q = busqueda.value.toLowerCase()
  movimientos = movimientos.filter(
    (m) =>
      String(m.productoSku ?? '')
        .toLowerCase()
        .includes(q) ||
      String(m.productoNombre ?? '')
        .toLowerCase()
        .includes(q),
  )

  return movimientos
})

const columnas: QTableColumn[] = [
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  { name: 'productoSku', label: 'SKU', field: 'productoSku', align: 'left', sortable: true },
  {
    name: 'productoNombre',
    label: 'Producto',
    field: 'productoNombre',
    align: 'left',
    sortable: true,
  },
  {
    name: 'origenDestino',
    label: 'Movimiento',
    field: 'origenDestino',
    align: 'center',
    sortable: true,
  },
  { name: 'cantidad', label: 'Cantidad', field: 'cantidad', align: 'center', sortable: true },
  { name: 'referencia', label: 'Referencia', field: 'referencia', align: 'left' },
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left', sortable: true },
  { name: 'notas', label: 'Notas', field: 'notas', align: 'left' },
]

function colorTipo(tipo: TipoMovimiento): string {
  const map: Record<TipoMovimiento, string> = {
    ENTRADA: 'positive',
    SALIDA: 'negative',
    TRANSFERENCIA: 'primary',
    AJUSTE: 'warning',
  }
  return map[tipo] ?? 'grey'
}
function iconoTipo(tipo: TipoMovimiento): string {
  const map: Record<TipoMovimiento, string> = {
    ENTRADA: 'add_circle',
    SALIDA: 'remove_circle',
    TRANSFERENCIA: 'swap_horiz',
    AJUSTE: 'tune',
  }
  return map[tipo] ?? 'circle'
}
function labelTipo(tipo: TipoMovimiento): string {
  return TIPO_MOVIMIENTO_LABELS[tipo] ?? tipo
}

function colOrigenDestino(movimiento: Movimiento): string {
  ;'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE'

  const tipo = movimiento.tipo
  const notas = movimiento.notas
  const sucursalOrigen = getNombre(movimiento.sucursalOrigen)
  const sucursalDestino = getNombre(movimiento.sucursalDestino)

  let origen = ''
  let destino = ''

  switch (tipo) {
    case 'ENTRADA':
      origen = notas
      destino = sucursalDestino
      break
    case 'SALIDA':
      origen = sucursalOrigen
      destino = notas
      break
    case 'TRANSFERENCIA':
      origen = sucursalOrigen
      destino = sucursalDestino
      break
    case 'AJUSTE':
      break
  }

  const result = `
    <div>
      <span class="text-caption text-muted">Origen:</span>
      <span class="text-weight-medium">${origen}</span>
    </div>
    <div>
      <span class="text-caption text-muted">Destino:</span>
      <span class="text-weight-medium">${destino}</span>
    </div>
    `
  return result.toString()
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
