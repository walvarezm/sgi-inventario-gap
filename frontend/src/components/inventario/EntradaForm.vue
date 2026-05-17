<template>
  <q-card class="sgi-card" style="min-width: 580px; max-width: 640px">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        <q-icon name="add_circle" color="positive" class="q-mr-sm" />
        Registrar Entrada
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">
        <!-- Búsqueda de producto -->
        <q-select
          v-model="productoSeleccionado"
          :options="opcionesProducto"
          label="Producto *"
          outlined
          dense
          use-input
          input-debounce="300"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          clearable
          :rules="[required]"
          @filter="filtrarProductos"
        >
          <q-tooltip v-if="productoSeleccionado">{{ unidadProducto?.nombre }}</q-tooltip>
          <template #prepend><q-icon name="inventory_2" /></template>
          <template #no-option>
            <q-item><q-item-section class="text-muted">Sin resultados</q-item-section></q-item>
          </template>
        </q-select>

        <!-- Sucursal destino -->
        <q-select
          v-model="form.sucursalId"
          :options="opcionesSucursal"
          label="Sucursal destino *"
          outlined
          dense
          emit-value
          map-options
          :rules="[required]"
          :disable="!authStore.isGlobal"
        >
          <template #prepend><q-icon name="store" /></template>
        </q-select>

        <div class="row q-col-gutter-sm">
          <!-- Cantidad -->
          <div class="col-6">
            <q-input
              v-model.number="form.cantidad"
              label="Cantidad *"
              outlined
              dense
              type="number"
              :rules="[required, positiveNumber]"
              :suffix="unidadProducto?.unidad"
            />
          </div>
          <!-- Referencia -->
          <div class="col-6">
            <q-input
              v-model="form.referencia"
              label="Referencia / N° Orden"
              outlined
              dense
              hint="Nro. factura compra, remito, etc."
            />
          </div>
        </div>

        <!-- Notas -->
        <q-input
          v-model="form.notas"
          label="Notas"
          outlined
          dense
          type="textarea"
          rows="2"
          autogrow
        />

        <!-- Stock actual informativo -->
        <q-banner
          v-if="!loading && stockActual !== null"
          class="bg-blue-1 text-blue-10 rounded-borders"
          dense
        >
          <template #avatar><q-icon name="info" color="info" /></template>
          Stock actual en esta sucursal:
          <strong>{{ stockActual }}</strong>
          {{ unidadProducto?.unidad }} → Después de la entrada:
          <strong>{{ stockActual + (form.cantidad || 0) }}</strong>
        </q-banner>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Registrar entrada"
        color="positive"
        unelevated
        icon="add"
        :loading="loading"
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
import { truncate } from 'src/utils/formatters.ts'
import type { EntradaPayload, InventarioRow } from 'src/types'

interface Props {
  stockInventario: InventarioRow[]
  loadings?: boolean
}
withDefaults(defineProps<Props>(), { loadings: false })

const emit = defineEmits<{ saved: []; cancelled: [] }>()

const authStore = useAuthStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()

const formRef = ref<InstanceType<typeof QForm> | null>(null)
const loading = ref(false)
const productoSeleccionado = ref<string | null>(null)
const stockActual = ref<number | null>(null)
const form = ref<Omit<EntradaPayload, 'productoId'>>({
  sucursalId: authStore.sucursalId ?? '',
  cantidad: 0,
  referencia: '',
  notas: '',
})

const opcionesSucursal = computed(() =>
  authStore.isGlobal
    ? sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id }))
    : sucursalStore.activas
        .filter((s) => s.id === authStore.sucursalId)
        .map((s) => ({ label: s.nombre, value: s.id })),
)

const opcionesProducto = ref(
  //props.stockInventario.slice(0,5)
  productoStore.items
    .map((p) => ({
      label: truncate(`[${p.marca} | ${p.sku}] ${p.nombre}`),
      value: p.id,
      unidad: p.unidad,
    }))
    .slice(0, 5),
)

//const productosPreview = computed(() => productosRows.value.slice(0, 8))

const unidadProducto = computed(() => {
  const p = productoStore.getById(productoSeleccionado.value ?? '')
  //return p?.unidad ?? ''
  return p
})
//const unidadProducto = ref('')

function filtrarProductos(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase()
    opcionesProducto.value = productoStore.items //props.stockInventario
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q),
      )
      .map((p) => ({
        label: truncate(`[${p.marca} | ${p.sku}] ${p.nombre}`),
        //label: `[${p.marca} | ${p.sku}] ${truncate(p.nombre, 20)} — (Stock: ${p.stockActual})`,
        value: p.id,
        unidad: p.unidad,
      }))
  })
}

watch(
  [productoSeleccionado, () => form.value.sucursalId],
  async () => {
    if (productoSeleccionado.value && form.value.sucursalId) {
      try {
        loading.value = true
        const s = await inventarioService.getStockProducto(
          productoSeleccionado.value,
          form.value.sucursalId,
        )
        stockActual.value = s.stockActual
      } catch {
        stockActual.value = 0
      } finally {
        loading.value = false
      }
    } else {
      stockActual.value = null
    }
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid || !productoSeleccionado.value) return

  loading.value = true
  try {
    await inventarioService.registrarEntrada({
      productoId: productoSeleccionado.value,
      sucursalId: form.value.sucursalId,
      cantidad: form.value.cantidad,
      referencia: form.value.referencia,
      notas: form.value.notas,
    })
    notifySuccess(`Entrada registrada: ${form.value.cantidad} unidades`)
    emit('saved')
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    loading.value = false
  }
}
</script>
