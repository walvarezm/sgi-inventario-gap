<template>
  <q-page class="sgi-page">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Proveedores</div>
        <div class="text-muted text-body2 q-mt-xs">
          Gestión de proveedores y órdenes de compra
        </div>
      </div>
      <q-space />
      <div class="row q-gutter-sm">
        <q-btn
          outline color="primary" icon="shopping_cart" label="Nueva Orden"
          @click="dialogOrden = true"
        />
        <q-btn
          color="primary" unelevated icon="add" label="Nuevo Proveedor"
          @click="abrirFormulario()"
        />
      </div>
    </div>

    <!-- Tabs: Proveedores | Órdenes -->
    <q-card class="sgi-card" flat>
      <q-tabs v-model="tabActivo" dense align="left" class="q-px-md q-pt-sm">
        <q-tab name="proveedores" icon="local_shipping" label="Proveedores" />
        <q-tab name="ordenes" icon="shopping_cart" label="Órdenes de Compra">
          <q-badge v-if="store.ordenesPendientes.length" color="warning" floating>
            {{ store.ordenesPendientes.length }}
          </q-badge>
        </q-tab>
      </q-tabs>
      <q-separator />

      <!-- ── Tab Proveedores ───────────────────────────── -->
      <q-tab-panel name="proveedores" class="q-pa-none">
        <!-- Filtros -->
        <div class="q-pa-md row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-4">
            <q-input v-model="busqueda" placeholder="Buscar por nombre, RUC o ciudad…"
              outlined dense clearable>
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <div class="col-auto">
            <q-btn flat round icon="refresh" color="primary" :loading="store.loading"
              @click="store.fetchAll()"><q-tooltip>Recargar</q-tooltip></q-btn>
          </div>
          <q-space />
          <div class="text-caption text-muted">{{ proveedoresFiltrados.length }} resultado(s)</div>
        </div>

        <q-table
          :rows="proveedoresFiltrados" :columns="columnasProveedor"
          :loading="store.loading" row-key="id" flat class="sgi-table"
          :pagination="{ rowsPerPage: 15 }"
          no-data-label="No hay proveedores registrados"
        >
          <template #body-cell-activo="{ value }">
            <q-td class="text-center">
              <q-chip dense size="sm"
                :color="value ? 'positive' : 'grey-4'"
                :text-color="value ? 'white' : 'grey-7'"
                :icon="value ? 'check_circle' : 'cancel'"
                :label="value ? 'Activo' : 'Inactivo'"
              />
            </q-td>
          </template>

          <template #body-cell-acciones="{ row }">
            <q-td class="text-right">
              <q-btn flat round dense icon="edit" color="primary" size="sm"
                @click="abrirFormulario(row)"><q-tooltip>Editar</q-tooltip></q-btn>
              <q-btn flat round dense icon="shopping_cart" color="teal" size="sm"
                @click="nuevaOrdenPara(row)"><q-tooltip>Nueva orden</q-tooltip></q-btn>
              <q-btn flat round dense icon="delete" color="negative" size="sm"
                @click="confirmarEliminar(row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
            </q-td>
          </template>

          <template #no-data="{ message }">
            <div class="full-width column flex-center q-pa-xl text-muted">
              <q-icon name="local_shipping" size="48px" style="opacity:0.3" class="q-mb-md" />
              <span>{{ message }}</span>
            </div>
          </template>
        </q-table>
      </q-tab-panel>

      <!-- ── Tab Órdenes ───────────────────────────────── -->
      <q-tab-panel name="ordenes" class="q-pa-none">
        <div class="q-pa-md row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-3">
            <q-select v-model="filtroEstadoOrden" :options="opcionesEstadoOrden"
              label="Estado" outlined dense emit-value map-options clearable />
          </div>
          <div class="col-auto">
            <q-btn flat round icon="refresh" color="primary" :loading="store.loading"
              @click="cargarOrdenes"><q-tooltip>Recargar</q-tooltip></q-btn>
          </div>
          <q-space />
          <div class="text-caption text-muted">{{ ordenesFiltradas.length }} órdenes</div>
        </div>

        <q-table
          :rows="ordenesFiltradas" :columns="columnasOrden"
          :loading="store.loading" row-key="id" flat class="sgi-table"
          :pagination="{ rowsPerPage: 15 }"
          no-data-label="No hay órdenes de compra"
        >
          <template #body-cell-estado="{ value }">
            <q-td>
              <q-chip dense size="sm"
                :color="colorEstado(value)" text-color="white"
                :label="labelEstado(value)"
              />
            </q-td>
          </template>

          <template #body-cell-total="{ value }">
            <q-td class="text-right text-weight-bold">{{ formatCurrency(value) }}</q-td>
          </template>

          <template #body-cell-accionesOrden="{ row }">
            <q-td class="text-right">
              <q-btn
                v-if="row.estado === 'PENDIENTE' || row.estado === 'PARCIAL'"
                flat round dense icon="inventory" color="positive" size="sm"
                @click="abrirRecepcion(row)"><q-tooltip>Recibir mercancía</q-tooltip></q-btn>
              <q-btn
                v-if="row.estado !== 'COMPLETADA' && row.estado !== 'CANCELADA'"
                flat round dense icon="cancel" color="negative" size="sm"
                @click="confirmarCancelacion(row)"><q-tooltip>Cancelar orden</q-tooltip></q-btn>
            </q-td>
          </template>

          <template #no-data="{ message }">
            <div class="full-width column flex-center q-pa-xl text-muted">
              <q-icon name="shopping_cart" size="48px" style="opacity:0.3" class="q-mb-md" />
              <span>{{ message }}</span>
            </div>
          </template>
        </q-table>
      </q-tab-panel>
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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Proveedor, OrdenCompra, EstadoOrden } from 'src/types'
import { ESTADO_ORDEN_LABELS, ESTADO_ORDEN_COLOR } from 'src/types'
import { useProveedorStore } from 'src/stores/proveedorStore'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useNotify } from 'src/composables/useNotify'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import ProveedorForm from 'src/components/proveedores/ProveedorForm.vue'
import OrdenCompraForm from 'src/components/ordenes/OrdenCompraForm.vue'
import RecepcionForm from 'src/components/ordenes/RecepcionForm.vue'

