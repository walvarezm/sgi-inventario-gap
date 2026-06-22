<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Producto } from 'src/types'
import { useProductoStore } from 'src/stores/productoStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useMarcaStore } from 'src/stores/marcaStore'
import { useNotify } from 'src/composables/useNotify'
import { formatCurrency } from 'src/utils/formatters'
import ProductoForm from 'src/components/productos/ProductoForm.vue'
import ProductoImportDialog from 'src/components/productos/ProductoImportDialog.vue'
import ProductoQR from 'src/components/productos/ProductoQR.vue'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import ProductoViewImage from 'src/components/productos/ProductoViewImage.vue'
import StandardTableToolbar from 'src/components/shared/StandardTableToolbar.vue'
import StandardFilters from 'src/components/shared/StandardFilters.vue'
import StandardTable from 'src/components/shared/StandardTable.vue'

const productoStore = useProductoStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const { notifySuccess, notifyWarning, notifyError } = useNotify()
const $q = useQuasar()

const busqueda = ref('')
const filtroCategoria = ref<string | null>(null)
const filtroMarca = ref<string | null>(null)
const filtroActivo = ref<boolean | null>(true)
const dialogForm = ref(false)
const dialogImport = ref(false)
const dialogIMG = ref(false)
const dialogQR = ref(false)
const productoEditar = ref<Producto | null>(null)
const productoQR = ref<Producto | null>(null)

const productosFiltrados = computed(() => {
  let lista = productoStore.items
  if (filtroActivo.value !== null) lista = lista.filter((p) => p.activo === filtroActivo.value)
  if (filtroCategoria.value) lista = lista.filter((p) => p.categoriaId === filtroCategoria.value)
  if (filtroMarca.value) lista = lista.filter((p) => p.marcaId === filtroMarca.value)

  if (busqueda.value.trim()) {
    const tokens = busqueda.value
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0)

    lista = lista.filter((p) => {
      if (!tokens.length) return false
      const haystack = `${p.marca} ${p.sku} ${p.nombre} ${p.descripcion}`.toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })
  }

  return lista
})

const totalProductos = computed(() => productoStore.items.length)

const opcionesEstado = [
  { label: 'Todos', value: null },
  { label: 'Activos', value: true },
  { label: 'Inactivos', value: false },
]

const opcionesCategoria = computed(() => [
  { label: 'Todas las categorías', value: null },
  ...categoriaStore.options,
])

const opcionesMarca = computed(() => [
  { label: 'Todas las marcas', value: null },
  ...marcaStore.options,
])

const columnas: QTableColumn<Producto>[] = [
  { name: 'imagenUrl', label: '', field: 'imagenUrl', align: 'center' },
  { name: 'categoriaId', label: 'Categoría', field: 'categoriaId', align: 'left' },
  { name: 'marca', label: 'Marca', field: 'marca', align: 'left', sortable: true },
  { name: 'sku', label: 'Código', field: 'sku', align: 'left', sortable: true },
  { name: 'nombre', label: 'Producto', field: 'nombre', align: 'left', sortable: true },
  {
    name: 'precioCompra',
    label: 'P. Compra',
    field: 'precioCompra',
    align: 'right',
    sortable: true,
  },
  {
    name: 'precioOfrecido',
    label: 'P. Lista',
    field: 'precioOfrecido',
    align: 'right',
    sortable: true,
  },
  { name: 'precioFinal', label: 'P. Final', field: 'precioFinal', align: 'right', sortable: true },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: '', field: 'id', align: 'right' },
]

function abrirFormulario(p?: Producto): void {
  productoEditar.value = p ?? null
  dialogForm.value = true
}
function onSaved(_p: Producto): void {
  dialogForm.value = false
}
function onImported(): void {
  dialogImport.value = false
}
function verIMG(p: Producto): void {
  if (!p.imagenUrl) {
    notifyWarning('Producto Sin Imagen', 'top')
    return
  }
  productoQR.value = p
  dialogIMG.value = true
}

function verQR(p: Producto): void {
  productoQR.value = p
  dialogQR.value = true
}

