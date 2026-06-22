<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { type QTableColumn } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useMarcaStore } from 'src/stores/marcaStore'
import { truncate, formatDate, formatCurrency } from 'src/utils/formatters'
import type { InventarioItem, MovimientoCabecera, Producto } from 'src/types'
import MovimientosTable from 'src/components/inventario/MovimientosTable.vue'
import EntradaForm from 'src/components/inventario/EntradaForm.vue'
import SalidaForm from 'src/components/inventario/SalidaForm.vue'
import TransferenciaForm from 'src/components/inventario/TransferenciaForm.vue'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useProductoStore } from 'src/stores/productoStore'
import { useLoading } from 'src/composables/useLoading'
import ProductoViewImage from 'src/components/productos/ProductoViewImage.vue'
import { useNotify } from 'src/composables/useNotify'
import InventarioProductoDetalle from 'src/components/inventario/InventarioProductoDetalle.vue'
import StandardTableToolbar from 'src/components/shared/StandardTableToolbar.vue'
import StandardFilters from 'src/components/shared/StandardFilters.vue'
import StandardTable from 'src/components/shared/StandardTable.vue'
import { useSucursalActivaStore } from 'src/stores/sucursalActiva'

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
const sucursalActivaStore = useSucursalActivaStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const productoStore = useProductoStore()
const { notifyWarning } = useNotify()

const sucursalActiva = computed(() => sucursalActivaStore.sucursalId)

const busqueda = ref('')
const categoriaFiltro = ref<string | null>(null)
const marcaFiltro = ref<string | null>(null)
const tabActivo = ref<'stock' | 'movimientos'>('stock')
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
const dialogDetalle = ref(false)
const productoDetalleRow = ref<InventarioRow | null>(null)
const movimientoTipoFiltro = ref<string | null>(null)
const movimientoModoFiltro = ref<string | null>(null)
const referenciaTipoFiltro = ref<string | null>(null)
const movimientoDesde = ref('')
const movimientoHasta = ref('')
const productSelected = ref<Producto | null>(null)

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

const opcionesCategoria = computed(() => [
  { label: 'Todas las categorías', value: null },
  ...categoriaStore.options,
])

const opcionesMarca = computed(() => [
  { label: 'Todas las marcas', value: null },
  ...marcaStore.optionsName,
])

