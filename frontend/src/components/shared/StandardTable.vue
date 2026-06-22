<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'
import type { QTableColumn } from 'quasar'
import { STANDARD_ROWS_PER_PAGE, STANDARD_ROWS_PER_PAGE_OPTIONS } from './table-constants'

interface Props {
  rows: T[]
  columns: QTableColumn<T>[]
  loading?: boolean
  rowKey?: keyof T | string
  /** Etiqueta del "no data" */
  noDataLabel?: string
  /** Icono para el empty state */
  emptyIcon?: string
  /** Mostrar el selector de filas por página */
  showRowsPerPage?: boolean
  /** Override de las opciones de paginación (debe incluir el default) */
  rowsPerPageOptions?: number[]
  /** Override del default de filas por página */
  rowsPerPage?: number
  /** Mensaje cuando el usuario está cargando datos */
  loadingLabel?: string
  /** Dense mode (tabla más compacta) */
  dense?: boolean
  /** CSS class extra para el table */
  tableClass?: string
  /** Mostrar grid lines */
  grid?: boolean
  /** Wrap cells (para responsive en columnas largas) */
  wrapCells?: boolean
  /** Selección múltiple */
  selection?: 'multiple' | 'single' | 'none'
  selected?: T[]
  /** Titulo de la tabla (opcional) */
  title?: string
  /** Mostrar header con contador */
  showHeader?: boolean
  /** Custom empty state slot replacement */
  hideDefaultEmpty?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
  noDataLabel: 'No se encontraron registros',
  emptyIcon: 'inbox',
  showRowsPerPage: true,
  rowsPerPageOptions: () => STANDARD_ROWS_PER_PAGE_OPTIONS,
  rowsPerPage: STANDARD_ROWS_PER_PAGE,
  loadingLabel: 'Cargando…',
  dense: false,
  tableClass: '',
  grid: false,
  wrapCells: true,
  selection: 'none',
  selected: () => [],
  title: '',
  showHeader: false,
  hideDefaultEmpty: false,
})

const emit = defineEmits<{
  'update:selected': [rows: T[]]
  'row-click': [evt: Event, row: T]
}>()

const pagination = computed(() => ({
  rowsPerPage: props.rowsPerPage,
  rowsPerPageOptions: props.rowsPerPageOptions,
  sortBy: undefined as string | undefined,
  descending: false,
  page: 1,
}))

const isEmpty = computed(() => !props.loading && props.rows.length === 0)
</script>

<template>
  <q-table
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :row-key="rowKey as string"
    :pagination="pagination"
    :no-data-label="noDataLabel"
    :rows-per-page-label="'Filas por página'"
    :loading-label="loadingLabel"
    :dense="dense"
    :grid="grid"
    :wrap-cells="wrapCells"
    :selection="selection === 'none' ? undefined : selection"
    :selected="selected"
    flat
    :class="['std-table', 'sgi-table', tableClass]"
    @update:selected="(rows) => emit('update:selected', rows as T[])"
    @row-click="(evt, row) => emit('row-click', evt, row as T)"
  >
    <template v-if="showHeader || title || $slots.top" #top>
      <div v-if="showHeader || title" class="std-table__header">
        <span class="std-table__title">{{ title }}</span>
        <span v-if="rows.length" class="std-table__count">
          <strong>{{ rows.length }}</strong> registros
        </span>
        <q-space />
        <slot name="top" />
      </div>
      <slot v-else name="top" />
    </template>

    <template v-if="!hideDefaultEmpty && isEmpty" #no-data="{ message }">
      <div class="std-table__empty">
        <div class="std-table__empty-art">
          <q-icon :name="emptyIcon" size="40px" />
        </div>
        <h4 class="std-table__empty-title">{{ message || noDataLabel }}</h4>
        <p class="std-table__empty-text">
          Ajusta los filtros o intenta con otros términos de búsqueda.
        </p>
      </div>
    </template>

    <template #loading>
      <q-inner-loading showing color="primary" />
    </template>

<!--    <template #bottom>
      <div class="std-table__footer">
        <q-pagination
          :model-value="pagination.page"
          :max="Math.ceil(rows.length / rowsPerPage) || 1"
          :max-pages="5"
          :direction-links="true"
          :boundary-links="true"
          boundary-numbers
          size="sm"
          color="primary"
          active-design="flat"
          active-text-color="white"
          :dense="dense"
          @update:model-value="(p) => (pagination.page = p)"
        />
        <q-space />
        <span class="std-table__footer-info">
          {{ rowsPerPage }} por página · <strong>{{ rows.length }}</strong> resultados
        </span>
      </div>
    </template>-->

    <!-- Pases para celdas personalizadas -->
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </q-table>
</template>

<style scoped lang="scss">
.std-table {
  background: var(--sgi-surface);
  border-radius: var(--sgi-radius-lg);
  overflow: hidden;
  border: 1px solid var(--sgi-border);
}

.std-table :deep(.q-table__top) {
  padding: 12px 16px;
  background: var(--sgi-surface-soft);
}

.std-table :deep(.q-table__bottom) {
  padding: 10px 16px;
  background: var(--sgi-surface-soft);
  border-top: 1px solid var(--sgi-border);
}

.std-table :deep(.q-table__bottom-item) {
  width: 100%;
}

.std-table__header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.std-table__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--sgi-text);
  letter-spacing: -0.01em;
}

.std-table__count {
  font-size: 0.78rem;
  color: var(--sgi-text-muted);
}

.std-table__count strong {
  color: var(--sgi-text);
  font-variant-numeric: tabular-nums;
}

// ── Empty state ──────────────────────────────────────────────
.std-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 24px;
  gap: 8px;
}

.std-table__empty-art {
  display: grid;
  place-items: center;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--sgi-primary) 10%, transparent);
  color: var(--sgi-primary);
  margin-bottom: 6px;
}

.std-table__empty-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--sgi-text);
}

.std-table__empty-text {
  margin: 0;
  color: var(--sgi-text-muted);
  font-size: 0.88rem;
  max-width: 360px;
}

// ── Footer (pagination) ──────────────────────────────────────
.std-table__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}

.std-table__footer-info {
  font-size: 0.78rem;
  color: var(--sgi-text-muted);
  white-space: nowrap;
}

.std-table__footer-info strong {
  color: var(--sgi-text);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

@media (max-width: 600px) {
  .std-table :deep(.q-table__middle) {
    max-height: none;
  }
}
</style>
