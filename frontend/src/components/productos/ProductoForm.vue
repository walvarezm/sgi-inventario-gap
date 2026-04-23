<template>
  <q-card class="sgi-card" style="width:900px; max-width:96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">{{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-md">

          <!-- Columna izquierda: imagen + QR -->
          <div class="col-12 col-md-4">
            <div class="text-subtitle2 text-weight-bold q-mb-sm">Imagen</div>
            <ProductoImagen v-model="form.imagenUrl" :producto-id="editId" />

            <q-separator class="q-my-md" />

            <div class="text-subtitle2 text-weight-bold q-mb-sm">Código QR</div>
            <ProductoQR :sku="form.sku" :qr-code="form.qrCode" />
            <q-input
              v-model="form.qrCode" label="Contenido del QR" outlined dense class="q-mt-sm"
              hint="Vacío = usa el SKU automáticamente"
            />
          </div>

          <!-- Columna derecha: datos -->
          <div class="col-12 col-md-8">
            <div class="row q-col-gutter-sm">

              <div class="col-6">
                <q-input
                  v-model="form.sku" label="SKU *" outlined dense
                  :rules="[required, skuFormat]" hint="Código único" :disable="isEdit"
                />
              </div>
              <div class="col-6">
                <q-input v-model="form.marca" label="Marca / Fabricante" outlined dense />
              </div>

              <div class="col-12">
                <q-input
                  v-model="form.nombre" label="Nombre del producto *"
                  outlined dense :rules="[required, minLength(3)]"
                />
              </div>

              <div class="col-12">
                <q-input
                  v-model="form.descripcion" label="Descripción" outlined dense
                  type="textarea" rows="2" autogrow
                />
              </div>

              <div class="col-6">
                <q-select
                  v-model="form.categoriaId"
                  :options="categoriaStore.options"
                  label="Categoría" outlined dense emit-value map-options clearable
                  :loading="categoriaStore.loading"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="form.unidad" :options="unidades" label="Unidad *"
                  outlined dense emit-value map-options :rules="[required]"
                />
              </div>

              <div class="col-12 q-mt-xs">
                <div class="text-subtitle2 text-weight-bold q-mb-xs">Precios (Bs.)</div>
              </div>
              <div class="col-4">
                <q-input v-model.number="form.precioCompra" label="Precio compra" outlined dense
                  type="number" prefix="Bs." :rules="[nonNegativeNumber]" />
              </div>
              <div class="col-4">
                <q-input v-model.number="form.precioOfrecido" label="Precio ofrecido" outlined dense
                  type="number" prefix="Bs." :rules="[nonNegativeNumber]" />
              </div>
              <div class="col-4">
                <q-input v-model.number="form.precioFinal" label="Precio final *" outlined dense
                  type="number" prefix="Bs." :rules="[required, positiveNumber]" />
              </div>

              <div class="col-4">
                <q-input v-model.number="form.stockMinimo" label="Stock mínimo" outlined dense
                  type="number" :rules="[nonNegativeNumber]" hint="Umbral de alerta" />
              </div>
              <div class="col-8 flex items-center">
                <q-toggle v-model="form.activo" label="Producto activo" color="positive" />
              </div>
            </div>
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear producto'"
        color="primary" unelevated :loading="productoStore.saving" @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { QForm } from 'quasar'
import type { Producto, ProductoForm } from 'src/types'
import { useProductoStore } from 'src/stores/productoStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { required, minLength, skuFormat, positiveNumber, nonNegativeNumber } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'
import ProductoImagen from './ProductoImagen.vue'
import ProductoQR from './ProductoQR.vue'

interface Props { producto?: Producto | null }
const props = withDefaults(defineProps<Props>(), { producto: null })
const emit = defineEmits<{ saved: [producto: Producto]; cancelled: [] }>()

const productoStore = useProductoStore()
const categoriaStore = useCategoriaStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const isEdit = ref(false)
const editId = ref('')

const unidades = [
  { label: 'Unidad', value: 'Unidad' }, { label: 'Par', value: 'Par' },
  { label: 'Caja', value: 'Caja' }, { label: 'Docena', value: 'Docena' },
  { label: 'Kg', value: 'Kg' }, { label: 'Litro', value: 'Litro' },
  { label: 'Metro', value: 'Metro' }, { label: 'Rollo', value: 'Rollo' },
]

const defaultForm = (): ProductoForm => ({
  sku: '', marca: '', nombre: '', descripcion: '', categoriaId: '',
  unidad: 'Unidad', precioCompra: 0, precioOfrecido: 0, precioFinal: 0,
  stockMinimo: 0, imagenUrl: '', qrCode: '', activo: true,
})
const form = ref<ProductoForm>(defaultForm())

watch(() => props.producto, (p) => {
  isEdit.value = !!p
  editId.value = p?.id ?? ''
  form.value = p
    ? { sku: p.sku, marca: p.marca, nombre: p.nombre, descripcion: p.descripcion,
        categoriaId: p.categoriaId, unidad: p.unidad, precioCompra: p.precioCompra,
        precioOfrecido: p.precioOfrecido, precioFinal: p.precioFinal,
        stockMinimo: p.stockMinimo, imagenUrl: p.imagenUrl, qrCode: p.qrCode, activo: p.activo }
    : defaultForm()
}, { immediate: true })

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  if (!form.value.qrCode.trim()) form.value.qrCode = form.value.sku
  try {
    let resultado: Producto
    if (isEdit.value && props.producto) {
      resultado = await productoStore.update(props.producto.id, form.value)
      notifySuccess(`Producto "${resultado.nombre}" actualizado`)
    } else {
      resultado = await productoStore.create(form.value)
      notifySuccess(`Producto "${resultado.nombre}" creado`)
    }
    emit('saved', resultado)
  } catch (e) { notifyError((e as Error).message) }
}

onMounted(() => categoriaStore.fetchAll())
</script>