const store = useProveedorStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()

const tabActivo = ref('proveedores')
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
  return store.items.filter((p) =>
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

const opcionesEstadoOrden = [
  { label: 'Pendientes',    value: 'PENDIENTE' },
  { label: 'Parciales',     value: 'PARCIAL' },
  { label: 'Completadas',   value: 'COMPLETADA' },
  { label: 'Canceladas',    value: 'CANCELADA' },
]

const columnasProveedor: QTableColumn[] = [
  { name: 'nombre',   label: 'Nombre',   field: 'nombre',   align: 'left',  sortable: true },
  { name: 'rucNit',   label: 'RUC/NIT',  field: 'rucNit',   align: 'left' },
  { name: 'contacto', label: 'Contacto', field: 'contacto', align: 'left' },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', align: 'left' },
  { name: 'ciudad',   label: 'Ciudad',   field: 'ciudad',   align: 'left',  sortable: true },
  { name: 'email',    label: 'Email',    field: 'email',    align: 'left' },
  { name: 'activo',   label: 'Estado',   field: 'activo',   align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'id',       align: 'right' },
]

const columnasOrden: QTableColumn[] = [
  { name: 'numero',          label: 'N° Orden',    field: 'numero',          align: 'left',  sortable: true },
  { name: 'proveedorNombre', label: 'Proveedor',   field: 'proveedorNombre', align: 'left',  sortable: true },
  { name: 'sucursalId',      label: 'Sucursal',    field: 'sucursalId',
    align: 'left', format: (v) => sucursalStore.getById(v)?.nombre ?? v },
  { name: 'fechaEmision',    label: 'Fecha',       field: 'fechaEmision',
    align: 'left', format: (v) => formatDate(v) },
  { name: 'estado',          label: 'Estado',      field: 'estado',          align: 'left',  sortable: true },
  { name: 'total',           label: 'Total',       field: 'total',           align: 'right', sortable: true },
  { name: 'accionesOrden',   label: 'Acciones',    field: 'id',              align: 'right' },
]

function colorEstado(estado: EstadoOrden): string { return ESTADO_ORDEN_COLOR[estado] ?? 'grey' }
function labelEstado(estado: EstadoOrden): string { return ESTADO_ORDEN_LABELS[estado] ?? estado }

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
  } catch (e) { notifyError((e as Error).message) }
}

function onProveedorGuardado(_p: Proveedor): void { dialogProveedor.value = false }
function onOrdenGuardada(_o: OrdenCompra): void { dialogOrden.value = false; void cargarOrdenes() }
function onRecepcionGuardada(_o: OrdenCompra): void { dialogRecepcion.value = false; void cargarOrdenes() }

function confirmarEliminar(p: Proveedor): void {
  $q.dialog({
    title: 'Eliminar proveedor',
    message: `¿Eliminar <strong>${p.nombre}</strong>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await store.remove(p.id)
      notifySuccess(`Proveedor "${p.nombre}" eliminado`)
    } catch (e) { notifyError((e as Error).message) }
  })
}

function confirmarCancelacion(o: OrdenCompra): void {
  $q.dialog({
    title: 'Cancelar orden',
    message: `¿Cancelar la orden <strong>${o.numero}</strong>?`,
    html: true,
    cancel: { label: 'No', flat: true },
    ok: { label: 'Sí, cancelar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await store.cancelarOrden(o.id)
      notifySuccess(`Orden ${o.numero} cancelada`)
    } catch (e) { notifyError((e as Error).message) }
  })
}

async function cargarOrdenes(): Promise<void> {
  await store.fetchOrdenes()
}

onMounted(async () => {
  await Promise.all([
    store.fetchAll(),
    store.fetchOrdenes(),
    productoStore.items.length === 0 ? productoStore.fetchAll() : Promise.resolve(),
    sucursalStore.items.length === 0 ? sucursalStore.fetchAll() : Promise.resolve(),
  ])
})

// Import necesario para abrirRecepcion
import { proveedorService } from 'src/services/proveedorService'
</script>
