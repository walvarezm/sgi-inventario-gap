<template>
  <q-card class="sgi-card" flat>
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-subtitle1 text-weight-bold">Reporte de Stock</div>
      <q-space />
      <q-btn
        outline color="positive" icon="table_chart" label="Exportar CSV"
        size="sm" @click="exportarCSV"
      />
    </q-card-section>

    <!-- Filtro rápido -->
    <q-card-section class="q-pt-none q-pb-sm row q-col-gutter-sm items-center">
      <div class="col-12 col-sm-4">
        <q-input v-model="busqueda" placeholder="Filtrar por producto…" outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-auto">
        <q-chip
          v-model:selected="soloStockBajo"
          clickable outline color="warning" icon="warning"
          label="Solo stock bajo" size="sm"
        />
      </div>
      <q-space />
      <div class="text-caption text-muted">
        {{ stockFiltrado.length }} ítems ·
        Valor venta: <strong class="text-positive">{{ formatCurrency(totalValorVenta) }}</strong>
      </div>
    </q-card-section>

    <q-table
      :rows="stockFiltrado"
      :columns="columnas"
      :loading="loading"
      row-key="productoId"
      flat class="sgi-table"
      :pagination="{ rowsPerPage: 20 }"
      no-data-label="Sin datos de stock"
    >
      <!-- Stock con indicador -->
      <template #body-cell-stockActual="{ row }">
        <q-td class="text-center">
          <q-chip
            dense size="sm"
            :color="row.stockActual === 0 ? 'grey-3' : row.stockBajo ? 'orange-2' : 'green-2'"
            :text-color="row.stockActual === 0 ? 'grey-6' : row.stockBajo ? 'orange-9' : 'green-9'"
            :icon="row.stockActual === 0 ? 'remove_circle_outline' : row.stockBajo ? 'warning' : 'check_circle'"
          >
            {{ row.stockActual }} {{ row.unidad }}
          </q-chip>
        </q-td>
      </template>

      <!-- Valor venta -->
      <template #body-cell-valorVenta="{ value }">
        <q-td class="text-right text-weight-bold text-positive">
          {{ formatCurrency(value) }}
        </q-td>
      </template>

      <!-- Valor costo -->
      <template #body-cell-valorCosto="{ value }">
        <q-td class="text-right text-muted">{{ formatCurrency(value) }}</q-td>
      </template>

      <template #no-data="{ message }">
        <div class="full-width column flex-center q-pa-xl text-muted">
          <q-icon name="warehouse" size="48px" style="opacity:0.3" class="q-mb-md" />
          <span>{{ message }}</span>
        </div>
      </template>
    </q-table>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QTableColumn } from 'quasar'
import type { ReporteStockItem } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'

interface Props {
  stock: ReporteStockItem[]
  loading?: boolean
  nombreSucursal?: string
}
const props = withDefaults(defineProps<Props>(), { loading: false, nombreSucursal: 'Sucursal' })

const busqueda = ref('')
const soloStockBajo = ref(false)

const stockFiltrado = computed(() => {
  let lista = props.stock
  if (soloStockBajo.value) lista = lista.filter((s) => s.stockBajo)
  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase()
    lista = lista.filter(
      (s) =>
        s.sku.toLowerCase().includes(q) ||
        s.nombre.toLowerCase().includes(q) ||
        s.marca.toLowerCase().includes(q) ||
        s.categoria.toLowerCase().includes(q),
    )
  }
  return lista
})

const totalValorVenta = computed(() =>
  stockFiltrado.value.reduce((sum, s) => sum + s.valorVenta, 0),
)

const columnas: QTableColumn[] = [
  { name: 'sku',          label: 'SKU',        field: 'sku',          align: 'left',  sortable: true },
  { name: 'nombre',       label: 'Producto',   field: 'nombre',       align: 'left',  sortable: true },
  { name: 'marca',        label: 'Marca',      field: 'marca',        align: 'left',  sortable: true },
  { name: 'categoria',    label: 'Categoría',  field: 'categoria',    align: 'left' },
  { name: 'stockActual',  label: 'Stock',      field: 'stockActual',  align: 'center', sortable: true },
  { name: 'stockMinimo',  label: 'Mínimo',     field: 'stockMinimo',  align: 'center' },
  { name: 'valorCosto',   label: 'Val. Costo', field: 'valorCosto',   align: 'right', sortable: true },
  { name: 'valorVenta',   label: 'Val. Venta', field: 'valorVenta',   align: 'right', sortable: true },
]

function exportarCSV(): void {
  const encabezados = ['SKU', 'Producto', 'Marca', 'Categoria', 'Stock', 'Minimo', 'Stock_Bajo', 'Valor_Costo', 'Valor_Venta']
  const filas = stockFiltrado.value.map((s) => [
    s.sku, `"${s.nombre}"`, s.marca, s.categoria,
    s.stockActual, s.stockMinimo, s.stockBajo ? 'SI' : 'NO',
    s.valorCosto.toFixed(2), s.valorVenta.toFixed(2),
  ])
  const csv = [encabezados, ...filas].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `stock_${props.nombreSucursal.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>
