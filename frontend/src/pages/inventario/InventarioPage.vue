<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Inventario</div>
        <div class="text-muted text-body2 q-mt-xs">Control de Stock y Movimientos por sucursal</div>
      </div>
      <q-space />
      <div class="row q-gutter-xs q-mx-sm">
        <q-btn
          outline
          color="positive"
          icon="add_circle"
          label="Entrada"
          @click="abrirDialog('entrada')"
        />
        <q-btn
          outline
          color="negative"
          icon="remove_circle"
          label="Salida"
          @click="abrirDialog('salida')"
        />
        <q-btn
          outline
          color="primary"
          icon="swap_horiz"
          label="Transferir"
          :disable="!authStore.isGlobal && !authStore.can('inventario.transferencia')"
          @click="abrirDialog('transferencia')"
        />
        <q-select
          v-model="sucursalActiva"
          :options="opcionesSucursal"
          label="Sucursal"
          outlined
          dense
          emit-value
          map-options
          style="width: 250px"
          :disable="!authStore.isGlobal"
          @update:model-value="cargarDatos"
        >
          <template #prepend><q-icon name="store" /></template>
        </q-select>
      </div>
    </div>

    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="q-px-md q-py-xs">
        <q-tab name="stock" icon="warehouse" label="Stock actual" />
        <q-tab name="movimientos" icon="history" label="Movimientos" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tabActivo" animated>
        <q-tab-panel name="stock" class="q-pa-none">
          <q-card-section class="row q-col-gutter-sm items-center q-pb-sm">
            <div class="text-subtitle1 text-weight-bold">
              <q-banner
                v-if="stockFiltrado.length > 0"
                class="bg-info text-black rounded-borders q-py-none"
                dense
              >
                <strong>Stock Actual de {{ stockFiltrado.length }} productos</strong>
              </q-banner>
            </div>
            <div class="text-subtitle1 text-weight-bold">
              <q-banner
                v-if="alertas.length > 0"
                class="bg-orange-1 text-orange-10 rounded-borders q-py-none"
                dense
              >
                <template #avatar><q-icon name="warning" color="warning" /></template>
                <strong>{{ alertas.length }} producto(s) con stock bajo.</strong>
                <!--      {{ alertas.map((item) => item.sku).join(', ') }}-->
              </q-banner>
            </div>
            <q-space />
            <div class="col-12 col-sm-3">
              <q-input v-model="busqueda" placeholder="Buscar producto…" outlined dense clearable>
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-2">
              <q-select
                v-model="categoriaFiltro"
                :options="categoriaStore.options"
                label="Categoría"
                outlined
                dense
                emit-value
                map-options
                clearable
              />
            </div>
            <div class="col-12 col-sm-2">
              <q-select
                v-model="marcaFiltro"
                :options="[{ label: 'Todas las marcas', value: null }, ...marcaStore.optionsName]"
                label="Marca"
                outlined
                dense
                emit-value
                map-options
                clearable
              />
            </div>
            <div class="col-auto">
              <q-btn
                flat
                round
                icon="refresh"
                color="primary"
                :loading="loadingStock"
                @click="cargarDatos"
              />
            </div>
          </q-card-section>

          <q-table
            :rows="stockFiltrado"
            :columns="columnasStock"
            :loading="loadingStock"
            row-key="id"
            dense
            class="sgi-table"
            :pagination="{ rowsPerPage: 10 }"
            no-data-label="No hay registros de stock para esta sucursal"
          >
            <template #body-cell-imagenUrl="{ row }">
              <q-td>
                <span
                  :style="row.imagenUrl ? 'cursor: pointer' : ''"
                  @click="openDialogViewImage(row)"
                >
                  <ProductoImagenIFrame
                    :imagen-url="row.imagenUrl"
                    :imagen-location="row.imagenLocation"
                  />
                </span>
              </q-td>
            </template>
            <template #body-cell-nombre="{ value }">
              <q-td>
                <div class="text-weight-medium product-name-with-ellipsis">
                  {{ truncate(value, 100) }}
                </div>
                <q-tooltip v-if="value.length > 95">{{ value }}</q-tooltip>
              </q-td>
            </template>
            <template #body-cell-categoriaId="{ value }">
              <q-td>{{ categoriaStore.getById(value)?.nombre || '—' }}</q-td>
            </template>
            <template #body-cell-stockActual="{ row }">
              <q-td class="text-center">
                <q-chip
                  dense
                  outline
                  :color="row.stockBajo ? 'warning' : 'positive'"
                  :icon="row.stockBajo ? 'warning' : 'check'"
                >
                  {{ row.stockActual }} {{ row.stockActual > 1 ? row.unidad + 'es' : row.unidad }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <q-tab-panel name="movimientos" class="q-pa-none">
          <q-card-section class="row q-col-gutter-sm items-center q-pb-sm">
            <div class="col-12 col-sm-2">
              <q-select
                v-model="movimientoTipoFiltro"
                :options="opcionesTipoMovimiento"
                label="Tipo"
                outlined
                dense
                emit-value
                map-options
                clearable
                @update:model-value="cargarMovimientos"
              />
            </div>
            <div class="col-12 col-sm-2">
              <q-select
                v-model="movimientoModoFiltro"
                :options="opcionesModoMovimiento"
                label="Modo"
                outlined
                dense
                emit-value
                map-options
                clearable
                @update:model-value="cargarMovimientos"
              />
            </div>
            <div class="col-12 col-sm-3">
              <q-select
                v-model="referenciaTipoFiltro"
                :options="opcionesReferenciaTipo"
                label="Referencia"
                outlined
                dense
                emit-value
                map-options
                clearable
                @update:model-value="cargarMovimientos"
              />
            </div>
            <div class="col-12 col-sm-2">
              <q-input
                v-model="movimientoDesde"
                label="Desde"
                outlined
                dense
                type="date"
                @update:model-value="cargarMovimientos"
              />
            </div>
            <div class="col-12 col-sm-2">
              <q-input
                v-model="movimientoHasta"
                label="Hasta"
                outlined
                dense
                type="date"
                @update:model-value="cargarMovimientos"
              />
            </div>
          </q-card-section>

          <MovimientosTable
            :movimientos="movimientos"
            :loading="loadingMovimientos"
            @refresh="cargarMovimientos"
            @edit="editarMovimiento"
          />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-dialog v-model="dialogEntrada" persistent>
      <EntradaForm
        :initial-data="movimientoEditando"
        @saved="onMovimientoGuardado"
        @cancelled="cerrarDialogs"
      />
    </q-dialog>
    <q-dialog v-model="dialogSalida" persistent>
      <SalidaForm
        :initial-data="movimientoEditando"
        @saved="onMovimientoGuardado"
        @cancelled="cerrarDialogs"
      />
    </q-dialog>
    <q-dialog v-model="dialogTransferencia" persistent>
      <TransferenciaForm
        :initial-data="movimientoEditando"
        @saved="onMovimientoGuardado"
        @cancelled="cerrarDialogs"
      />
    </q-dialog>
  </q-page>
  <ProductoViewImage
    :is-open="dialogViewImage"
    :producto="productSelected"
    @cancelled="cerrarDialogs"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type QTableColumn } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import { useCategoriaStore } from 'src/stores/categoriaStore.ts'
