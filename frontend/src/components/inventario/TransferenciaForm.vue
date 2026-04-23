<template>
  <q-card class="sgi-card" style="min-width:520px; max-width:580px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        <q-icon name="swap_horiz" color="primary" class="q-mr-sm" />
        Transferencia entre Sucursales
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">

        <q-select
          v-model="productoSeleccionado"
          :options="opcionesProducto" label="Producto *"
          outlined dense use-input input-debounce="300"
          emit-value map-options :rules="[required]"
          @filter="filtrarProductos"
        >
          <template #prepend><q-icon name="inventory_2" /></template>
        </q-select>

        <div class="row q-col-gutter-sm items-center">
          <div class="col-5">
            <q-select
              v-model="form.sucursalOrigen"
              :options="opcionesSucursal" label="Sucursal Origen *"
              outlined dense emit-value map-options :rules="[required]"
            >
              <template #prepend><q-icon name="store" color="negative" /></template>
            </q-select>
          </div>

          <div class="col-2 text-center">
            <q-icon name="arrow_forward" size="28px" color="primary" />
          </div>

          <div class="col-5">
            <q-select
              v-model="form.sucursalDestino"
              :options="opcionesDestinoFiltradas" label="Sucursal Destino *"
              outlined dense emit-value map-options :rules="[required]"
            >
              <template #prepend><q-icon name="store" color="positive" /></template>
            </q-select>
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input
              v-model.number="form.cantidad" label="Cantidad *"
              outlined dense type="number"
              :rules="[required, positiveNumber, validarStock]"
              :suffix="unidadProducto"
            />
          </div>
          <div class="col-6">
            <q-banner v-if="stockOrigen !== null" class="rounded-borders" :class="stockOrigen > 0 ? 'bg-blue-1' : 'bg-red-1'" dense>
              <template #avatar>
                <q-icon :name="stockOrigen > 0 ? 'info' : 'warning'"
                  :color="stockOrigen > 0 ? 'info' : 'negative'" />
              </template>
              Disponible en origen: <strong>{{ stockOrigen }}</strong>
            </q-banner>
          </div>
        </div>

        <q-input v-model="form.notas" label="Notas" outlined dense type="textarea" rows="2" autogrow />
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Transferir" color="primary" unelevated icon="swap_horiz"
        :loading="loading" @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { QForm } from 'quasar'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import { required, positiveNumber } from 'src/utils/validators'
import { useNotify } from 'src/composables/useNotify'
import type { TransferenciaPayload } from 'src/types'

const emit = defineEmits<{ saved: []; cancelled: [] }>()

const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()

const formRef = ref<InstanceType<typeof QForm> | null>(null)
const loading = ref(false)
const productoSeleccionado = ref<string | null>(null)
const stockOrigen = ref<number | null>(null)

const form = ref<Omit<TransferenciaPayload, 'productoId'>>({
  sucursalOrigen: '',
  sucursalDestino: '',
  cantidad: 0,
  notas: '',
})

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id })),
)
const opcionesDestinoFiltradas = computed(() =>
  opcionesSucursal.value.filter((o) => o.value !== form.value.sucursalOrigen),
)

const opcionesProducto = ref(
  productoStore.activos.map((p) => ({ label: `[${p.sku}] ${p.nombre}`, value: p.id })),
)

const unidadProducto = computed(() => productoStore.getById(productoSeleccionado.value ?? '')?.unidad ?? '')

const validarStock = (val: number): boolean | string => {
  if (stockOrigen.value === null) return true
  return val <= stockOrigen.value || `Máximo disponible: ${stockOrigen.value}`
}

function filtrarProductos(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase()
    opcionesProducto.value = productoStore.activos
      .filter((p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .map((p) => ({ label: `[${p.sku}] ${p.nombre}`, value: p.id }))
  })
}

watch([productoSeleccionado, () => form.value.sucursalOrigen], async () => {
  if (productoSeleccionado.value && form.value.sucursalOrigen) {
    try {
      const s = await inventarioService.getStockProducto(productoSeleccionado.value, form.value.sucursalOrigen)
      stockOrigen.value = s.stockActual
    } catch { stockOrigen.value = 0 }
  } else {
    stockOrigen.value = null
  }
})

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !productoSeleccionado.value) return
  loading.value = true
  try {
    await inventarioService.transferir({
      productoId: productoSeleccionado.value,
      sucursalOrigen: form.value.sucursalOrigen,
      sucursalDestino: form.value.sucursalDestino,
      cantidad: form.value.cantidad,
      notas: form.value.notas,
    })
    notifySuccess(`Transferencia realizada: ${form.value.cantidad} unidades`)
    emit('saved')
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    loading.value = false
  }
}
</script>
