<template>
  <q-card class="sgi-card" style="min-width: 400px; max-width: 540px; width: 100%">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">Detalle de Producto</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-sm-6">
          <q-input :model-value="row.sku" label="Código" outlined dense disable />
        </div>
        <div class="col-12 col-sm-6">
          <q-input :model-value="row.marca" label="Marca" outlined dense disable />
        </div>
        <div class="col-12">
          <q-input :model-value="row.nombre" label="Producto" outlined dense disable />
        </div>
        <div class="col-12 col-sm-6">
          <q-input
            :model-value="categoriaNombre"
            label="Categoría"
            outlined dense disable
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-input :model-value="String(row.stockActual)" label="Stock actual" outlined dense disable>
            <template #append>
              <q-chip
                v-if="row.stockBajo"
                dense size="sm" color="orange-2" text-color="orange-9"
                icon="warning" label="Stock bajo"
              />
              <q-chip
                v-else
                dense size="sm" color="green-2" text-color="green-9"
                icon="check_circle" label="Disponible"
              />
            </template>
          </q-input>
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle2 text-weight-bold">Precios en esta sucursal (Bs.)</div>
        <q-space />
        <q-chip
          dense outline size="sm"
          :color="form.precioUsaBase ? 'info' : 'warning'"
          :icon="form.precioUsaBase ? 'sync' : 'edit'"
          :label="form.precioUsaBase ? 'Sincronizado con producto base' : 'Precio independiente'"
        />
      </div>

      <q-form ref="formRef" @submit.prevent="handleSubmit" class="row q-col-gutter-sm">
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="form.precioOfrecido"
            label="Precio ofrecido (lista)"
            outlined dense type="number" step="0.01"
            input-class="text-right"
            :disable="!canEdit"
            :rules="[nonNegativeNumber]"
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="form.precioFinal"
            label="Precio final (venta)"
            outlined dense type="number" step="0.01"
            input-class="text-right text-weight-bold"
            :disable="!canEdit"
            :rules="[nonNegativeNumber]"
          >
            <template #append>
              <q-icon v-if="row.fechaPrecio" name="info" size="sm">
                <q-tooltip>Última actualización: {{ row.fechaPrecio }}</q-tooltip>
              </q-icon>
            </template>
          </q-input>
        </div>

        <div class="col-12">
          <q-toggle
            v-if="canEdit && !form.precioUsaBase"
            v-model="form.vincularBase"
            label="Vincular al precio del producto base (sobrescribe los precios al guardar)"
            color="primary"
            icon="link"
            dense
          />
        </div>

        <div v-if="!canEdit" class="col-12 text-caption text-grey-7">
          No tienes permisos para editar precios
        </div>

        <q-card-actions class="col-12 justify-end q-px-none q-pb-none q-gutter-sm">
          <q-btn label="Cerrar" color="negative" flat v-close-popup />
          <q-btn
            v-if="canEdit"
            label="Guardar cambios"
            color="primary"
            unelevated
            :loading="saving"
            @click="handleSubmit"
          />
        </q-card-actions>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { QForm } from 'quasar'
import { inventarioService } from 'src/services/inventarioService'
import { productoService } from 'src/services/productoService'
import { useAuthStore } from 'src/stores/authStore'
import { useCategoriaStore } from 'src/stores/categoriaStore.ts'
import { useNotify } from 'src/composables/useNotify'
import { nonNegativeNumber } from 'src/utils/validators'
import type { InventarioRow } from 'src/types'

interface Props {
  row: InventarioRow | null
}
const props = defineProps<Props>()
const emit = defineEmits<{ saved: [] }>()

const authStore = useAuthStore()
const categoriaStore = useCategoriaStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const saving = ref(false)

const canEdit = computed(() => authStore.can('productos.editar') || authStore.can('inventario.editar'))

const categoriaNombre = computed(() => {
  if (!props.row?.categoriaId) return '—'
  return categoriaStore.getById(props.row.categoriaId)?.nombre || props.row.categoriaId
})

interface FormState {
  precioOfrecido: number
  precioFinal: number
  precioUsaBase: boolean
  vincularBase: boolean
}

const defaultForm = (): FormState => ({
  precioOfrecido: 0,
  precioFinal: 0,
  precioUsaBase: true,
  vincularBase: false,
})
const form = ref<FormState>(defaultForm())

watch(
  () => props.row,
  (r) => {
    if (!r) {
      form.value = defaultForm()
      return
    }
    form.value = {
      precioOfrecido: Number(r.precioOfrecido) || 0,
      precioFinal: Number(r.precioFinal) || 0,
      precioUsaBase: r.precioUsaBase,
      vincularBase: false,
    }
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !props.row) return

  saving.value = true
  try {
    const { precioOfrecido, precioFinal, precioUsaBase, vincularBase } = form.value

    if (precioUsaBase && !vincularBase) {
      await productoService.update(props.row.productoId, {
        nombre: props.row.nombre,
        precioOfrecido,
        precioFinal,
      })
      notifySuccess(`Producto "${props.row.nombre}" actualizado`)
    } else {
      await inventarioService.updatePreciosSucursal({
        productoId: props.row.productoId,
        sucursalId: props.row.sucursalId,
        precioOfrecido,
        precioFinal,
        precioUsaBase,
      })
      notifySuccess(`Precios actualizados para "${props.row.nombre}" en la sucursal`)
    }
    emit('saved')
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    saving.value = false
  }
}
</script>
