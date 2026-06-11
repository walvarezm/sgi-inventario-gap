<template>
  <q-card class="sgi-card" style="width: 900px; max-width: 96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        {{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-md">
          <!-- Columna izquierda: imagen + QR -->
          <div class="col-12 col-md-4">
            <div class="text-subtitle2 text-weight-bold q-mb-sm">Imagen</div>
            <ProductoImagen
              v-model="form.imagenUrl"
              v-model:imagen-location="form.imagenLocation"
              :producto-id="editId"
              :producto-sku="form.sku"
            />
            <div v-if="isEdit && props.producto?.imagenUrl" class="text-caption text-muted q-mt-sm">
              Si cambias o quitas la imagen y guardas, la imagen anterior dejará de usarse.
            </div>

            <q-separator class="q-my-md" />

            <div class="text-subtitle2 text-weight-bold q-mb-sm">Código QR</div>
            <ProductoQR
              :sku="form.sku"
              :qr-code="modoQR === 'texto' ? form.qrCode : ''"
              :datos="modoQR === 'texto' ? qrDatos : undefined"
            />
          </div>

          <!-- Columna derecha: datos -->
          <div class="col-12 col-md-8">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.sku"
                  label="SKU *"
                  outlined
                  dense
                  :rules="[required, skuFormat]"
                  hint="Código único"
                  :disable="isEdit"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="form.marcaId"
                  :options="marcaStore.options"
                  label="Marca"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  :loading="marcaStore.loading"
                  :rules="[required]"
                />
              </div>

              <div class="col-12">
                <q-input
                  v-model="form.nombre"
                  label="Nombre del producto *"
                  outlined
                  dense
                  :rules="[required, minLength(3)]"
                />
              </div>

              <div class="col-12">
                <q-input
                  v-model="form.descripcion"
                  label="Descripción"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                  autogrow
                />
              </div>

              <div class="col-6">
                <q-select
                  v-model="form.categoriaId"
                  :options="categoriaStore.options"
                  label="Categoría"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  :loading="categoriaStore.loading"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="form.unidad"
                  :options="unidades"
                  label="Unidad *"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  :rules="[required]"
                />
              </div>

              <div class="col-12 q-mt-xs">
                <div class="text-subtitle2 text-weight-bold q-mb-xs">Precios (Bs.)</div>
              </div>

              <div class="col-4">
                <q-input
                  v-model.number="form.precioCompra"
                  label="Precio Compra"
                  outlined
                  dense
                  type="number"
                  prefix="Bs."
                  :rules="[nonNegativeNumber]"
                />
              </div>
              <div class="col-4">
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
              <div class="col-4">
                <q-input
                  v-model.number="form.precioFinal"
                  label="Precio Final"
                  outlined
                  dense
                  type="number"
                  prefix="Bs."
                  :rules="[nonNegativeNumber]"
                />
              </div>

              <div class="col-4">
                <q-input
                  v-model.number="form.stockMinimo"
                  label="Stock mínimo"
                  outlined
                  dense
                  type="number"
                  :rules="[nonNegativeNumber]"
                  hint="Umbral de alerta"
                />
              </div>
              <div class="col-8 flex items-center">
                <q-toggle v-model="form.activo" label="Producto activo" color="positive" />
              </div>

              <!-- Campo qrCode: solo visible en modo texto -->
              <div v-if="modoQR === 'texto'" class="col-12 q-mt-xs">
                <q-input
                  v-model="form.qrCode"
                  label="Contenido del QR"
                  outlined
                  dense
                  type="textarea"
                  autogrow
                  class="q-mt-sm"
                  hint="Vacío = usa el SKU automáticamente"
                />
              </div>

              <!-- Indicador en modo enlace -->
              <div v-else class="col-12 q-mt-xs">
                <q-banner dense rounded class="bg-teal-1 text-teal-9 q-mt-sm">
                  <template #avatar>
                    <q-icon name="link" color="teal" />
                  </template>
                  El QR generará el enlace:
                  <strong>{{ qrEnlacePreview }}</strong>
                </q-banner>
              </div>
            </div>
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" color="negative" v-close-popup />
      <q-btn
        :label="isEdit ? 'Guardar cambios' : 'Crear producto'"
        color="primary"
        unelevated
        :loading="productoStore.saving"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { QForm } from 'quasar'
import type { Producto, ProductoForm } from 'src/types'
import { useProductoStore } from 'src/stores/productoStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { minLength, nonNegativeNumber, required, skuFormat } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'
import ProductoImagen from './ProductoImagen.vue'
import ProductoQR from './ProductoQR.vue'
import { useMarcaStore } from 'src/stores/marcaStore.ts'
import { useQR, getQrMode } from 'src/composables/useQR.ts'
import type { QrProductoDatos } from 'src/composables/useQR.ts'