const stockFiltrado = computed(() => {
  let rows = stock.value
  if (busqueda.value.trim()) {
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
  if (marcaFiltro.value) {
    rows = rows.filter(
      (row) => row.marca === marcaFiltro.value || row.marcaId === marcaFiltro.value,
    )
  }

  return [...rows].sort((a, b) => {
    const marcaCompare = a.marca.localeCompare(b.marca)
    if (marcaCompare !== 0) return marcaCompare
    const skuCompare = a.sku.localeCompare(b.sku)
    if (skuCompare !== 0) return skuCompare
    return a.nombre.localeCompare(b.nombre)
  })
})

const totalStock = computed(() => stock.value.length)

const columnasStock: QTableColumn<InventarioRow>[] = [
  { name: 'imagenUrl', label: '', field: 'imagenUrl', align: 'center' },
  { name: 'marca', label: 'Marca', field: 'marca', align: 'left', sortable: true },
  { name: 'sku', label: 'Código', field: 'sku', align: 'left', sortable: true },
  { name: 'nombre', label: 'Producto', field: 'nombre', align: 'left', sortable: true },
  { name: 'categoriaId', label: 'Categoría', field: 'categoriaId', align: 'left', sortable: true },
  { name: 'stockActual', label: 'Stock', field: 'stockActual', align: 'center', sortable: true },
  { name: 'precioCompra', label: 'P. Compra', field: 'precioCompra', align: 'right', sortable: true },
  { name: 'precioOfrecido', label: 'P. Lista', field: 'precioOfrecido', align: 'right', sortable: true },
  { name: 'precioFinal', label: 'P. Venta', field: 'precioFinal', align: 'right', sortable: true },
  { name: 'fechaPrecio', label: 'Fecha Precio', field: 'fechaPrecio', align: 'center', sortable: true },
  { name: 'fechaActualizacion', label: 'Actualizado', field: 'fechaActualizacion', align: 'left' },
  { name: 'acciones', label: '', field: 'id', align: 'center' },
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
}

function closeDialogViewImage(): void {
  productSelected.value = null
  dialogViewImage.value = false
}

function openDialogDetalle(row: InventarioRow): void {
  productoDetalleRow.value = row
  dialogDetalle.value = true
}

function onDetalleGuardado(): void {
  dialogDetalle.value = false
  productoDetalleRow.value = null
  void cargarStock()
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
  useLoading(true, 'Cargando Stock…')
  try {
    stock.value = (await inventarioService.getStockPorSucursal(
      sucursalActiva.value,
    )) as InventarioRow[]
    alertas.value = stock.value.filter((row) => row.stockBajo)
  } finally {
    loadingStock.value = false
    useLoading(false)
  }
}

async function cargarMovimientos(): Promise<void> {
  if (!sucursalActiva.value) return
  loadingMovimientos.value = true
  useLoading(true, 'Cargando Movimientos…')
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

function limpiarFiltros(): void {
  busqueda.value = ''
  categoriaFiltro.value = null
  marcaFiltro.value = null
}

watch(sucursalActiva, () => {
  cargarDatos()
})

onMounted(async () => {
  await Promise.all([
    sucursalStore.items.length === 0 ? sucursalStore.fetchAll() : Promise.resolve(),
    categoriaStore.items.length === 0 ? categoriaStore.fetchAll() : Promise.resolve(),
    marcaStore.items.length === 0 ? marcaStore.fetchAll() : Promise.resolve(),
    productoStore.items.length === 0 ? productoStore.fetchAll() : Promise.resolve(),
  ])
  await cargarDatos()
})
</script>

<template>
  <q-page class="sgi-page">
    <StandardTableToolbar
      title="Inventario"
      :subtitle="`Control de Stock y Movimientos${sucursalActivaStore.sucursal ? ' · Sucursal: ' + sucursalActivaStore.sucursal.nombre : ''}`"
      icon="warehouse"
      :show-primary="false"
      :show-sucursal-selector="false"
    >
      <template #actions>
        <button
          type="button"
          class="std-toolbar__secondary std-toolbar__secondary--positive"
          @click="abrirDialog('entrada')"
        >
          <q-icon name="add_circle" size="18px" />
          <span>Entrada</span>
        </button>
        <button
          type="button"
          class="std-toolbar__secondary std-toolbar__secondary--negative"
          @click="abrirDialog('salida')"
        >
          <q-icon name="remove_circle" size="18px" />
          <span>Salida</span>
        </button>
        <button
          type="button"
          class="std-toolbar__secondary"
          :disabled="!authStore.isGlobal && !authStore.can('inventario.transferencia')"
          @click="abrirDialog('transferencia')"
        >
          <q-icon name="swap_horiz" size="18px" />
          <span>Transferir</span>
        </button>
      </template>
    </StandardTableToolbar>

    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="sgi-tabs">
        <q-tab name="stock" icon="warehouse" label="Stock actual" />
        <q-tab name="movimientos" icon="history" label="Movimientos" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tabActivo" animated keep-alive>
        <!-- ── Stock ──────────────────────────── -->
        <q-tab-panel name="stock" class="q-pa-none">
          <div v-if="alertas.length > 0" class="stock-alert">
            <q-icon name="warning" size="18px" />
            <span>
              <strong>{{ alertas.length }}</strong> producto(s) con stock bajo en esta sucursal.
            </span>
          </div>

          <div class="q-pa-md">
            <StandardFilters
              v-model="busqueda"
              :total="totalStock"
              :filtered="stockFiltrado.length"
              count-label="productos en stock"
              search-placeholder="Buscar producto por SKU, marca o nombre…"
              @clear="limpiarFiltros"
            >
              <template #extra>
                <q-select
                  v-model="categoriaFiltro"
                  :options="opcionesCategoria"
                  label="Categoría"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="std-filters__select"
                  style="min-width: 170px"
                />
                <q-select
                  v-model="marcaFiltro"
                  :options="opcionesMarca"
                  label="Marca"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="std-filters__select"
                  style="min-width: 170px"
                />
                <q-btn
                  outline
                  color="primary"
                  icon="refresh"
                  label="Recargar"
                  no-caps
                  size="sm"
                  :loading="loadingStock"
                  @click="cargarStock"
                />
              </template>
            </StandardFilters>
          </div>

          <StandardTable
            :rows="stockFiltrado"
            :columns="columnasStock"
            :loading="loadingStock"
            no-data-label="No hay registros de stock para esta sucursal"
            empty-icon="warehouse"
            @row-click="(_, row) => openDialogDetalle(row as InventarioRow)"
          >
            <template #body-cell-imagenUrl="{ row }">
              <q-td auto-width>
                <div
                  class="inv-thumb"
                  :class="{ 'inv-thumb--clickable': !!(row as InventarioRow).imagenUrl }"
                  @click.stop="openDialogViewImage(row as InventarioRow as unknown as Producto)"
                >
                  <ProductoImagenIFrame
                    :imagen-url="(row as InventarioRow).imagenUrl"
                    :imagen-location="(row as InventarioRow).imagenLocation"
                    :width="40"
                    :height="40"
                    type="table"
                  />
                </div>
              </q-td>
            </template>

            <template #body-cell-sku="{ row }">
              <q-td>
                <span class="std-cell-mono">{{ (row as InventarioRow).sku }}</span>
              </q-td>
            </template>

            <template #body-cell-nombre="{ value }">
              <q-td>
                <div class="text-weight-medium std-cell-clamp-2">
                  {{ truncate(String(value), 100) }}
                </div>
                <q-tooltip v-if="String(value).length > 95">{{ value }}</q-tooltip>
              </q-td>
            </template>

            <template #body-cell-categoriaId="{ row }">
              <q-td>
                <span
                  v-if="categoriaStore.getById((row as InventarioRow).categoriaId)"
                  class="std-status std-status--info"
                >
                  {{ categoriaStore.getById((row as InventarioRow).categoriaId)?.nombre }}
                </span>
                <span v-else class="text-muted">—</span>
              </q-td>
            </template>

            <template #body-cell-precioCompra="{ value }">
              <q-td class="text-right">
                <span class="text-mono text-weight-medium">{{ formatCurrency(Number(value)) }}</span>
              </q-td>
            </template>

            <template #body-cell-precioOfrecido="{ value }">
              <q-td class="text-right">
                <span class="text-mono">{{ formatCurrency(Number(value)) }}</span>
              </q-td>
            </template>

            <template #body-cell-precioFinal="{ value }">
              <q-td class="text-right">
                <span class="text-mono text-weight-bold text-primary">
                  {{ formatCurrency(Number(value)) }}
                </span>
              </q-td>
            </template>

            <template #body-cell-fechaPrecio="{ value }">
              <q-td class="text-center">
                <span class="text-caption">{{ formatDate(String(value)) }}</span>
              </q-td>
            </template>

            <template #body-cell-stockActual="{ row }">
              <q-td auto-width>
                <span
                  class="std-status"
                  :class="(row as InventarioRow).stockBajo ? 'std-status--warning' : 'std-status--active'"
                >
                  <q-icon
                    :name="(row as InventarioRow).stockBajo ? 'warning' : 'check_circle'"
                    size="14px"
                  />
                  {{ (row as InventarioRow).stockActual }} {{ (row as InventarioRow).unidad }}{{
                    (row as InventarioRow).stockActual === 1 ? '' : 's'
                  }}
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
                    icon="visibility"
                    color="primary"
                    size="sm"
                    @click.stop="openDialogDetalle(row as InventarioRow)"
                  >
                    <q-tooltip>Ver / editar detalle y precios</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>
          </StandardTable>
        </q-tab-panel>

        <!-- ── Movimientos ───────────────────────── -->
        <q-tab-panel name="movimientos" class="q-pa-none">
          <div class="q-pa-md">
            <StandardFilters
              :total="movimientos.length"
              :filtered="movimientos.length"
              :show-count="false"
              search-placeholder="…"
            >
              <template #extra>
                <q-select
                  v-model="movimientoTipoFiltro"
                  :options="opcionesTipoMovimiento"
                  label="Tipo"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="std-filters__select"
                  style="min-width: 150px"
                  @update:model-value="cargarMovimientos"
                />
                <q-select
                  v-model="movimientoModoFiltro"
                  :options="opcionesModoMovimiento"
                  label="Modo"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="std-filters__select"
                  style="min-width: 150px"
                  @update:model-value="cargarMovimientos"
                />
                <q-select
                  v-model="referenciaTipoFiltro"
                  :options="opcionesReferenciaTipo"
                  label="Referencia"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="std-filters__select"
                  style="min-width: 170px"
                  @update:model-value="cargarMovimientos"
                />
                <q-input
                  v-model="movimientoDesde"
                  label="Desde"
                  outlined
                  dense
                  type="date"
                  class="std-filters__select"
                  style="min-width: 150px"
                  @update:model-value="cargarMovimientos"
                />
                <q-input
                  v-model="movimientoHasta"
                  label="Hasta"
                  outlined
                  dense
                  type="date"
                  class="std-filters__select"
                  style="min-width: 150px"
                  @update:model-value="cargarMovimientos"
                />
                <q-btn
                  outline
                  color="primary"
                  icon="refresh"
                  label="Recargar"
                  no-caps
                  size="sm"
                  :loading="loadingMovimientos"
                  @click="cargarMovimientos"
                />
              </template>
            </StandardFilters>
          </div>

          <MovimientosTable
            :movimientos="movimientos"
            :loading="loadingMovimientos"
            @refresh="cargarMovimientos"
            @edit="editarMovimiento"
          />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialogs -->
    <q-dialog v-model="dialogEntrada" persistent>
      <EntradaForm :initial-data="movimientoEditando" @saved="onMovimientoGuardado" @cancelled="cerrarDialogs" />
    </q-dialog>
    <q-dialog v-model="dialogSalida" persistent>
      <SalidaForm :initial-data="movimientoEditando" @saved="onMovimientoGuardado" @cancelled="cerrarDialogs" />
    </q-dialog>
    <q-dialog v-model="dialogTransferencia" persistent>
      <TransferenciaForm
        :initial-data="movimientoEditando"
        @saved="onMovimientoGuardado"
        @cancelled="cerrarDialogs"
      />
    </q-dialog>
    <q-dialog v-model="dialogDetalle" position="standard">
      <InventarioProductoDetalle :row="productoDetalleRow" @saved="onDetalleGuardado" />
    </q-dialog>

    <ProductoViewImage
      :is-open="dialogViewImage"
      :producto="productSelected"
      @cancelled="closeDialogViewImage"
    />
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

.std-toolbar__secondary:hover:not(:disabled) {
  background: var(--sgi-surface-sunken);
  border-color: var(--sgi-border-strong);
  transform: translateY(-1px);
}

.std-toolbar__secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.std-toolbar__secondary--positive {
  color: var(--sgi-positive);
  border-color: color-mix(in srgb, var(--sgi-positive) 30%, var(--sgi-border));
}

.std-toolbar__secondary--positive:hover:not(:disabled) {
  background: color-mix(in srgb, var(--sgi-positive) 10%, transparent);
}

.std-toolbar__secondary--negative {
  color: var(--sgi-negative);
  border-color: color-mix(in srgb, var(--sgi-negative) 30%, var(--sgi-border));
}

.std-toolbar__secondary--negative:hover:not(:disabled) {
  background: color-mix(in srgb, var(--sgi-negative) 10%, transparent);
}

.std-filters__select {
  min-width: 150px;
}

.sgi-tabs {
  background: transparent;
}

.sgi-tabs :deep(.q-tab) {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.01em;
  min-height: 48px;
}

.stock-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: color-mix(in srgb, var(--sgi-warning) 14%, transparent);
  color: var(--sgi-warning);
  border-bottom: 1px solid color-mix(in srgb, var(--sgi-warning) 25%, var(--sgi-border));
  font-size: 0.88rem;
}

.stock-alert strong {
  color: var(--sgi-warning);
  font-weight: 800;
}

.inv-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--sgi-surface-sunken);
  border: 1px solid var(--sgi-border);
  flex-shrink: 0;
  transition: transform var(--sgi-dur-fast) var(--sgi-ease-out);
}

.inv-thumb--clickable {
  cursor: zoom-in;
}

.inv-thumb--clickable:hover {
  transform: scale(1.06);
}

.std-cell-mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  color: var(--sgi-text-secondary);
}
</style>
