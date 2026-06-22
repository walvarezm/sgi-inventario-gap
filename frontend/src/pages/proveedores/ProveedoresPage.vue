<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Proveedor, OrdenCompra, EstadoOrden } from 'src/types'
import { ESTADO_ORDEN_LABELS } from 'src/types'
import { useProveedorStore } from 'src/stores/proveedorStore'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useNotify } from 'src/composables/useNotify'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import { proveedorService } from 'src/services/proveedorService'
import ProveedorForm from 'src/components/proveedores/ProveedorForm.vue'
import OrdenCompraForm from 'src/components/ordenes/OrdenCompraForm.vue'
import RecepcionForm from 'src/components/ordenes/RecepcionForm.vue'
import StandardTableToolbar from 'src/components/shared/StandardTableToolbar.vue'
import StandardFilters from 'src/components/shared/StandardFilters.vue'
import StandardTable from 'src/components/shared/StandardTable.vue'

const store = useProveedorStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()

const tabActivo = ref<'proveedores' | 'ordenes'>('proveedores')
const busqueda = ref('')
const filtroEstadoOrden = ref<EstadoOrden | null>(null)
const dialogProveedor = ref(false)
const dialogOrden = ref(false)
const dialogRecepcion = ref(false)
const proveedorEditar = ref<Proveedor | null>(null)
const ordenRecepcion = ref<OrdenCompra | null>(null)

const proveedoresFiltrados = computed(() => {
  if (!busqueda.value.trim()) return store.items
  const q = busqueda.value.toLowerCase()
  return store.items.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.rucNit.toLowerCase().includes(q) ||
      p.ciudad.toLowerCase().includes(q) ||
      p.contacto.toLowerCase().includes(q),
  )
})

const ordenesFiltradas = computed(() =>
  filtroEstadoOrden.value
    ? store.ordenes.filter((o) => o.estado === filtroEstadoOrden.value)
    : store.ordenes,
)

const totalProveedores = computed(() => store.items.length)
const totalOrdenes = computed(() => store.ordenes.length)

const opcionesEstadoOrden = [
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'Parciales', value: 'PARCIAL' },
  { label: 'Completadas', value: 'COMPLETADA' },
  { label: 'Canceladas', value: 'CANCELADA' },
]

const columnasProveedor: QTableColumn<Proveedor>[] = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'rucNit', label: 'RUC/NIT', field: 'rucNit', align: 'left' },
  { name: 'contacto', label: 'Contacto', field: 'contacto', align: 'left' },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', align: 'left' },
  { name: 'ciudad', label: 'Ciudad', field: 'ciudad', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: '', field: 'id', align: 'right' },
]

const columnasOrden: QTableColumn<OrdenCompra>[] = [
  { name: 'numero', label: 'N° Orden', field: 'numero', align: 'left', sortable: true },
  { name: 'proveedorNombre', label: 'Proveedor', field: 'proveedorNombre', align: 'left', sortable: true },
  {
    name: 'sucursalId',
    label: 'Sucursal',
    field: 'sucursalId',
    align: 'left',
    format: (v) => sucursalStore.getById(String(v))?.nombre ?? String(v),
  },
  {
    name: 'fechaEmision',
    label: 'Fecha',
    field: 'fechaEmision',
    align: 'left',
    format: (v) => formatDate(String(v)),
  },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'accionesOrden', label: '', field: 'id', align: 'right' },
]

function labelEstado(estado: EstadoOrden): string {
  return ESTADO_ORDEN_LABELS[estado] ?? estado
}

function abrirFormulario(p?: Proveedor): void {
  proveedorEditar.value = p ?? null
  dialogProveedor.value = true
}

function nuevaOrdenPara(p: Proveedor): void {
  store.select(p)
  dialogOrden.value = true
}

async function abrirRecepcion(orden: OrdenCompra): Promise<void> {
  try {
    const detallada = await proveedorService.getOrdenById(orden.id)
    ordenRecepcion.value = detallada
    dialogRecepcion.value = true
  } catch (e) {
    notifyError((e as Error).message)
  }
}

