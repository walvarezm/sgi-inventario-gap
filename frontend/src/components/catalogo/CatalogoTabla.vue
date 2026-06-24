<script setup lang="ts">
import type { QTableColumn } from 'quasar'
import type { ProductoCatalogo } from 'src/types'
import { computed } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { formatCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
  /** Mostrar la columna "Sucursal" — usar cuando la vista cruza varias sucursales. */
  showSucursalColumn?: boolean
}
const props = withDefaults(defineProps<Props>(), { loading: false, showSucursalColumn: false })

const emit = defineEmits<{
  'ver-image': [producto: ProductoCatalogo]
  'ver-qr': [producto: ProductoCatalogo]
  editar: [producto: ProductoCatalogo]
}>()

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const canEdit = computed(() => authStore.can('productos.editar'))
const canViewPurchasePrice = computed(() => authStore.can('productos.editar'))
const paginacion = { rowsPerPage: 5, rowsPerPageOptions: [5, 10, 20, 30, 50] }

function getNombreSucursal(id: string): string {
  return sucursalStore.getById(id)?.nombre ?? id
}

const columnas = computed<QTableColumn[]>(() => {
  const cols: QTableColumn[] = [
    { name: 'imagenUrl', label: '', field: 'imagenUrl', align: 'center' },
    { name: 'marca', label: 'Marca', field: 'marca', align: 'left', sortable: true },
    { name: 'sku', label: 'Código', field: 'sku', align: 'left', sortable: true },
    { name: 'nombre', label: 'Producto', field: 'nombre', align: 'left', sortable: true },
    {
      name: 'precioUsaBase',
      label: 'Origen',
      field: 'precioUsaBase',
      align: 'center',
      sortable: true,
    },
  ]

  if (props.showSucursalColumn) {
    cols.push({
      name: 'sucursalId',
      label: 'Sucursal',
      field: 'sucursalId',
      align: 'left',
      sortable: true,
    })
  }

  if (canViewPurchasePrice.value) {
    cols.push({
      name: 'precioCompra',
      label: 'Compra',
      field: 'precioCompra',
      align: 'right',
      sortable: true,
    })
  }

  cols.push({
    name: 'precioOfrecido',
    label: 'Lista',
    field: 'precioOfrecido',
    align: 'right',
    sortable: true,
  })
  cols.push({
    name: 'precioFinal',
    label: 'Venta',
    field: 'precioFinal',
    align: 'right',
    sortable: true,
  })
  cols.push({ name: 'stock', label: 'Stock', field: 'stock', align: 'center', sortable: true })

  cols.push({ name: 'acciones', label: '', field: 'id', align: 'right' })

  return cols
})

function stockTone(stock: number, bajo: boolean): 'positive' | 'warning' | 'negative' {
  if (stock === 0) return 'negative'
  if (bajo) return 'warning'
  return 'positive'
}

function stockLabel(stock: number, bajo: boolean): string {
  if (stock === 0) return 'Agotado'
  if (bajo) return 'Bajo'
  return 'OK'
}
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
    rows-per-page-label="Registros por página"
  >
    <!-- Image thumbnail -->
    <template #body-cell-imagenUrl="{ row }">
      <q-td auto-width>
        <div
          class="catalogo-tabla__thumb"
          :class="{ 'catalogo-tabla__thumb--clickable': !!row.imagenUrl }"
          @click="row.imagenUrl && emit('ver-image', row)"
        >
          <ProductoImagenIFrame
            :imagen-url="row.imagenUrl"
            :imagen-location="row.imagenLocation"
            :width="48"
            :height="48"
            type="table"
          />
        </div>
      </q-td>
    </template>

    <!-- Brand -->
    <template #body-cell-marca="{ row }">
      <q-td>
        <span class="catalogo-tabla__marca">{{ row.marca }}</span>
      </q-td>
    </template>

    <!-- SKU -->
    <template #body-cell-sku="{ row }">
      <q-td>
        <span class="catalogo-tabla__sku">{{ row.sku }}</span>
      </q-td>
    </template>

    <!-- Product name + description -->
    <template #body-cell-nombre="{ row }">
      <q-td>
        <div class="catalogo-tabla__nombre">{{ row.nombre }}</div>
        <q-tooltip v-if="row.nombre.length > 35">{{ row.nombre }}</q-tooltip>
        <div
          v-if="row.descripcion && row.nombre.trim() !== row.descripcion.trim()"
          class="catalogo-tabla__descripcion"
        >
          {{ row.descripcion }}
        </div>
      </q-td>
    </template>

    <!-- Origin -->
    <template #body-cell-precioUsaBase="{ row }">
      <q-td auto-width>
        <span
          class="catalogo-tabla__origin-tag"
          :class="
            row.precioUsaBase
              ? 'catalogo-tabla__origin-tag--base'
              : 'catalogo-tabla__origin-tag--inv'
          "
        >
          {{ row.precioUsaBase ? 'Producto' : 'Inventario' }}
        </span>
      </q-td>
    </template>

    <!-- Sucursal (cuando se cruzan varias sucursales) -->
    <template #body-cell-sucursalId="{ row }">
      <q-td>
        <span class="catalogo-tabla__sucursal-tag">
          <q-icon name="store" size="14px" />
          {{ getNombreSucursal(row.sucursalId) }}
        </span>
      </q-td>
    </template>

    <!-- Purchase price -->
    <template #body-cell-precioCompra="{ value }">
      <q-td class="text-right">
        <span class="catalogo-tabla__price">
          {{ formatCurrency(Number(value) || 0) }}
        </span>
      </q-td>
    </template>

    <!-- List price (struck-through when discount) -->
    <template #body-cell-precioOfrecido="{ value, row }">
      <q-td class="text-right">
        <span
          v-if="Number(value) > Number(row.precioFinal)"
          class="catalogo-tabla__price catalogo-tabla__price--list"
        >
          <s>{{ formatCurrency(value) }}</s>
        </span>
        <span v-else class="catalogo-tabla__price">
          {{ formatCurrency(value) }}
        </span>
      </q-td>
    </template>

    <!-- Final price -->
    <template #body-cell-precioFinal="{ value }">
      <q-td class="text-right">
        <span class="catalogo-tabla__price catalogo-tabla__price--final">
          {{ formatCurrency(value) }}
        </span>
      </q-td>
    </template>

    <!-- Stock with tone -->
    <template #body-cell-stock="{ row }">
      <q-td class="text-center">
        <div
          class="catalogo-tabla__stock"
          :class="`catalogo-tabla__stock--${stockTone(row.stock, row.stockBajo)}`"
        >
          <span class="catalogo-tabla__stock-value">{{ row.stock }}</span>
          <span class="catalogo-tabla__stock-label">
            {{ stockLabel(row.stock, row.stockBajo) }}
          </span>
        </div>
      </q-td>
    </template>

    <!-- Actions -->
    <template #body-cell-acciones="{ row }">
      <q-td auto-width>
        <div class="catalogo-tabla__actions">
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="qr_code_2"
            color="primary"
            @click="emit('ver-qr', row)"
          >
            <q-tooltip>Ver QR</q-tooltip>
          </q-btn>
          <q-btn
            v-if="canEdit"
            flat
            round
            dense
            size="sm"
            icon="edit"
            color="primary"
            @click="emit('editar', row)"
          >
            <q-tooltip>Editar producto</q-tooltip>
          </q-btn>
        </div>
      </q-td>
    </template>

    <!-- Empty state -->
    <template #no-data="{ message }">
      <div class="full-width column flex-center q-pa-xl text-muted">
        <div class="catalogo-empty-inline">
          <q-icon name="menu_book" size="48px" />
        </div>
        <span class="text-body1">{{ message }}</span>
      </div>
    </template>
  </q-table>
