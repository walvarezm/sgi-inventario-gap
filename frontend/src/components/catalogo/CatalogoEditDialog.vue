<template>
  <q-card class="sgi-card catalogo-edit-card" style="width: 760px; max-width: 96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">Editar Producto</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      {{ form.id }} - {{ form.sucursalId }}
      <q-form ref="formRef" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-md-6">
            <q-input v-model="form.sku" label="Código" outlined dense disable />
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
              step="0.01"
              input-class="text-right"
              prefix=""
              autofocus
              :rules="[required, nonNegativeNumber]"
              @focus="seleccionarTexto"
              @blur="setInputFocusRef(formPrecioOfrecidoRef)"
            />
          </div>
          <div class="col-12 col-md-4 col-sm-6">
            <q-input
              ref="formPrecioOfrecidoRef"
              v-model.number="form.precioOfrecido"
              label="Precio Venta"
              outlined
              dense
              type="number"
              step="0.01"
              input-class="text-right"
              prefix=""
              :rules="[nonNegativeNumber]"
              @focus="seleccionarTextoRef(formPrecioOfrecidoRef)"
              @blur="setInputFocusRef(formPrecioFinalRef)"
            />
          </div>
          <div class="col-12 col-md-4 col-sm-6">
            <q-input
              ref="formPrecioFinalRef"
              v-model.number="form.precioFinal"
              label="Precio final"
              outlined
              dense
              type="number"
              step="0.01"
              input-class="text-right"
              prefix=""
              :rules="[nonNegativeNumber]"
              @focus="seleccionarTexto"
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
import { ref, watch } from 'vue'
import { QForm } from 'quasar'
import { inventarioService } from 'src/services/inventarioService'
import type { Producto, ProductoCatalogo, ProductoForm } from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import {
  minLength,
  nonNegativeNumber,
  required,
  seleccionarTexto,
  seleccionarTextoRef,
  setInputFocusRef,
} from 'src/utils/validators'
import { useProductoStore } from 'src/stores/productoStore'

interface Props {
  producto: ProductoCatalogo | null
}

interface CatalogoEditableForm {
  id: string
  sku: string
  marca: string
  nombre: string
  descripcion: string
  precioCompra: number
  precioOfrecido: number
  precioFinal: number
  sucursalId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [producto: Producto | null]; cancelled: [] }>()
const productoStore = useProductoStore()
const { notifyError, notifySuccess } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const formPrecioOfrecidoRef = ref(null)
const formPrecioFinalRef = ref(null)

const form = ref<CatalogoEditableForm>({
  id: '',
  sku: '',
  marca: '',
  nombre: '',
  descripcion: '',
  precioCompra: 0,
  precioOfrecido: 0,
  precioFinal: 0,
  sucursalId: '',
})

watch(
  () => props.producto,
  (producto) => {
    form.value = producto
      ? {
          id: producto.id,
          sku: producto.sku,
          marca: producto.marca,
          nombre: producto.nombre,
          descripcion: producto.descripcion || '',
          precioCompra: Number(producto.precioCompra) || 0,
          precioOfrecido: Number(producto.precioOfrecido) || 0,
          precioFinal: Number(producto.precioFinal) || 0,
          sucursalId: producto.sucursalId || '',
        }
      : {
          id: '',
          sku: '',
          marca: '',
          nombre: '',
          descripcion: '',
          precioCompra: 0,
          precioOfrecido: 0,
          precioFinal: 0,
          sucursalId: '',
        }
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !props.producto) return

  try {
    if (props.producto.precioUsaBase) {
      const actualizado = await productoStore.update(props.producto.id, {
        nombre: form.value.nombre,
        descripcion: form.value.descripcion,
        precioCompra: form.value.precioCompra,
        precioOfrecido: form.value.precioOfrecido,
        precioFinal: form.value.precioFinal,
      })
      notifySuccess(`Producto "${actualizado.nombre}" actualizado`)
      emit('saved', actualizado)
    } else {
      const actualizado = await inventarioService.updatePreciosSucursal({
        productoId: props.producto.id,
        sucursalId: props.producto.sucursalId,
        precioOfrecido: form.value.precioOfrecido,
        precioFinal: form.value.precioFinal,
        precioUsaBase: props.producto.precioUsaBase,
      })
      notifySuccess(`Producto de Inventario "${actualizado.productoId}" actualizado`)
      emit('saved', null)
    }
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
