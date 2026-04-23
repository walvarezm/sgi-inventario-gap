<template>
  <q-card class="sgi-card" flat>
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-subtitle1 text-weight-bold">Historial de Movimientos</div>
      <q-space />
      <!-- Filtros inline -->
      <q-select
        v-model="filtroTipo" :options="opcionesTipo" label="Tipo"
        outlined dense emit-value map-options clearable style="min-width:140px"
        class="q-mr-sm"
      />
      <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="emit('refresh')">
        <q-tooltip>Recargar</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-table
      :rows="movimientosFiltrados" :columns="columnas" :loading="loading"
      row-key="id" flat class="sgi-table"
      :pagination="{ rowsPerPage: 15 }"
      no-data-label="Sin movimientos registrados"
    >
      <!-- Tipo badge -->
      <template #body-cell-tipo="{ value }">
        <q-td>
          <q-chip dense size="sm"
            :color="colorTipo(value)" text-color="white"
            :icon="iconoTipo(value)" :label="labelTipo(value)"
          />
        </q-td>
      </template>

      <!-- Producto -->
      <template #body-cell-productoNombre="{ row }">
        <q-td>
          <div class="text-weight-medium">{{ row.productoNombre }}</div>
          <div class="text-caption text-muted">{{ row.productoSku }}</div>
        </q-td>
      </template>

      <!-- Cantidad -->
      <template #body-cell-cantidad="{ row }">
        <q-td class="text-right">
          <span :class="row.tipo === 'ENTRADA' ? 'text-positive text-weight-bold' : row.tipo === 'SALIDA' ? 'text-negative text-weight-bold' : 'text-primary text-weight-bold'">
            {{ row.tipo === 'ENTRADA' ? '+' : row.tipo === 'SALIDA' ? '-' : '↔' }}{{ row.cantidad }}
          </span>
        </q-td>
      </template>

      <!-- Fecha -->
      <template #body-cell-fecha="{ value }">
        <q-td>
          <div>{{ formatDate(value) }}</div>
          <div class="text-caption text-muted">{{ formatTime(value) }}</div>
        </q-td>
      </template>

      <template #no-data="{ message }">
        <div class="full-width column flex-center q-pa-xl text-muted">
          <q-icon name="history" size="48px" style="opacity:0.3" class="q-mb-md" />
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

interface Props {
  movimientos: Movimiento[]
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ refresh: [] }>()

const filtroTipo = ref<TipoMovimiento | null>(null)

const opcionesTipo = [
  { label: 'Todos', value: null },
  { label: 'Entradas', value: 'ENTRADA' },
  { label: 'Salidas', value: 'SALIDA' },
  { label: 'Transferencias', value: 'TRANSFERENCIA' },
  { label: 'Ajustes', value: 'AJUSTE' },
]

const movimientosFiltrados = computed(() =>
  filtroTipo.value
    ? props.movimientos.filter((m) => m.tipo === filtroTipo.value)
    : props.movimientos,
)

const columnas: QTableColumn[] = [
  { name: 'tipo',           label: 'Tipo',       field: 'tipo',          align: 'left',  sortable: true },
  { name: 'productoNombre', label: 'Producto',   field: 'productoNombre',align: 'left',  sortable: true },
  { name: 'cantidad',       label: 'Cantidad',   field: 'cantidad',      align: 'right', sortable: true },
  { name: 'referencia',     label: 'Referencia', field: 'referencia',    align: 'left' },
  { name: 'fecha',          label: 'Fecha',      field: 'fecha',         align: 'left',  sortable: true },
  { name: 'notas',          label: 'Notas',      field: 'notas',         align: 'left' },
]

function colorTipo(tipo: TipoMovimiento): string {
  const map: Record<TipoMovimiento, string> = {
    ENTRADA: 'positive', SALIDA: 'negative', TRANSFERENCIA: 'primary', AJUSTE: 'warning',
  }
  return map[tipo] ?? 'grey'
}
function iconoTipo(tipo: TipoMovimiento): string {
  const map: Record<TipoMovimiento, string> = {
    ENTRADA: 'add_circle', SALIDA: 'remove_circle', TRANSFERENCIA: 'swap_horiz', AJUSTE: 'tune',
  }
  return map[tipo] ?? 'circle'
}
function labelTipo(tipo: TipoMovimiento): string {
  return TIPO_MOVIMIENTO_LABELS[tipo] ?? tipo
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}
function formatTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
</script>
