<template>
  <q-card class="sgi-card" style="width:700px; max-width:96vw">
    <q-card-section class="row items-center q-pb-none">
      <div>
        <div class="text-h6 text-weight-bold">Recepción de Mercancía</div>
        <div class="text-caption text-muted">{{ orden?.numero }} — {{ orden?.proveedorNombre }}</div>
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section v-if="orden">
      <q-banner class="bg-blue-1 rounded-borders q-mb-md" dense>
        <template #avatar><q-icon name="info" color="info" /></template>
        Las cantidades recibidas generarán entradas automáticas de inventario en
        <strong>{{ sucursalNombre }}</strong>.
      </q-banner>

      <q-table
        :rows="detallesConRecepcion"
        :columns="columnas"
        row-key="id"
        flat dense class="sgi-table" hide-bottom
      >
        <!-- Producto -->
        <template #body-cell-productoNombre="{ row }">
          <q-td>
            <div class="text-weight-medium">{{ row.productoNombre }}</div>
            <div class="text-caption text-muted">{{ row.productoSku }}</div>
          </q-td>
        </template>

        <!-- Pendiente -->
        <template #body-cell-pendiente="{ row }">
          <q-td class="text-center">
            <span :class="row.pendiente > 0 ? 'text-warning text-weight-bold' : 'text-muted'">
              {{ row.pendiente }}
            </span>
          </q-td>
        </template>

        <!-- Input de recepción -->
        <template #body-cell-cantidadARecibir="{ row }">
          <q-td>
            <q-input
              v-model.number="row.cantidadARecibir"
              type="number" dense outlined
              :min="0" :max="row.pendiente"
              style="width:90px"
              :disable="row.pendiente <= 0"
            />
          </q-td>
        </template>
      </q-table>

      <q-input
        v-model="notas"
        label="Notas de recepción"
        outlined dense class="q-mt-md"
        type="textarea" rows="2" autogrow
      />
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Confirmar recepción" color="positive" unelevated icon="check"
        :loading="store.saving" @click="confirmar"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { QTableColumn } from 'quasar'
import type { OrdenCompra } from 'src/types'
import { useProveedorStore } from 'src/stores/proveedorStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useNotify } from 'src/composables/useNotify'

interface Props { orden: OrdenCompra | null }
const props = withDefaults(defineProps<Props>(), { orden: null })
const emit = defineEmits<{ saved: [orden: OrdenCompra] }>()

const store = useProveedorStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()

const notas = ref('')

interface DetalleRecepcion {
  id: string
  productoNombre: string
  productoSku: string
  cantidadPedida: number
  cantidadRecibida: number
  pendiente: number
  cantidadARecibir: number
}

const detallesConRecepcion = ref<DetalleRecepcion[]>([])

watch(() => props.orden, (o) => {
  if (!o?.detalles) return
  detallesConRecepcion.value = o.detalles.map((d) => ({
    id: d.id,
    productoNombre: d.productoNombre,
    productoSku: d.productoSku,
    cantidadPedida: d.cantidadPedida,
    cantidadRecibida: d.cantidadRecibida,
    pendiente: d.cantidadPedida - d.cantidadRecibida,
    cantidadARecibir: d.cantidadPedida - d.cantidadRecibida,
  }))
}, { immediate: true })

const sucursalNombre = computed(() =>
  sucursalStore.getById(props.orden?.sucursalId ?? '')?.nombre ?? props.orden?.sucursalId ?? '',
)

const columnas: QTableColumn[] = [
  { name: 'productoNombre',  label: 'Producto',    field: 'productoNombre',  align: 'left' },
  { name: 'cantidadPedida',  label: 'Pedido',      field: 'cantidadPedida',  align: 'center' },
  { name: 'cantidadRecibida',label: 'Ya recibido', field: 'cantidadRecibida',align: 'center' },
  { name: 'pendiente',       label: 'Pendiente',   field: 'pendiente',       align: 'center' },
  { name: 'cantidadARecibir',label: 'A recibir',   field: 'cantidadARecibir',align: 'center' },
]

async function confirmar(): Promise<void> {
  if (!props.orden) return

  const detallesRecibidos = detallesConRecepcion.value
    .filter((d) => d.cantidadARecibir > 0)
    .map((d) => ({ detalleId: d.id, cantidadRecibida: d.cantidadARecibir }))

  if (!detallesRecibidos.length) {
    notifyError('Ingresa al menos una cantidad a recibir')
    return
  }

  try {
    const actualizada = await store.recibirMercancia({
      ordenId: props.orden.id,
      detallesRecibidos,
      notas: notas.value,
    })
    notifySuccess(`Recepción registrada — Estado: ${actualizada.estado}`)
    emit('saved', actualizada)
  } catch (e) { notifyError((e as Error).message) }
}
</script>