</template>

<style scoped lang="scss">
.catalogo-tabla {
  :deep(.q-table__middle) {
    max-height: calc(100vh - 320px);
  }

  :deep(thead tr th) {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--sgi-header-table);
  }

  :deep(tbody tr) {
    transition: background 150ms ease;
  }

  :deep(tbody tr:hover) {
    background: color-mix(in srgb, var(--sgi-primary) 5%, transparent);
  }

  :deep(tbody td) {
    vertical-align: middle;
    padding: 5px 12px;
    /*padding: 10px 12px;*/
  }
}

.catalogo-tabla__thumb {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--sgi-surface-alt);
  border: 1px solid var(--sgi-border);
  flex-shrink: 0;
  cursor: not-allowed;
}

.catalogo-tabla__thumb--clickable {
  cursor: zoom-in;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.catalogo-tabla__thumb--clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(15, 23, 40, 0.18);
}

.catalogo-tabla__marca {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sgi-warning);
}

.catalogo-tabla__sku {
  /*font-family: 'JetBrains Mono', ui-monospace, monospace;*/
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--sgi-primary);
  background: color-mix(in srgb, var(--sgi-primary) 15%, transparent);
  padding: 4px 8px;
  border-radius: 4px;
}

.catalogo-tabla__nombre {
  font-weight: 600;
  color: var(--sgi-text);
  line-height: 1.3;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalogo-tabla__descripcion {
  font-size: 0.75rem;
  color: var(--sgi-text-muted);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
  margin-top: 2px;
}

.catalogo-tabla__origin-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.catalogo-tabla__origin-tag--base {
  color: var(--sgi-primary);
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
}

.catalogo-tabla__origin-tag--inv {
  color: var(--sgi-info);
  background: color-mix(in srgb, var(--sgi-info) 14%, transparent);
}

.catalogo-tabla__sucursal-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sgi-text);
  padding: 3px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--sgi-primary) 8%, transparent);
  color: var(--sgi-primary);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.catalogo-tabla__price {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--sgi-text);
}

.catalogo-tabla__price--list {
  color: var(--sgi-text-muted);
  font-weight: 500;
}

.catalogo-tabla__price--final {
  color: var(--sgi-positive);
  font-weight: 800;
  font-size: 0.92rem;
}

.catalogo-tabla__stock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.78rem;
  font-weight: 700;
}

.catalogo-tabla__stock--positive {
  background: color-mix(in srgb, var(--sgi-positive) 14%, transparent);
  color: var(--sgi-positive);
  border-color: color-mix(in srgb, var(--sgi-positive) 30%, transparent);
}

.catalogo-tabla__stock--warning {
  background: color-mix(in srgb, var(--sgi-warning) 16%, transparent);
  color: var(--sgi-warning);
  border-color: color-mix(in srgb, var(--sgi-warning) 35%, transparent);
}

.catalogo-tabla__stock--negative {
  background: color-mix(in srgb, var(--sgi-negative) 14%, transparent);
  color: var(--sgi-negative);
  border-color: color-mix(in srgb, var(--sgi-negative) 30%, transparent);
}

.catalogo-tabla__stock-value {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 0.92rem;
}

.catalogo-tabla__stock-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.8;
}

.catalogo-tabla__actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.catalogo-empty-inline {
  width: 80px;
  height: 80px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: color-mix(in srgb, var(--sgi-primary) 8%, transparent);
  color: var(--sgi-primary);
  margin-bottom: 12px;
}

@media (max-width: 600px) {
  .catalogo-tabla :deep(.q-table__middle) {
    max-height: calc(100vh - 360px);
  }

  .catalogo-tabla :deep(.q-table__bottom) {
    padding: 8px 12px;
  }
}
</style>
