<template>
  <q-page class="sgi-page">
    <div class="row items-center q-mb-lg">
      <div>
        <div class="sgi-page-title">Marcas</div>
        <div class="text-muted text-body2 q-mt-xs">Gestión de marcas de productos</div>
      </div>
      <q-space />
      <q-btn
        v-if="authStore.can('productos.crear')"
        label="Nueva marca"
        icon="add"
        color="primary"
        unelevated
        @click="abrirFormulario()"
      />
    </div>

    <q-card class="sgi-card q-mb-md" flat>
      <q-expansion-item
        icon="tune"
        label="Filtros y búsqueda"
        caption="Encuentra marcas por nombre o estado"
        expand-separator
        :default-opened="!esMovil"
        header-class="sgi-filter-toggle"
      >
        <q-card-section class="row items-center q-col-gutter-sm sgi-filter-body">
          <div class="col-12 col-sm-4">
            <q-input v-model="busqueda" placeholder="Buscar por nombre…" outlined dense clearable>
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-3">
            <q-select
              v-model="filtroActivo"
              :options="opcionesEstado"
              label="Estado"
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
              :loading="store.loading"
              @click="store.fetchAll()"
            >
              <q-tooltip>Recargar</q-tooltip>
            </q-btn>
          </div>
          <q-space />
          <div class="text-caption text-muted">{{ itemsFiltrados.length }} resultado(s)</div>
        </q-card-section>
      </q-expansion-item>
    </q-card>

    <q-card class="sgi-card" flat>
      <q-table
        :rows="itemsFiltrados"
        :columns="columnas"
        :loading="store.loading"
        row-key="id"
        flat
        dense
        class="sgi-table"
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="No hay marcas registradas"
        loading-label="Cargando marcas…"
      >
<!--        <template #body-cell-nombre="{ row }">
          <q-td>
            {{ row.id }}
            <span class="text-muted text-caption q-mr-md"> [{{ row.id }}]</span>
          </q-td>
        </template>-->

        <template #body-cell-activo="{ value }">
          <q-td>
            <q-chip
              :color="value ? 'positive' : 'grey-4'"
              :text-color="value ? 'white' : 'grey-7'"
              :icon="value ? 'check_circle' : 'cancel'"
              :label="value ? 'Activa' : 'Inactiva'"
              :dense="false"
              size="md"
            />
          </q-td>
        </template>

        <template #body-cell-acciones="{ row }">
          <q-td class="text-right">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              size="sm"
              @click="abrirFormulario(row)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              size="sm"
              @click="confirmarEliminar(row)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data="{ message }">
          <div class="full-width column flex-center q-pa-xl text-muted">
            <q-icon name="copyright" size="48px" class="q-mb-md" style="opacity: 0.3" />
            <span>{{ message }}</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogForm" persistent>
      <MarcaForm :marca="marcaEditar" @saved="onSaved" @cancelled="dialogForm = false" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Marca } from 'src/types'
import { useMarcaStore } from 'src/stores/marcaStore'
import { useAuthStore } from 'src/stores/authStore'
import { useNotify } from 'src/composables/useNotify'
import MarcaForm from 'src/components/marcas/MarcaForm.vue'

const store = useMarcaStore()
const authStore = useAuthStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()
const esMovil = computed(() => $q.screen.lt.md)
const busqueda = ref('')
const filtroActivo = ref<boolean | null>(null)
const dialogForm = ref(false)
const marcaEditar = ref<Marca | null>(null)

const itemsFiltrados = computed(() => {
  let lista = store.items
  if (busqueda.value) {
    const q = busqueda.value.toLowerCase()
    lista = lista.filter((m) => m.nombre.toLowerCase().includes(q))
  }
  if (filtroActivo.value !== null) lista = lista.filter((m) => m.activo === filtroActivo.value)
  return lista
})

const opcionesEstado = [
  { label: 'Activas', value: true },
  { label: 'Inactivas', value: false },
]

const columnas: QTableColumn[] = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: false },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', field: 'id', align: 'right' },
]

function abrirFormulario(marca?: Marca): void {
  marcaEditar.value = marca ?? null
  dialogForm.value = true
}

function onSaved(_marca: Marca): void {
  dialogForm.value = false
}

function confirmarEliminar(marca: Marca): void {
  $q.dialog({
    title: 'Eliminar marca',
    message: `¿Eliminar permanentemente la marca <strong>${marca.nombre}</strong>? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await store.remove(marca.id)
      notifySuccess(`Marca "${marca.nombre}" eliminada`)
    } catch (e) {
      notifyError((e as Error).message)
    }
  })
}

onMounted(() => store.fetchAll())
</script>