function onProveedorGuardado(_p: Proveedor): void {
  dialogProveedor.value = false
}
function onOrdenGuardada(_o: OrdenCompra): void {
  dialogOrden.value = false
  void cargarOrdenes()
}
function onRecepcionGuardada(_o: OrdenCompra): void {
  dialogRecepcion.value = false
  void cargarOrdenes()
}

function confirmarEliminar(p: Proveedor): void {
  $q.dialog({
    title: 'Eliminar proveedor',
    message: `¿Eliminar <strong>${p.nombre}</strong>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(async () => {
    try {
      await store.remove(p.id)
      notifySuccess(`Proveedor "${p.nombre}" eliminado`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

function confirmarCancelacion(o: OrdenCompra): void {
  $q.dialog({
    title: 'Cancelar orden',
    message: `¿Cancelar la orden <strong>${o.numero}</strong>?`,
    html: true,
    cancel: { label: 'No', flat: true, noCaps: true },
    ok: { label: 'Sí, cancelar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(async () => {
    try {
      await store.cancelarOrden(o.id)
      notifySuccess(`Orden ${o.numero} cancelada`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

async function cargarOrdenes(): Promise<void> {
  await store.fetchOrdenes()
}

function limpiarFiltrosProveedor(): void {
  busqueda.value = ''
}

function limpiarFiltrosOrden(): void {
  filtroEstadoOrden.value = null
}

onMounted(async () => {
  await Promise.all([
    store.fetchAll(),
    store.fetchOrdenes(),
    productoStore.items.length === 0 ? productoStore.fetchAll() : Promise.resolve(),
    sucursalStore.items.length === 0 ? sucursalStore.fetchAll() : Promise.resolve(),
  ])
})
</script>

<template>
  <q-page class="sgi-page">
    <StandardTableToolbar
      title="Proveedores"
      subtitle="Gestión de proveedores y órdenes de compra"
      icon="local_shipping"
      primary-label="Nuevo Proveedor"
      primary-icon="add"
      :show-primary="true"
      :show-sucursal-selector="false"
    >
      <template #actions>
        <button
          type="button"
          class="std-toolbar__secondary"
          @click="dialogOrden = true"
        >
          <q-icon name="shopping_cart" size="18px" />
          <span>Nueva Orden</span>
        </button>
      </template>
    </StandardTableToolbar>

    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="sgi-tabs">
        <q-tab name="proveedores" icon="local_shipping" label="Proveedores" />
        <q-tab name="ordenes" icon="shopping_cart" label="Órdenes de Compra">
          <q-badge v-if="store.ordenesPendientes.length" color="warning" floating>
            {{ store.ordenesPendientes.length }}
          </q-badge>
        </q-tab>
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tabActivo" animated keep-alive>
        <!-- ── Tab Proveedores ───────────────────────────── -->
        <q-tab-panel name="proveedores" class="q-pa-none">
          <div class="q-pa-md">
            <StandardFilters
              v-model="busqueda"
              :total="totalProveedores"
              :filtered="proveedoresFiltrados.length"
              count-label="proveedores"
              search-placeholder="Buscar por nombre, RUC, ciudad o contacto…"
              @clear="limpiarFiltrosProveedor"
            >
              <template #extra>
                <q-btn
                  outline
                  color="primary"
                  icon="refresh"
                  label="Recargar"
                  no-caps
                  size="sm"
                  :loading="store.loading"
                  @click="store.fetchAll()"
                />
              </template>
            </StandardFilters>
          </div>

          <StandardTable
            :rows="proveedoresFiltrados"
            :columns="columnasProveedor"
            :loading="store.loading"
            no-data-label="No hay proveedores registrados"
            empty-icon="local_shipping"
            @row-click="(_, row) => abrirFormulario(row as Proveedor)"
          >
            <template #body-cell-activo="{ value }">
              <q-td auto-width>
                <span
                  class="std-status"
                  :class="value ? 'std-status--active' : 'std-status--inactive'"
                >
                  <q-icon
                    :name="value ? 'check_circle' : 'cancel'"
                    size="14px"
                  />
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
                    @click.stop="abrirFormulario(row as Proveedor)"
                  >
                    <q-tooltip>Editar</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="shopping_cart"
                    color="info"
                    size="sm"
                    @click.stop="nuevaOrdenPara(row as Proveedor)"
                  >
                    <q-tooltip>Nueva orden</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete_outline"
                    color="negative"
                    size="sm"
                    @click.stop="confirmarEliminar(row as Proveedor)"
                  >
                    <q-tooltip>Eliminar</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>
          </StandardTable>
        </q-tab-panel>

        <!-- ── Tab Órdenes ───────────────────────────────── -->
        <q-tab-panel name="ordenes" class="q-pa-none">
          <div class="q-pa-md">
            <StandardFilters
              :total="totalOrdenes"
              :filtered="ordenesFiltradas.length"
              count-label="órdenes"
              search-placeholder="Buscar…"
              :show-count="false"
              @clear="limpiarFiltrosOrden"
            >
              <template #extra>
                <q-select
                  v-model="filtroEstadoOrden"
                  :options="opcionesEstadoOrden"
                  label="Estado"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  class="std-filters__select"
                  style="min-width: 200px"
                />
                <q-btn
                  outline
                  color="primary"
                  icon="refresh"
                  label="Recargar"
                  no-caps
                  size="sm"
                  :loading="store.loading"
                  @click="cargarOrdenes"
                />
                <span class="text-caption text-muted q-ml-md">
                  {{ ordenesFiltradas.length }} de {{ totalOrdenes }} órdenes
                </span>
              </template>
            </StandardFilters>
          </div>

          <StandardTable
            :rows="ordenesFiltradas"
            :columns="columnasOrden"
            :loading="store.loading"
            no-data-label="No hay órdenes de compra"
            empty-icon="shopping_cart"
            :show-rows-per-page="true"
          >
            <template #body-cell-estado="{ value }">
              <q-td>
                <span
                  class="std-status"
                  :class="`std-status--${
                    (value as EstadoOrden) === 'PENDIENTE' ? 'warning' : (value as EstadoOrden) === 'COMPLETADA' ? 'active' : (value as EstadoOrden) === 'CANCELADA' ? 'inactive' : 'info'
                  }`"
                >
                  {{ labelEstado(value as EstadoOrden) }}
                </span>
              </q-td>
            </template>

            <template #body-cell-total="{ value }">
              <q-td class="text-right">
                <span class="text-mono text-weight-bold">{{ formatCurrency(value as number) }}</span>
              </q-td>
            </template>

            <template #body-cell-accionesOrden="{ row }">
              <q-td auto-width>
                <div class="std-cell-actions">
                  <q-btn
                    v-if="(row as OrdenCompra).estado === 'PENDIENTE' || (row as OrdenCompra).estado === 'PARCIAL'"
                    flat
                    round
                    dense
                    icon="inventory"
                    color="positive"
                    size="sm"
                    @click.stop="abrirRecepcion(row as OrdenCompra)"
                  >
                    <q-tooltip>Recibir mercancía</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="(row as OrdenCompra).estado !== 'COMPLETADA' && (row as OrdenCompra).estado !== 'CANCELADA'"
                    flat
                    round
                    dense
                    icon="cancel"
                    color="negative"
                    size="sm"
                    @click.stop="confirmarCancelacion(row as OrdenCompra)"
                  >
                    <q-tooltip>Cancelar orden</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>
          </StandardTable>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialogs -->
    <q-dialog v-model="dialogProveedor" persistent>
      <ProveedorForm :proveedor="proveedorEditar" @saved="onProveedorGuardado" />
    </q-dialog>

    <q-dialog v-model="dialogOrden" persistent>
      <OrdenCompraForm @saved="onOrdenGuardada" />
    </q-dialog>

    <q-dialog v-model="dialogRecepcion" persistent>
      <RecepcionForm :orden="ordenRecepcion" @saved="onRecepcionGuardada" />
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
  min-width: 200px;
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
</style>
