<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Sucursales</div>
        <div class="text-muted text-body2 q-mt-xs">Gestión de sucursales y bodegas</div>
      </div>
      <q-space />
      <q-btn label="Nueva sucursal" icon="add" color="primary" unelevated @click="abrirFormulario()" />
    </div>

    <q-card class="sgi-card q-mb-md" flat>
      <q-card-section class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-4">
          <q-input v-model="busqueda" placeholder="Buscar por nombre o ciudad…" outlined dense clearable>
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-select
            v-model="filtroActivo" :options="opcionesEstado" label="Estado"
            outlined dense emit-value map-options clearable
          />
        </div>
        <div class="col-auto">
          <q-btn flat round icon="refresh" color="primary" :loading="store.loading" @click="store.fetchAll()">
            <q-tooltip>Recargar</q-tooltip>
          </q-btn>
        </div>
        <q-space />
        <div class="text-caption text-muted">{{ sucursalesFiltradas.length }} resultado(s)</div>
      </q-card-section>
    </q-card>

    <q-card class="sgi-card" flat>
      <q-table
        :rows="sucursalesFiltradas" :columns="columnas" :loading="store.loading"
        row-key="id" flat class="sgi-table" :pagination="{ rowsPerPage: 15 }"
        no-data-label="No hay sucursales registradas" loading-label="Cargando sucursales…"
      >
        <template #body-cell-activo="{ value }">
          <q-td>
            <q-chip
              :color="value ? 'positive' : 'grey-4'" :text-color="value ? 'white' : 'grey-7'"
              :icon="value ? 'check_circle' : 'cancel'" :label="value ? 'Activa' : 'Inactiva'"
              dense size="sm"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-right">
            <q-btn flat round dense icon="edit" color="primary" size="sm" @click="abrirFormulario(row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat round dense :icon="row.activo ? 'toggle_on' : 'toggle_off'" :color="row.activo ? 'positive' : 'grey'" size="sm" @click="confirmarToggle(row)">
              <q-tooltip>{{ row.activo ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmarEliminar(row)">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data="{ message }">
          <div class="full-width column flex-center q-pa-xl text-muted">
            <q-icon name="store_mall_directory" size="48px" class="q-mb-md" style="opacity:0.3" />
            <span>{{ message }}</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogForm" persistent>
      <SucursalForm :sucursal="sucursalEditar" @saved="onSaved" @cancelled="dialogForm = false" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Sucursal } from 'src/types'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useNotify } from 'src/composables/useNotify'
import SucursalForm from 'src/components/sucursales/SucursalForm.vue'

const store = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()
const busqueda = ref('')
const filtroActivo = ref<boolean | null>(null)
const dialogForm = ref(false)
const sucursalEditar = ref<Sucursal | null>(null)

const sucursalesFiltradas = computed(() => {
  let lista = store.items
  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase()
    lista = lista.filter((s) =>
      s.nombre.toLowerCase().includes(q) ||
      s.ciudad.toLowerCase().includes(q) ||
      s.direccion.toLowerCase().includes(q),
    )
  }
  if (filtroActivo.value !== null) lista = lista.filter((s) => s.activo === filtroActivo.value)
  return lista
})

const opcionesEstado = [{ label: 'Activas', value: true }, { label: 'Inactivas', value: false }]

const columnas: QTableColumn[] = [
  { name: 'nombre',    label: 'Nombre',    field: 'nombre',    align: 'left', sortable: true },
  { name: 'ciudad',    label: 'Ciudad',    field: 'ciudad',    align: 'left', sortable: true },
  { name: 'direccion', label: 'Dirección', field: 'direccion', align: 'left' },
  { name: 'telefono',  label: 'Teléfono',  field: 'telefono',  align: 'left' },
  { name: 'email',     label: 'Email',     field: 'email',     align: 'left' },
  { name: 'activo',    label: 'Estado',    field: 'activo',    align: 'center', sortable: true },
  { name: 'acciones',  label: 'Acciones',  field: 'id',        align: 'right' },
]

function abrirFormulario(sucursal?: Sucursal): void {
  sucursalEditar.value = sucursal ?? null
  dialogForm.value = true
}
function onSaved(_sucursal: Sucursal): void { dialogForm.value = false }

function confirmarToggle(sucursal: Sucursal): void {
  const accion = sucursal.activo ? 'desactivar' : 'activar'
  $q.dialog({
    title: 'Confirmar',
    message: `¿Deseas ${accion} la sucursal <strong>${sucursal.nombre}</strong>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: sucursal.activo ? 'Desactivar' : 'Activar', color: sucursal.activo ? 'warning' : 'positive', unelevated: true },
  }).onOk(async () => {
    try {
      await store.toggleActivo(sucursal.id)
      notifySuccess(`Sucursal ${sucursal.activo ? 'desactivada' : 'activada'}: ${sucursal.nombre}`)
    } catch (e) { notifyError((e as Error).message) }
  })
}

function confirmarEliminar(sucursal: Sucursal): void {
  $q.dialog({
    title: 'Eliminar sucursal',
    message: `¿Eliminar permanentemente <strong>${sucursal.nombre}</strong>? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await store.remove(sucursal.id)
      notifySuccess(`Sucursal "${sucursal.nombre}" eliminada`)
    } catch (e) { notifyError((e as Error).message) }
  })
}

onMounted(() => store.fetchAll())
</script>