import { useMarcaStore } from 'src/stores/marcaStore.ts'
import { truncate } from 'src/utils/formatters.ts'
import type { InventarioItem, MovimientoCabecera, Producto } from 'src/types'
import MovimientosTable from 'src/components/inventario/MovimientosTable.vue'
import EntradaForm from 'src/components/inventario/EntradaForm.vue'
import SalidaForm from 'src/components/inventario/SalidaForm.vue'
import TransferenciaForm from 'src/components/inventario/TransferenciaForm.vue'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useProductoStore } from 'src/stores/productoStore.ts'
import { useLoading } from 'src/composables/useLoading.ts'
import ProductoViewImage from 'src/components/productos/ProductoViewImage.vue'
import { useNotify } from 'src/composables/useNotify.ts'

type InventarioRow = InventarioItem & {
  stockMinimo: number
  stockBajo: boolean
  sku: string
  nombre: string
  marca: string
  marcaId: string
  categoriaId: string
  unidad: string
  imagenUrl: string
  imagenLocation: string
}

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const productoStore = useProductoStore()
const { notifyWarning } = useNotify()

const sucursalActiva = ref(authStore.isGlobal ? '' : (authStore.sucursalId ?? ''))
const busqueda = ref('')
const categoriaFiltro = ref(null)
const marcaFiltro = ref('')
const tabActivo = ref('stock')
const stock = ref<InventarioRow[]>([])
const movimientos = ref<MovimientoCabecera[]>([])
const alertas = ref<InventarioRow[]>([])
const loadingStock = ref(false)
const loadingMovimientos = ref(false)
const dialogEntrada = ref(false)
const dialogSalida = ref(false)
const dialogTransferencia = ref(false)
const dialogViewImage = ref(false)
const movimientoEditando = ref<MovimientoCabecera | null>(null)
const movimientoTipoFiltro = ref<string | null>(null)
const movimientoModoFiltro = ref<string | null>(null)
const referenciaTipoFiltro = ref<string | null>(null)
const movimientoDesde = ref('')
const movimientoHasta = ref('')
const productSelected = ref<Producto | null>(null)

