<template>
  <q-card class="sgi-card catalogo-edit-card" style="width: 760px; max-width: 96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">Editar desde catálogo</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-md-6">
            <q-input v-model="form.sku" label="SKU" outlined dense disable />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="form.marca" label="Marca" outlined dense disable />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.nombre"
              label="Nombre del producto *"
              outlined
              dense
              type="textarea"
              :rules="[required, minLength(3)]"
              :autogrow="true"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.descripcion"
              label="Descripción"
              outlined
              dense
              type="textarea"
              :autogrow="true"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <div class="text-subtitle2 text-weight-bold q-mb-xs">Precios (Bs.)</div>
          </div>

          <div class="col-12 col-md-4 col-sm-6">
            <q-input
              v-model.number="form.precioCompra"
              label="Precio compra"
              :outlined="true"
              dense
              type="number"
              input-class="text-left"
              prefix="Bs."
              :rules="[required, nonNegativeNumber]"
            />
          </div>
          <div class="col-12 col-md-4 col-sm-6">
            <q-input
              v-model.number="form.precioOfrecido"
              label="Precio Venta"
              outlined
              dense
              type="number"
              prefix="Bs."
              :rules="[nonNegativeNumber]"
            />
          </div>
          <div class="col-12 col-md-4 col-sm-6">
            <q-input
              v-model.number="form.precioFinal"
              label="Precio final *"
              outlined
              dense
              type="number"
              prefix="Bs."
              :rules="[required, positiveNumber]"
            />
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md catalogo-edit-card__actions">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Guardar cambios"
        color="primary"
        unelevated
        :loading="productoStore.saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { QForm, useQuasar } from 'quasar'
import type { Producto, ProductoCatalogo } from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import { minLength, nonNegativeNumber, positiveNumber, required } from 'src/utils/validators'
import { useProductoStore } from 'src/stores/productoStore'
const $q = useQuasar()

const esMovil = computed(() => $q.screen.lt.md)

interface Props {
  producto: ProductoCatalogo | null
}

interface CatalogoEditableForm {
  sku: string
  marca: string
  nombre: string
  descripcion: string
  precioCompra: number
  precioOfrecido: number
  precioFinal: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [producto: Producto]; cancelled: [] }>()
const productoStore = useProductoStore()
const { notifyError, notifySuccess } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)

const form = ref<CatalogoEditableForm>({
  sku: '',
  marca: '',
  nombre: '',
  descripcion: '',
  precioCompra: 0,
  precioOfrecido: 0,
  precioFinal: 0,
})

watch(
  () => props.producto,
  (producto) => {
    form.value = producto
      ? {
          sku: producto.sku,
          marca: producto.marca,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          precioCompra: Number(producto.precioCompra) || 0,
          precioOfrecido: Number(producto.precioOfrecido) || 0,
          precioFinal: Number(producto.precioFinal) || 0,
        }
      : {
          sku: '',
          marca: '',
          nombre: '',
          descripcion: '',
          precioCompra: 0,
          precioOfrecido: 0,
          precioFinal: 0,
        }
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !props.producto) return

  try {
    const actualizado = await productoStore.update(props.producto.id, {
      nombre: form.value.nombre,
      descripcion: form.value.descripcion,
      precioCompra: form.value.precioCompra,
      precioOfrecido: form.value.precioOfrecido,
      precioFinal: form.value.precioFinal,
    })
    notifySuccess(`Producto "${actualizado.nombre}" actualizado`)
    emit('saved', actualizado)
  } catch (e) {
    notifyError((e as Error).message)
  }
}
</script>

<style scoped lang="scss">
.catalogo-edit-card__actions {
  gap: 8px;
}

@media (max-width: 600px) {
  .catalogo-edit-card__actions :deep(.q-btn) {
    width: 100%;
  }
}
</style>
