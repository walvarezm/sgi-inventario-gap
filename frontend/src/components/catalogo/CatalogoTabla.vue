<script setup lang="ts">
import type { QTableColumn } from 'quasar'
import type { ProductoCatalogo } from 'src/types'
import { computed } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { formatCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'ver-qr': [producto: ProductoCatalogo]
  editar: [producto: ProductoCatalogo]
}>()

const authStore = useAuthStore()
const canEdit = computed(() => authStore.can('productos.editar'))
const canViewPurchasePrice = computed(() => authStore.can('productos.editar'))
const paginacion = { rowsPerPage: 10 }

const columnas = computed<QTableColumn[]>(() => {
  const cols: QTableColumn[] = [
    { name: 'imagenUrl', label: '', field: 'imagenUrl', align: 'center', style: 'width:60px' },
    { name: 'sku', label: 'Código', field: 'sku', align: 'left', sortable: true },
    { name: 'marca', label: 'Marca', field: 'marca', align: 'left', sortable: true },
    { name: 'nombre', label: 'Producto', field: 'nombre', align: 'left', sortable: true },
  ]

  if (canViewPurchasePrice.value) {
    cols.push({
      name: 'precioCompra',
      label: 'Precio Compra',
      field: 'precioCompra',
      align: 'right',
      sortable: true,
    })
  }

  cols.push({
    name: 'precioOfrecido',
    label: 'Precio Lista',
    field: 'precioOfrecido',
    align: 'right',
    sortable: true,
  })
  cols.push({
    name: 'precioFinal',
    label: 'Precio Venta',
    field: 'precioFinal',
    align: 'right',
    sortable: true,
  })
  cols.push({ name: 'stock', label: 'Stock', field: 'stock', align: 'center', sortable: true })

  if (canEdit.value) {
    cols.push({ name: 'acciones', label: 'Acciones', field: 'id', align: 'right' })
  }

  return cols
})
</script>

<template>
  <q-table
    :rows="productos"
    :columns="columnas"
    :loading="loading"
    row-key="id"
    flat
    dense
    class="sgi-table catalogo-tabla"
    :pagination="paginacion"
    wrap-cells
    no-data-label="No hay productos en el catálogo"
  >
    <!-- Imagen thumbnail -->
    <template #body-cell-imagenUrl="{ row }">
      <q-td>
        <!--        <q-avatar size="40px" square rounded>-->
        <!--          <img v-if="value" :src="value" loading="lazy" />-->
        <ProductoImagenIFrame
          v-if="true"
          :imagen-url="row.imagenUrl"
          :imagen-location="row.imagenLocation"
          :width="30"
          :height="30"
        />
        <q-icon v-else name="image" color="grey-4" size="40px" />
        <!--        </q-avatar>-->
      </q-td>
    </template>

    <!-- SKU + QR icon -->
    <template #body-cell-sku="{ row }">
      <q-td>
        <div class="row items-center no-wrap q-gutter-xs">
          <span class="text-weight-bold text-mono text-body2">{{ row.sku }}</span>
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="qr_code"
            color="primary"
            @click="emit('ver-qr', row)"
          >
            <q-tooltip>Ver código QR</q-tooltip>
          </q-btn>
        </div>
      </q-td>
    </template>

    <!-- Marca + Nombre -->
    <template #body-cell-marca="{ row }">
      <q-td>
        <div class="text-caption text-muted">{{ row.marca }}</div>
      </q-td>
    </template>
    <template #body-cell-nombre="{ row }">
      <q-td>
        <div class="text-weight-medium product-name-with-ellipsis">
          {{ row.nombre }}
        </div>
        <!--        <div class="text-caption text-muted">{{ row.marca }}</div>-->
        <!--        <div
          v-if="row.descripcion"
          class="text-caption text-muted ellipsis"
          style="max-width: 240px"
        >
          {{ row.descripcion }}
        </div>-->
      </q-td>
    </template>

    <!-- Precio Compra -->
    <template #body-cell-precioCompra="{ value }">
      <q-td class="text-right">
        <span class="text-body2 text-weight-medium">
          {{ formatCurrency(Number(value) || 0) }}
        </span>
      </q-td>
    </template>

    <!-- Precio ofrecido (tachado) -->
    <template #body-cell-precioOfrecido="{ value }">
      <q-td class="text-right">
        <span class="text-muted" style="text-decoration: line-through; font-size: 1em">
          {{ formatCurrency(value) }}
        </span>
      </q-td>
    </template>

    <!-- Precio final -->
    <template #body-cell-precioFinal="{ value }">
      <q-td class="text-right">
        <span class="text-body1 text-weight-bold text-positive">{{ formatCurrency(value) }}</span>
      </q-td>
    </template>

    <!-- Stock con indicador visual -->
    <template #body-cell-stock="{ row }">
      <q-td class="text-center">
        <q-chip
          dense
          :color="row.stock === 0 ? 'grey-4' : row.stockBajo ? 'orange-2' : 'green-2'"
          :text-color="row.stock === 0 ? 'grey-7' : row.stockBajo ? 'orange-9' : 'green-9'"
          :icon="
            row.stock === 0 ? 'remove_circle_outline' : row.stockBajo ? 'warning' : 'check_circle'
          "
        >
          {{ row.stock }}
        </q-chip>
      </q-td>
    </template>

    <template v-if="canEdit" #body-cell-acciones="{ row }">
      <q-td class="text-center">
        <q-btn flat round dense size="sm" icon="edit" color="primary" @click="emit('editar', row)">
          <q-tooltip>Editar producto</q-tooltip>
        </q-btn>
      </q-td>
    </template>

    <!-- Sin datos -->
    <template #no-data="{ message }">
      <div class="full-width column flex-center q-pa-xl text-muted">
        <q-icon name="menu_book" size="48px" style="opacity: 0.3" class="q-mb-md" />
        <span>{{ message }}</span>
      </div>
    </template>
  </q-table>
</template>

<style scoped lang="scss">
.text-mono {
  font-family: monospace;
  letter-spacing: 0.04em;
}
.catalogo-tabla :deep(tbody tr:hover) {
  background: color-mix(in srgb, var(--sgi-primary) 8%, transparent);
}

.catalogo-tabla :deep(.q-table__middle) {
  max-height: calc(100vh - 310px);
}

.catalogo-tabla :deep(thead tr th) {
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>