const opcionesSucursal = computed(() =>
  authStore.isGlobal
    ? sucursalStore.activas.map((sucursal) => ({
        label: `${sucursal.nombre} — ${sucursal.ciudad}`,
        value: sucursal.id,
      }))
    : sucursalStore.activas
        .filter((sucursal) => sucursal.id === authStore.sucursalId)
        .map((sucursal) => ({ label: sucursal.nombre, value: sucursal.id })),
)

const opcionesTipoMovimiento = [
  { label: 'Todos', value: null },
  { label: 'Entrada', value: 'ENTRADA' },
  { label: 'Salida', value: 'SALIDA' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
]
const opcionesModoMovimiento = [
  { label: 'Todos', value: null },
  { label: 'Unitario', value: 'UNITARIO' },
  { label: 'Masivo', value: 'MASIVO' },
]
const opcionesReferenciaTipo = [
  { label: 'Todas', value: null },
  { label: 'Inicio inventario', value: 'INICIO_INVENTARIO' },
  { label: 'Cierre inventario', value: 'CIERRE_INVENTARIO' },
  { label: 'Reposición', value: 'REPOSICION_PRODUCTO' },
  { label: 'Baja', value: 'BAJA_PRODUCTO' },
  { label: 'Otro', value: 'OTRO' },
]

const stockFiltrado = computed(() => {
  let rows = stock.value
  if (busqueda.value) {
    // Busqueda avanzada
    // Divide el criterio en tokens y exige que TODOS estén presentes en algún campo
    const tokens = busqueda.value
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0)

    rows = rows.filter((p) => {
      if (!tokens.length) return false
      const haystack = `${p.marca} ${p.sku} ${p.nombre}`.toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })
  }
  if (categoriaFiltro.value) rows = rows.filter((row) => row.categoriaId === categoriaFiltro.value)
  if (marcaFiltro.value)
    rows = rows.filter(
      (row) => row.marca === marcaFiltro.value || row.marcaId === marcaFiltro.value,
    )

  rows.sort((a, b) => {
    const marcaCompare = a.marca.localeCompare(b.marca)
    if (marcaCompare !== 0) return marcaCompare
    const skuCompare = a.sku.localeCompare(b.sku)
    if (skuCompare !== 0) return skuCompare
    return a.nombre.localeCompare(b.nombre)
  })

  return rows
})

const columnasStock: QTableColumn[] = [
  { name: 'imagenUrl', label: '', field: 'imagenUrl', align: 'center', style: 'width:52px' },
  { name: 'marca', label: 'Marca', field: 'marca', align: 'left', sortable: true },
  { name: 'sku', label: 'Codigo', field: 'sku', align: 'left', sortable: true },
  { name: 'nombre', label: 'Producto', field: 'nombre', align: 'left', sortable: true },
  { name: 'categoriaId', label: 'Categoría', field: 'categoriaId', align: 'left', sortable: true },
  { name: 'stockActual', label: 'Stock', field: 'stockActual', align: 'center', sortable: true },
  { name: 'fechaActualizacion', label: 'Actualizado', field: 'fechaActualizacion', align: 'left' },
]