function confirmarEliminar(p: Producto): void {
  $q.dialog({
    title: 'Eliminar producto',
    message: `¿Eliminar <strong>${p.nombre}</strong> [${p.sku}]? El producto quedará inactivo.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(async () => {
    try {
      await productoStore.remove(p.id)
      notifySuccess(`Producto "${p.nombre}" eliminado`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

function limpiarFiltros(): void {
  busqueda.value = ''
  filtroCategoria.value = null
  filtroMarca.value = null
  filtroActivo.value = true
}

async function recargar(): Promise<void> {
  await Promise.all([
    productoStore.fetchAll(true),
    categoriaStore.fetchAll(),
    marcaStore.fetchAll(),
  ])
}

onMounted(() =>
  Promise.all([productoStore.fetchAll(), categoriaStore.fetchAll(), marcaStore.fetchAll()]),
)
</script>

<template>
  <q-page class="sgi-page">
    <StandardTableToolbar
      v-model:search="busqueda"
      title="Productos"
      subtitle="Gestión del catálogo maestro de productos"
      icon="inventory_2"
      primary-label="Nuevo producto"
      primary-icon="add"
      :show-primary="true"
      search-placeholder="Buscar por SKU, nombre, marca o descripción…"
      :show-sucursal-selector="false"
      @primary="abrirFormulario()"
    >
      <template #actions>
        <button type="button" class="std-toolbar__secondary" @click="dialogImport = true">
          <q-icon name="upload_file" size="18px" />
          <span>Importar Excel</span>
        </button>
      </template>

      <StandardFilters
        v-model="busqueda"
        :total="totalProductos"
        :filtered="productosFiltrados.length"
        count-label="productos"
        placeholder="Buscar por Marca, Codigo, Nombre…"
        @clear="limpiarFiltros"
      >
        <template #extra>
          <q-select
            v-model="filtroCategoria"
            :options="opcionesCategoria"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="std-filters__select"
          />
          <q-select
            v-model="filtroMarca"
            :options="opcionesMarca"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="std-filters__select"
          />
          <q-select
            v-model="filtroActivo"
            :options="opcionesEstado"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="std-filters__select"
          />
          <q-btn
            color="primary"
            icon="refresh"
            label="Recargar"
            no-caps
            size="md"
            class="std-filters__select"
            :loading="productoStore.loading"
            @click="recargar"
          />
        </template>
      </StandardFilters>
    </StandardTableToolbar>

    <StandardTable
      :rows="productosFiltrados"
      :columns="columnas"
      :loading="productoStore.loading"
      no-data-label="No hay productos registrados"
      empty-icon="inventory_2"
      @row-click="(_, row) => abrirFormulario(row as Producto)"
    >
      <template #body-cell-imagenUrl="{ row }">
        <q-td auto-width>
          <div
            class="prod-thumb"
            :class="{ 'prod-thumb--clickable': !!row.imagenUrl }"
            @click.stop="verIMG(row as Producto)"
          >
            <ProductoImagenIFrame
              :imagen-url="(row as Producto).imagenUrl"
              :width="40"
              :height="40"
              :imagen-location="(row as Producto).imagenLocation"
              type="table"
            />
          </div>
        </q-td>
      </template>

      <template #body-cell-sku="{ row }">
        <q-td>
          <span class="std-cell-mono">{{ (row as Producto).sku }}</span>
        </q-td>
      </template>

      <template #body-cell-categoriaId="{ row }">
        <q-td>
          <span
            v-if="categoriaStore.getById((row as Producto).categoriaId)"
            class="std-status std-status--info"
          >
            {{ categoriaStore.getById((row as Producto).categoriaId)?.nombre }}
          </span>
          <span v-else class="text-muted">—</span>
        </q-td>
      </template>

      <template #body-cell-precioCompra="{ value }">
        <q-td class="text-right">
          <span class="text-mono text-weight-bold text-primary">
            {{ formatCurrency(Number(value) || 0) }}
          </span>
        </q-td>
      </template>

      <template #body-cell-precioOfrecido="{ value, row }">
        <q-td class="text-right">
          <span
            v-if="Number(value) > Number((row as Producto).precioFinal)"
            class="text-mono text-muted"
            style="text-decoration: line-through"
          >
            {{ formatCurrency(value) }}
          </span>
          <span v-else class="text-mono text-weight-medium">
            {{ formatCurrency(value) }}
          </span>
        </q-td>
      </template>

      <template #body-cell-precioFinal="{ value }">
        <q-td class="text-right">
          <span class="text-mono text-weight-bold text-positive">
            {{ formatCurrency(value) }}
          </span>
        </q-td>
      </template>

      <template #body-cell-activo="{ value }">
        <q-td auto-width>
          <span class="std-status" :class="value ? 'std-status--active' : 'std-status--inactive'">
            <q-icon :name="value ? 'check_circle' : 'cancel'" size="14px" />
            {{ value ? 'Activo' : 'Inactivo' }}
          </span>
        </q-td>
      </template>

      <template #body-cell-acciones="{ row }">
        <q-td auto-width>
          <div class="std-cell-actions">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              size="sm"
              @click.stop="abrirFormulario(row as Producto)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="qr_code_2"
              color="info"
              size="sm"
              @click.stop="verQR(row as Producto)"
            >
              <q-tooltip>Ver QR</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              size="sm"
              @click.stop="confirmarEliminar(row as Producto)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </StandardTable>

    <q-dialog v-model="dialogForm" persistent>
      <ProductoForm :producto="productoEditar" @saved="onSaved" @cancelled="dialogForm = false" />
    </q-dialog>

    <q-dialog v-model="dialogImport" persistent>
      <ProductoImportDialog @imported="onImported" @cancelled="dialogImport = false" />
    </q-dialog>

    <ProductoViewImage :is-open="dialogIMG" :producto="productoQR" @cancelled="dialogIMG = false" />

    <q-dialog v-model="dialogQR">
      <q-card class="sgi-card q-pa-md text-center" style="min-width: 280px; max-width: 320px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">QR — {{ productoQR?.sku }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <ProductoQR v-if="productoQR" :sku="productoQR.sku" :qr-code="productoQR.qrCode" />
          <div class="text-caption text-muted q-mt-sm">{{ productoQR?.nombre }}</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
@use 'src/css/_table-shared.scss' as *;

.std-toolbar__secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--sgi-border);
  background: var(--sgi-surface);
  color: var(--sgi-text);
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    border-color var(--sgi-dur-fast) var(--sgi-ease-out),
    transform var(--sgi-dur-fast) var(--sgi-ease-out);
}

.std-toolbar__secondary:hover {
  background: var(--sgi-surface-sunken);
  border-color: var(--sgi-border-strong);
  transform: translateY(-1px);
}

.std-filters__select {
  width: auto;
}

.prod-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--sgi-surface-sunken);
  border: 1px solid var(--sgi-border);
  flex-shrink: 0;
  transition: transform var(--sgi-dur-fast) var(--sgi-ease-out);
}

.prod-thumb--clickable {
  cursor: zoom-in;
}

.prod-thumb--clickable:hover {
  transform: scale(1.06);
}

.std-cell-mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  color: var(--sgi-text-secondary);
}

@media (max-width: 998px) {
  .std-filters__select {
    width: 95%;
  }
}
</style>
