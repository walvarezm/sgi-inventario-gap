<template>
  <!--
    ProductoQuickCreateDialog.vue
    ─────────────────────────────────────────────────────────────────────────
    Formulario rápido de creación de producto, diseñado para ser invocado
    desde contextos modales (ej: MovimientoFormBase) sin perder el foco del
    modal padre. Sólo expone los campos esenciales; imagen y QR se pueden
    configurar posteriormente desde el módulo de Productos.

    Props:
      modelValue (boolean) — controla la visibilidad del diálogo (v-model)

    Emits:
      update:modelValue (boolean) — cierra el diálogo
      created (Producto)          — emitido tras crear exitosamente el producto
  -->
  <q-dialog
    :model-value="modelValue"
    persistent
    no-backdrop-dismiss
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card style="width: 680px; max-width: 96vw">
      <!-- ── Encabezado ── -->
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="add_box" color="primary" size="24px" class="q-mr-sm" />
        <div class="text-h6 text-weight-bold">Nuevo Producto Rápido</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="cerrar" />
      </q-card-section>

      <q-banner dense class="bg-blue-1 text-blue-9 q-mx-md q-mt-sm">
        <template #avatar><q-icon name="info" color="blue" /></template>
        Campos mínimos requeridos. Imagen, QR y detalles adicionales puedes completarlos después
        desde el módulo
        <strong>Productos</strong>
        .
      </q-banner>

      <!-- ── Formulario ── -->
      <q-card-section>
        <q-form ref="formRef" class="q-gutter-sm" @submit.prevent="handleSubmit">
          <div class="row q-col-gutter-sm">
            <!-- SKU -->
            <div class="col-12 col-sm-4">
              <q-input
                v-model="form.sku"
                label="SKU *"
                outlined
                dense
                autofocus
                hint="Código único del producto"
                :rules="[required, skuFormat]"
              />
            </div>

            <!-- Marca -->
            <div class="col-12 col-sm-4">
              <q-select
                v-model="form.marcaId"
                :options="marcaStore.options"
                label="Marca *"
                outlined
                dense
                emit-value
                map-options
                clearable
                :loading="marcaStore.loading"
                :rules="[required]"
              />
            </div>

            <!-- Unidad -->
            <div class="col-12 col-sm-4">
              <q-select
                v-model="form.unidad"
                :options="unidades"
                label="Unidad *"
                outlined
                dense
                emit-value
                map-options
                :rules="[required]"
              />
            </div>

            <!-- Nombre -->
            <div class="col-12">
              <q-input
                v-model="form.nombre"
                label="Nombre del producto *"
                outlined
                dense
                :rules="[required, minLength(3)]"
              />
            </div>

            <!-- Descripción -->
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

            <!-- Categoría -->
            <div class="col-12 col-sm-6">
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

            <!-- Stock mínimo -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="form.stockMinimo"
                label="Stock mínimo"
                outlined
                dense
                type="number"
                hint="Umbral de alerta"
                :rules="[nonNegativeNumber]"
              />
            </div>

            <!-- Precios -->
            <div class="col-12">
              <div class="text-subtitle2 text-weight-bold q-mb-xs">Precios (Bs.)</div>
            </div>
            <div class="col-12 col-sm-4">
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
            <div class="col-12 col-sm-4">
              <q-input
                v-model.number="form.precioOfrecido"
                label="Precio Venta"
                outlined
                dense
                type="number"
                prefix="Bs."
                :rules="[nonNegativeNumber]"
                @update:model-value="form.precioFinal = Number($event)"
              />
            </div>
            <div class="col-12 col-sm-4">
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

            <!-- Activo -->
            <div class="col-12">
              <q-toggle v-model="form.activo" label="Producto activo" color="positive" />
            </div>
          </div>
        </q-form>
      </q-card-section>

      <!-- ── Acciones ── -->
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn label="Cancelar" flat color="grey" :disable="saving" @click="cerrar" />
        <q-btn
          label="Crear y seleccionar"
          color="primary"
          unelevated
          icon="add_box"
          :loading="saving"
          @click="handleSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { QForm } from 'quasar'
import type { Producto, ProductoForm } from 'src/types'
import { useProductoStore } from 'src/stores/productoStore'
import { useCategoriaStore } from 'src/stores/categoriaStore'
import { useMarcaStore } from 'src/stores/marcaStore'
import { minLength, nonNegativeNumber, required, skuFormat } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'
import { getQrMode, useQR } from 'src/composables/useQR.ts'

// ── Props / Emits ─────────────────────────────────────────────
defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [producto: Producto]
}>()

// ── Stores ────────────────────────────────────────────────────
const productoStore = useProductoStore()
const categoriaStore = useCategoriaStore()
const marcaStore = useMarcaStore()
const { notifySuccess, notifyError } = useNotify()

// ── Estado ────────────────────────────────────────────────────
const formRef = ref<InstanceType<typeof QForm> | null>(null)
const saving = ref(false)

const { addContentBreak, clearContentBreak, buildQrEnlace, buildQrTexto } = useQR()
const modoQR = getQrMode()

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

// ── Métodos ───────────────────────────────────────────────────

function cerrar(): void {
  form.value = defaultForm()
  formRef.value?.resetValidation()
  emit('update:modelValue', false)
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return

  // Resolver nombre de marca para guardarlo desnormalizado
  form.value.marca = marcaStore.getById(form.value.marcaId as string)?.nombre ?? ''
  // QR por defecto = SKU
  //form.value.qrCode = form.value.sku

  if (modoQR === 'enlace') {
    // En modo enlace guardamos la URL construida como qrCode
    form.value.qrCode = buildQrEnlace(form.value.sku)
  } else {
    // Modo texto: limpiamos saltos de línea y usamos SKU si está vacío
    const codigoLimpio = clearContentBreak(form.value.qrCode.trim())
    form.value.qrCode = codigoLimpio || form.value.sku
  }

  saving.value = true
  try {
    const nuevo = await productoStore.create(form.value)
    notifySuccess(`Producto "${nuevo.nombre}" creado correctamente`)
    emit('created', nuevo)
    cerrar()
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    saving.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  if (!categoriaStore.items.length) categoriaStore.fetchAll()
  if (!marcaStore.items.length) marcaStore.fetchAll()
})
</script>