function abrirDialog(tipo: 'entrada' | 'salida' | 'transferencia'): void {
  movimientoEditando.value = null
  if (tipo === 'entrada') dialogEntrada.value = true
  if (tipo === 'salida') dialogSalida.value = true
  if (tipo === 'transferencia') dialogTransferencia.value = true
}

function openDialogViewImage(p: Producto): void {
  if (!p.imagenUrl) {
    notifyWarning('Producto Sin Imagen', 'top')
    return
  }
  productSelected.value = p
  dialogViewImage.value = true
  console.log('p.imagenUrl', productSelected.value, dialogViewImage.value)
}

function closeDialogViewImage(): void {
  productSelected.value = null
  dialogViewImage.value = false
}

function cerrarDialogs(): void {
  dialogEntrada.value = false
  dialogSalida.value = false
  dialogTransferencia.value = false
  movimientoEditando.value = null
  closeDialogViewImage()
}

async function cargarStock(): Promise<void> {
  if (!sucursalActiva.value) return
  loadingStock.value = true
  useLoading(true, 'Cargando Stock...')
  try {
    stock.value = (await inventarioService.getStockPorSucursal(
      sucursalActiva.value,
    )) as InventarioRow[]
    stock.value.sort((a, b) => {
      const marcaCompare = a.marca.localeCompare(b.marca)
      if (marcaCompare !== 0) return marcaCompare
      const skuCompare = a.sku.localeCompare(b.sku)
      if (skuCompare !== 0) return skuCompare
      return a.nombre.localeCompare(b.nombre)
    })
    alertas.value = stock.value.filter((row) => row.stockBajo)
  } finally {
    loadingStock.value = false
    useLoading(false)
  }
}

async function cargarMovimientos(): Promise<void> {
  if (!sucursalActiva.value) return
  loadingMovimientos.value = true
  useLoading(true, 'Cargando Movimientos...')
  try {
    movimientos.value = await inventarioService.getMovimientosCabecera({
      sucursalId: sucursalActiva.value,
      tipo: movimientoTipoFiltro.value || undefined,
      modo: movimientoModoFiltro.value || undefined,
      referenciaTipo: referenciaTipoFiltro.value || undefined,
      desde: movimientoDesde.value || undefined,
      hasta: movimientoHasta.value || undefined,
    })
  } finally {
    loadingMovimientos.value = false
    useLoading(false)
  }
}

async function cargarDatos(): Promise<void> {
  //await Promise.all([cargarStock(), cargarMovimientos()])
  await cargarStock()
  await cargarMovimientos()
}

async function editarMovimiento(id: string): Promise<void> {
  const movimiento = await inventarioService.getMovimientoById(id)
  movimientoEditando.value = movimiento
  if (movimiento.tipo === 'ENTRADA') dialogEntrada.value = true
  if (movimiento.tipo === 'SALIDA') dialogSalida.value = true
  if (movimiento.tipo === 'TRANSFERENCIA') dialogTransferencia.value = true
}

function onMovimientoGuardado(): void {
  cerrarDialogs()
  void cargarDatos()
  void productoStore.fetchAll()
}

onMounted(async () => {
  //useLoading(true, 'Cargando Inventario...')
  if (!sucursalStore.items.length) await sucursalStore.fetchAll()
  if (!categoriaStore.items.length) await categoriaStore.fetchAll()
  if (!marcaStore.items.length) await marcaStore.fetchAll()
  if (!productoStore.items.length) await productoStore.fetchAll()

  if (!sucursalActiva.value && sucursalStore.activas.length > 0) {
    sucursalActiva.value = sucursalStore.activas[0].id
    //await cargarDatos()
  }
  //useLoading(false)
})
</script>
