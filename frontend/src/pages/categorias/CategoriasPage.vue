<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import type { QTableColumn } from 'quasar'
import type { Categoria } from 'src/types'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useAuthStore } from 'src/stores/authStore'
import { useNotify } from 'src/composables/useNotify'
import CategoriaForm from 'src/components/categorias/CategoriaForm.vue'
import StandardTableToolbar from 'src/components/shared/StandardTableToolbar.vue'
import StandardFilters from 'src/components/shared/StandardFilters.vue'
import StandardTable from 'src/components/shared/StandardTable.vue'

const store = useCategoriaStore()
const authStore = useAuthStore()
const { notifySuccess, notifyError } = useNotify()
const $q = useQuasar()

const busqueda = ref('')
const filtroActivo = ref<boolean | null>(null)
const dialogForm = ref(false)
const categoriaEditar = ref<Categoria | null>(null)

const itemsFiltrados = computed(() => {
  let lista = store.items
  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase()
    lista = lista.filter((c) => c.nombre.toLowerCase().includes(q))
  }
  if (filtroActivo.value !== null) lista = lista.filter((c) => c.activo === filtroActivo.value)
  return lista
})

const totalCategorias = computed(() => store.items.length)

const opcionesEstado = [
  { label: 'Activas', value: true },
  { label: 'Inactivas', value: false },
]

const columnas: QTableColumn<Categoria>[] = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center', sortable: true },
  { name: 'acciones', label: '', field: 'id', align: 'right' },
]

function abrirFormulario(categoria?: Categoria): void {
  categoriaEditar.value = categoria ?? null
  dialogForm.value = true
}

function onSaved(_categoria: Categoria): void {
  dialogForm.value = false
}

function confirmarEliminar(categoria: Categoria): void {
  $q.dialog({
    title: 'Eliminar categoría',
    message: `¿Eliminar permanentemente la categoría <strong>${categoria.nombre}</strong>? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
  }).onOk(async () => {
    try {
      await store.remove(categoria.id)
      notifySuccess(`Categoría "${categoria.nombre}" eliminada`)
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
      title="Categorías"
      subtitle="Gestión de categorías de productos"
      icon="category"
      primary-label="Nueva categoría"
      primary-icon="add"
      :show-primary="authStore.can('productos.crear')"
      :show-sucursal-selector="false"
      search-placeholder="Buscar por nombre…"
      @primary="abrirFormulario()"
    >
      <StandardFilters
        v-model="busqueda"
        :total="totalCategorias"
        :filtered="itemsFiltrados.length"
        count-label="categorías"
        placeholder="Buscar por nombre…"
        :loading="false"
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
      :rows="itemsFiltrados"
      :columns="columnas"
      :loading="store.loading"
      no-data-label="No hay categorías registradas"
      empty-icon="category"
      @row-click="(_, row) => abrirFormulario(row as Categoria)"
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
          <div class="std-cell-actions">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              size="sm"
              @click.stop="abrirFormulario(row as Categoria)"
            >
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              size="sm"
              @click.stop="confirmarEliminar(row as Categoria)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </StandardTable>

    <q-dialog v-model="dialogForm" persistent>
      <CategoriaForm :categoria="categoriaEditar" @saved="onSaved" @cancelled="dialogForm = false" />
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
@use 'src/css/_table-shared.scss' as *;

.std-filters__select {
  min-width: 180px;
}
</style>
