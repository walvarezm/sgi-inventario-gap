<template>
  <q-card class="sgi-card" style="min-width:480px; max-width:540px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        <q-icon name="remove_circle" color="negative" class="q-mr-sm" />
        Registrar Salida
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">

        <q-select
          v-model="productoSeleccionado"
          :options="opcionesProducto"
          label="Producto *"
          outlined dense use-input input-debounce="300"
          emit-value map-options
          :rules="[required]"
          @filter="filtrarProductos"
        >
          <template #prepend><q-icon name="inventory_2" /></template>
        </q-select>

        <q-select
          v-model="form.sucursalId"
          :options="opcionesSucursal"
          label="Sucursal origen *"
          outlined dense emit-value map-options
          :rules="[required]"
          :disable="!authStore.isGlobal"
        >
          <template #prepend><q-icon name="store" /></template>
        </q-select>

        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input
              v-model.number="form.cantidad"
              label="Cantidad *" outlined dense type="number"
              :rules="[required, positiveNumber, validarStock]"
              :suffix="unidadProducto"
            />
          </div>
          <div class="col-6">
            <q-input v-model="form.referencia" label="Referencia" outlined dense />
          </div>
        </div>

        <q-input v-model="form.notas" label="Notas" outlined dense type="textarea" rows="2" autogrow />

        <!-- Alerta de stock -->
        <q-banner v-if="stockActual !== null" :class="stockSuficiente ? 'bg-green-1' : 'bg-red-1'" dense class="rounded-borders">
          <template #avatar>
            <q-icon :name="stockSuficiente ? 'check_circle' : 'warning'"
              :color="stockSuficiente ? 'positive' : 'negative'" />
          </template>
          Stock disponible: <strong>{{ stockActual }}</strong> {{ unidadProducto }}
          <span v-if="!stockSuficiente" class="text-negative"> — Stock insuficiente</span>
        </q-banner>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Registrar salida" color="negative" unelevated icon="remove"
        :loading="loading" :disable="!stockSuficiente && stockActual !== null"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { QForm } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import { required, positiveNumber } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'
import type { SalidaPayload } from 'src/types'

const emit = defineEmits<{ saved: []; cancelled: [] }>()

const authStore = useAuthStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()

const formRef = ref<InstanceType<typeof QForm> | null>(null)
const loading = ref(false)
const productoSeleccionado = ref<string | null>(null)
const stockActual = ref<number | null>(null)

const form = ref<Omit<SalidaPayload, 'productoId'>>({
  sucursalId: authStore.sucursalId ?? '',
  cantidad: 0,
  referencia: '',
  notas: '',
})

const stockSuficiente = computed(() =>
  stockActual.value === null || (form.value.cantidad > 0 && form.value.cantidad <= stockActual.value),
)

const opcionesSucursal = computed(() =>
  authStore.isGlobal
    ? sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id }))
    : sucursalStore.activas
        .filter((s) => s.id === authStore.sucursalId)
        .map((s) => ({ label: s.nombre, value: s.id })),
)

const opcionesProducto = ref(
  productoStore.activos.map((p) => ({
    label: `[${p.sku}] ${p.nombre} — ${p.marca}`, value: p.id,
  })),
)

const unidadProducto = computed(() => productoStore.getById(productoSeleccionado.value ?? '')?.unidad ?? '')

const validarStock = (val: number): boolean | string => {
  if (stockActual.value === null) return true
  return val <= stockActual.value || `Máximo disponible: ${stockActual.value}`
}

function filtrarProductos(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase()
    opcionesProducto.value = productoStore.activos
      .filter((p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .map((p) => ({ label: `[${p.sku}] ${p.nombre}`, value: p.id }))
  })
}

watch([productoSeleccionado, () => form.value.sucursalId], async () => {
  if (productoSeleccionado.value && form.value.sucursalId) {
    try {
      const s = await inventarioService.getStockProducto(productoSeleccionado.value, form.value.sucursalId)
      stockActual.value = s.stockActual
    } catch { stockActual.value = 0 }
  } else {
    stockActual.value = null
  }
})

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !productoSeleccionado.value) return
  loading.value = true
  try {
    await inventarioService.registrarSalida({
      productoId: productoSeleccionado.value,
      sucursalId: form.value.sucursalId,
      cantidad: form.value.cantidad,
      referencia: form.value.referencia,
      notas: form.value.notas,
    })
    notifySuccess(`Salida registrada: ${form.value.cantidad} unidades`)
    emit('saved')
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    loading.value = false
  }
}
</script>
