<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Productos</div>
        <div class="text-muted text-body2 q-mt-xs">{{ productoStore.activos.length }} productos activos</div>
      </div>
      <q-space />
      <q-btn label="Nuevo producto" icon="add" color="primary" unelevated @click="abrirFormulario()" />
    </div>

    <!-- Filtros -->
    <q-card class="sgi-card q-mb-md" flat>
      <q-card-section class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-4">
          <q-input v-model="busqueda" placeholder="Buscar SKU, nombre, marca…" outlined dense clearable>
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-select
            v-model="filtroCategoria"
            :options="[{ label: 'Todas las categorías', value: null }, ...categoriaStore.options]"
            label="Categoría" outlined dense emit-value map-options
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-select v-model="filtroActivo" :options="opcionesEstado" label="Estado"
            outlined dense emit-value map-options />
        </div>
        <div class="col-auto">
          <q-btn flat round icon="refresh" color="primary" :loading="productoStore.loading" @click="cargar">
            <q-tooltip>Recargar</q-tooltip>
          </q-btn>
        </div>
        <q-space />
        <div class="text-caption text-muted">{{ productosFiltrados.length }} resultado(s)</div>
      </q-card-section>
    </q-card>

    <!-- Tabla -->
    <q-card class="sgi-card" flat>
      <q-table
        :rows="productosFiltrados" :columns="columnas" :loading="productoStore.loading"
        row-key="id" flat class="sgi-table" :pagination="{ rowsPerPage: 20 }"
        no-data-label="No hay productos registrados"
      >
        <template #body-cell-imagenUrl="{ value }">
          <q-td>
            <q-avatar size="40px" square rounded>
              <img v-if="value" :src="value" loading="lazy" />
              <q-icon v-else name="image" color="grey-4" size="30px" />
            </q-avatar>
          </q-td>
        </template>

        <template #body-cell-sku="{ row }">
          <q-td>
            <div class="row items-center no-wrap q-gutter-xs">
              <span class="text-weight-bold">{{ row.sku }}</span>
              <q-btn flat round dense size="xs" icon="qr_code" color="primary" @click="verQR(row)">
                <q-tooltip>Ver QR</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template #body-cell-precioOfrecido="{ value }">
          <q-td class="text-right text-muted">
            <span style="text-decoration:line-through">{{ formatCurrency(value) }}</span>
          </q-td>
        </template>

        <template #body-cell-precioFinal="{ value }">
          <q-td class="text-right">
            <span class="text-weight-bold text-positive">{{ formatCurrency(value) }}</span>
          </q-td>
        </template>

        <template #body-cell-categoriaId="{ value }">
          <q-td>
            <q-chip v-if="categoriaStore.getById(value)" dense size="sm" color="blue-1" text-color="blue-9">
              {{ categoriaStore.getById(value)?.nombre }}
            </q-chip>
            <span v-else class="text-muted">—</span>
          </q-td>
        </template>

        <template #body-cell-activo="{ value }">
          <q-td class="text-center">
            <q-chip
              :color="value ? 'positive' : 'grey-4'" :text-color="value ? 'white' : 'grey-7'"
              :icon="value ? 'check_circle' : 'cancel'" :label="value ? 'Activo' : 'Inactivo'"
              dense size="sm"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-right">
            <q-btn flat round dense icon="edit" color="primary" size="sm" @click="abrirFormulario(row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="qr_code_2" color="teal" size="sm" @click="verQR(row)">
              <q-tooltip>Ver QR</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmarEliminar(row)">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data="{ message }">
          <div class="full-width column flex-center q-pa-xl text-muted">
            <q-icon name="inventory_2" size="48px" style="opacity:0.3" class="q-mb-md" />
            <span>{{ message }}</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Formulario -->
    <q-dialog v-model="dialogForm" persistent>
      <ProductoForm :producto="productoEditar" @saved="onSaved" @cancelled="dialogForm = false" />
    </q-dialog>

    <!-- Dialog QR -->
    <q-dialog v-model="dialogQR">
      <q-card class="sgi-card q-pa-md text-center" style="min-width:280px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">QR — {{ productoQR?.sku }}</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <ProductoQR v-if="productoQR" :sku="productoQR.sku" :qr-code="productoQR.qrCode" />
          <div class="text-caption text-muted q-mt-sm">{{ productoQR?.nombre }}</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Producto } from 'src/types'
import { useProductoStore } from 'src/stores/productoStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useNotify } from 'src/composables/useNotify'
import { formatCurrency } from 'src/utils/formatters'
import ProductoForm from 'src/components/productos/ProductoForm.vue'
import ProductoQR from 'src/components/productos/ProductoQR.vue'

const productoStore = useProductoStore()
const categoriaStore = useCategoriaStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()

const busqueda = ref('')
const filtroCategoria = ref<string | null>(null)
const filtroActivo = ref<boolean | null>(true)
const dialogForm = ref(false)
const dialogQR = ref(false)
const productoEditar = ref<Producto | null>(null)
const productoQR = ref<Producto | null>(null)

const productosFiltrados = computed(() => {
  let lista = productoStore.items
  if (filtroActivo.value !== null) lista = lista.filter((p) => p.activo === filtroActivo.value)
  if (filtroCategoria.value) lista = lista.filter((p) => p.categoriaId === filtroCategoria.value)
  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase()
    lista = lista.filter((p) =>
      p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q),
    )
  }
  return lista
})

const opcionesEstado = [
  { label: 'Todos', value: null }, { label: 'Activos', value: true }, { label: 'Inactivos', value: false },
]

const columnas: QTableColumn[] = [
  { name: 'imagenUrl',      label: '',           field: 'imagenUrl',      align: 'center', style: 'width:56px' },
  { name: 'sku',            label: 'SKU',         field: 'sku',            align: 'left',  sortable: true },
  { name: 'nombre',         label: 'Nombre',      field: 'nombre',         align: 'left',  sortable: true },
  { name: 'marca',          label: 'Marca',       field: 'marca',          align: 'left',  sortable: true },
  { name: 'categoriaId',    label: 'Categoría',   field: 'categoriaId',    align: 'left' },
  { name: 'unidad',         label: 'Unidad',      field: 'unidad',         align: 'center' },
  { name: 'precioOfrecido', label: 'P. Lista',    field: 'precioOfrecido', align: 'right', sortable: true },
  { name: 'precioFinal',    label: 'P. Venta',    field: 'precioFinal',    align: 'right', sortable: true },
  { name: 'stockMinimo',    label: 'Stock Mín.',  field: 'stockMinimo',    align: 'center' },
  { name: 'activo',         label: 'Estado',      field: 'activo',         align: 'center', sortable: true },
  { name: 'acciones',       label: 'Acciones',    field: 'id',             align: 'right' },
]

function abrirFormulario(p?: Producto): void { productoEditar.value = p ?? null; dialogForm.value = true }
function onSaved(_p: Producto): void { dialogForm.value = false }
function verQR(p: Producto): void { productoQR.value = p; dialogQR.value = true }

function confirmarEliminar(p: Producto): void {
  $q.dialog({
    title: 'Eliminar producto',
    message: `¿Eliminar <strong>${p.nombre}</strong> [${p.sku}]? El producto quedará inactivo.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await productoStore.remove(p.id)
      notifySuccess(`Producto "${p.nombre}" eliminado`)
    } catch (e) { notifyError((e as Error).message) }
  })
}

async function cargar(): Promise<void> {
  await Promise.all([productoStore.fetchAll(), categoriaStore.fetchAll()])
}
onMounted(cargar)
</script>
