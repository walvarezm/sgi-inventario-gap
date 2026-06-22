<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Sucursal } from 'src/types'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useAuthStore } from 'src/stores/authStore'
import { useNotify } from 'src/composables/useNotify'
import SucursalForm from 'src/components/sucursales/SucursalForm.vue'
import StandardTableToolbar from 'src/components/shared/StandardTableToolbar.vue'
import StandardFilters from 'src/components/shared/StandardFilters.vue'
import StandardTable from 'src/components/shared/StandardTable.vue'

const store = useSucursalStore()
const authStore = useAuthStore()
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
    lista = lista.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        s.ciudad.toLowerCase().includes(q) ||
        s.direccion.toLowerCase().includes(q),
    )
  }
  if (filtroActivo.value !== null) lista = lista.filter((s) => s.activo === filtroActivo.value)
  return lista
})

const opcionesEstado = [
  { label: 'Activas', value: true },
  { label: 'Inactivas', value: false },
]

const totalSucursales = computed(() => store.items.length)

const columnas: QTableColumn<Sucursal>[] = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'ciudad', label: 'Ciudad', field: 'ciudad', align: 'left', sortable: true },
  { name: 'direccion', label: 'Dirección', field: 'direccion', align: 'left' },
  { name: 'telefono', label: 'Teléfono', field: 'telefono', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: '', field: 'id', align: 'right' },
]

function abrirFormulario(sucursal?: Sucursal): void {
  sucursalEditar.value = sucursal ?? null
  dialogForm.value = true
}
function onSaved(_sucursal: Sucursal): void {
  dialogForm.value = false
}

function confirmarToggle(sucursal: Sucursal): void {
  const accion = sucursal.activo ? 'desactivar' : 'activar'
  $q.dialog({
    title: 'Confirmar',
    message: `¿Deseas ${accion} la sucursal <strong>${sucursal.nombre}</strong>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: {
      label: sucursal.activo ? 'Desactivar' : 'Activar',
      color: sucursal.activo ? 'warning' : 'positive',
      unelevated: true,
      noCaps: true,
    },
  }).onOk(async () => {
    try {
      await store.toggleActivo(sucursal.id)
      notifySuccess(`Sucursal ${sucursal.activo ? 'desactivada' : 'activada'}: ${sucursal.nombre}`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

function confirmarEliminar(sucursal: Sucursal): void {
  $q.dialog({
    title: 'Eliminar sucursal',
    message: `¿Eliminar permanentemente <strong>${sucursal.nombre}</strong>? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(async () => {
    try {
      await store.remove(sucursal.id)
      notifySuccess(`Sucursal "${sucursal.nombre}" eliminada`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

function limpiarFiltros(): void {
  busqueda.value = ''
  filtroActivo.value = null
}

onMounted(() => store.fetchAll())
</script>

<template>
  <q-page class="sgi-page">
    <StandardTableToolbar
      v-model:search="busqueda"
      title="Sucursales"
      subtitle="Gestión de sucursales y bodegas"
      icon="store"
      primary-label="Nueva sucursal"
      primary-icon="add"
      :show-primary="authStore.can('sucursales.crear')"
      :primary-disabled="store.loading"
      :primary-loading="store.loading"
      :show-sucursal-selector="false"
      search-placeholder="Buscar por nombre, ciudad o dirección…"
      @primary="abrirFormulario()"
    >
      <StandardFilters
        v-model="busqueda"
        :total="totalSucursales"
        :filtered="sucursalesFiltradas.length"
        count-label="sucursales"
        placeholder="Buscar por nombre, ciudad o dirección…"
        @clear="limpiarFiltros"
      >
        <template #extra>
          <q-select
            v-model="filtroActivo"
            :options="opcionesEstado"
            label="Estado"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="std-filters__select"
            style="min-width: 180px"
          />
          <q-btn

            color="primary"
            icon="refresh"
            label="Recargar"
            no-caps
            size="md"
            :loading="store.loading"
            @click="store.fetchAll(true)"
          />
        </template>
      </StandardFilters>
    </StandardTableToolbar>

    <StandardTable
      :rows="sucursalesFiltradas"
      :columns="columnas"
      :loading="store.loading"
      no-data-label="No hay sucursales registradas"
      empty-icon="store_mall_directory"
      @row-click="(_, row) => abrirFormulario(row as Sucursal)"
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
            {{ value ? 'Activa' : 'Inactiva' }}
          </span>
        </q-td>
      </template>

      <template #body-cell-acciones="{ row }">
        <q-td auto-width>
          <div class="row justify-end q-gutter-xs no-wrap">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              size="sm"
              @click.stop="abrirFormulario(row)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              v-if="authStore.can('sucursales.editar')"
              flat
              round
              dense
              :icon="row.activo ? 'toggle_on' : 'toggle_off'"
              :color="row.activo ? 'positive' : 'grey'"
              size="sm"
              @click.stop="confirmarToggle(row)"
            >
              <q-tooltip>{{ row.activo ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="authStore.can('sucursales.eliminar')"
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              size="sm"
              @click.stop="confirmarEliminar(row)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </StandardTable>

    <q-dialog v-model="dialogForm" persistent>
      <SucursalForm :sucursal="sucursalEditar" @saved="onSaved" @cancelled="dialogForm = false" />
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
@use 'src/css/_table-shared.scss' as *;

.std-filters__select {
  min-width: 180px;
}
</style>
