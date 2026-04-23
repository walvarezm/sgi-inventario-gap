<template>
  <q-table
    :rows="productos"
    :columns="columnas"
    :loading="loading"
    row-key="id"
    flat
    class="sgi-table catalogo-tabla"
    :pagination="{ rowsPerPage: 25 }"
    no-data-label="No hay productos en el catálogo"
  >
    <!-- Imagen thumbnail -->
    <template #body-cell-imagenUrl="{ value }">
      <q-td>
        <q-avatar size="44px" square rounded>
          <img v-if="value" :src="value" loading="lazy" />
          <q-icon v-else name="image" color="grey-4" size="32px" />
        </q-avatar>
      </q-td>
    </template>

    <!-- SKU + QR icon -->
    <template #body-cell-sku="{ row }">
      <q-td>
        <div class="row items-center no-wrap q-gutter-xs">
          <span class="text-weight-bold text-mono">{{ row.sku }}</span>
          <q-btn flat round dense size="xs" icon="qr_code" color="primary"
            @click="emit('ver-qr', row)">
            <q-tooltip>Ver código QR</q-tooltip>
          </q-btn>
        </div>
      </q-td>
    </template>

    <!-- Marca + Nombre -->
    <template #body-cell-nombre="{ row }">
      <q-td>
        <div class="text-weight-medium">{{ row.nombre }}</div>
        <div class="text-caption text-muted">{{ row.marca }}</div>
        <div v-if="row.descripcion" class="text-caption text-muted ellipsis" style="max-width:240px">
          {{ row.descripcion }}
        </div>
      </q-td>
    </template>

    <!-- Precio ofrecido (tachado) -->
    <template #body-cell-precioOfrecido="{ value }">
      <q-td class="text-right">
        <span class="text-muted" style="text-decoration:line-through; font-size:0.85em">
          {{ formatCurrency(value) }}
        </span>
      </q-td>
    </template>

    <!-- Precio final -->
    <template #body-cell-precioFinal="{ value }">
      <q-td class="text-right">
        <span class="text-h6 text-weight-bold text-positive">{{ formatCurrency(value) }}</span>
      </q-td>
    </template>

    <!-- Stock con indicador visual -->
    <template #body-cell-stock="{ row }">
      <q-td class="text-center">
        <q-chip
          dense
          :color="row.stock === 0 ? 'grey-4' : row.stockBajo ? 'orange-2' : 'green-2'"
          :text-color="row.stock === 0 ? 'grey-7' : row.stockBajo ? 'orange-9' : 'green-9'"
          :icon="row.stock === 0 ? 'remove_circle_outline' : row.stockBajo ? 'warning' : 'check_circle'"
        >
          {{ row.stock }}
        </q-chip>
      </q-td>
    </template>

    <!-- Sin datos -->
    <template #no-data="{ message }">
      <div class="full-width column flex-center q-pa-xl text-muted">
        <q-icon name="menu_book" size="48px" style="opacity:0.3" class="q-mb-md" />
        <span>{{ message }}</span>
      </div>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import type { QTableColumn } from 'quasar'
import type { ProductoCatalogo } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'ver-qr': [producto: ProductoCatalogo]
}>()

const columnas: QTableColumn[] = [
  { name: 'imagenUrl',      label: '',             field: 'imagenUrl',      align: 'center', style: 'width:60px' },
  { name: 'sku',            label: 'Código',        field: 'sku',            align: 'left',  sortable: true },
  { name: 'nombre',         label: 'Producto',      field: 'nombre',         align: 'left',  sortable: true },
  { name: 'precioOfrecido', label: 'Precio Lista',  field: 'precioOfrecido', align: 'right', sortable: true },
  { name: 'precioFinal',    label: 'Precio Venta',  field: 'precioFinal',    align: 'right', sortable: true },
  { name: 'stock',          label: 'Stock',         field: 'stock',          align: 'center', sortable: true },
]
</script>

<style scoped lang="scss">
.text-mono { font-family: monospace; letter-spacing: 0.04em; }
.catalogo-tabla :deep(tbody tr:hover) { background: rgba(21,101,192,0.04); }
</style>