const { addContentBreak, clearContentBreak, buildQrEnlace, buildQrTexto } = useQR()

/** Modo activo leído de VITE_QR_MODE (reactivo al build, no cambia en runtime) */
const modoQR = getQrMode()

interface Props {
  producto?: Producto | null
}
const props = withDefaults(defineProps<Props>(), { producto: null })
const emit = defineEmits<{ saved: [producto: Producto]; cancelled: [] }>()

const productoStore = useProductoStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const { notifySuccess, notifyError } = useNotify()
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const isEdit = ref(false)
const editId = ref('')

const unidades = [
  { label: 'Unidad', value: 'Unidad' },
  { label: 'Pieza', value: 'Pieza' },
  { label: 'Par', value: 'Par' },
  { label: 'Caja', value: 'Caja' },
  { label: 'Docena', value: 'Docena' },
  { label: 'Kg', value: 'Kg' },
  { label: 'Litro', value: 'Litro' },
  { label: 'Metro', value: 'Metro' },
  { label: 'Rollo', value: 'Rollo' },
]

const defaultForm = (): ProductoForm => ({
  sku: '',
  marcaId: '',
  marca: '',
  nombre: '',
  descripcion: '',
  categoriaId: '',
  unidad: 'Pieza',
  precioCompra: 0,
  precioOfrecido: 0,
  precioFinal: 0,
  stockMinimo: 0,
  imagenUrl: '',
  qrCode: '',
  activo: true,
  imagenLocation: 'local',
})
const form = ref<ProductoForm>(defaultForm())

// ─── Datos del producto para el composable QR ───────────────
const qrDatos = computed<QrProductoDatos>(() => ({
  sku: form.value.sku,
  marca: form.value.marca || (marcaStore.getById(form.value.marcaId as string)?.nombre ?? ''),
  nombre: form.value.nombre,
  precioOfrecido: form.value.precioOfrecido,
  precioFinal: form.value.precioFinal,
}))

/** Preview del enlace que se generaría (solo modo enlace) */
const qrEnlacePreview = computed(() =>
  form.value.sku ? buildQrEnlace(form.value.sku) : '(ingresa el SKU para ver el enlace)',
)

// ─── Watchers ────────────────────────────────────────────────

watch(
  () => props.producto,
  (p) => {
    isEdit.value = !!p
    editId.value = p?.id ?? ''
    form.value = p
      ? {
          sku: p.sku,
          marcaId: p.marcaId,
          marca: p.marca,
          nombre: p.nombre,
          descripcion: p.descripcion,
          categoriaId: p.categoriaId,
          unidad: p.unidad,
          precioCompra: p.precioCompra,
          precioOfrecido: p.precioOfrecido,
          precioFinal: p.precioFinal,
          stockMinimo: p.stockMinimo,
          imagenUrl: p.imagenUrl,
          qrCode: modoQR === 'texto' ? addContentBreak(p.qrCode) : p.qrCode,
          activo: p.activo,
          imagenLocation: p.imagenLocation,
        }
      : defaultForm()
  },
  { immediate: true },
)

/**
 * En modo TEXTO: auto-genera el contenido del QR cuando cambian
 * los campos del producto que se incluyen en el texto del QR.
 * En modo ENLACE: no se necesita actualizar qrCode (se construye al vuelo).
 */
watch(
  () => [
    form.value.sku,
    form.value.marca,
    form.value.nombre,
    form.value.precioOfrecido,
    form.value.precioFinal,
  ],
  () => {
    if (modoQR === 'texto') {
      form.value.qrCode = addContentBreak(buildQrTexto(form.value.sku, qrDatos.value))
    }
  },
)

// ─── Submit ──────────────────────────────────────────────────

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return

  form.value.marca = marcaStore.getById(form.value.marcaId as string)?.nombre as string

  if (modoQR === 'enlace') {
    // En modo enlace guardamos la URL construida como qrCode
    form.value.qrCode = buildQrEnlace(form.value.sku)
  } else {
    // Modo texto: limpiamos saltos de línea y usamos SKU si está vacío
    const codigoLimpio = clearContentBreak(form.value.qrCode.trim())
    form.value.qrCode = codigoLimpio || form.value.sku
  }

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
  } catch (e) {
    notifyError((e as Error).message)
  }
}

onMounted(() => {
  categoriaStore.fetchAll()
  marcaStore.fetchAll()
})
</script>
