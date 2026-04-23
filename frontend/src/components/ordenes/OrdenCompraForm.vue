<template>
  <q-card class="sgi-card" style="width:760px; max-width:96vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">Nueva Orden de Compra</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-sm">
        <!-- Cabecera -->
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.proveedorId"
              :options="proveedorStore.options"
              label="Proveedor *" outlined dense emit-value map-options
              :rules="[required]"
            >
              <template #prepend><q-icon name="local_shipping" /></template>
            </q-select>
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.sucursalId"
              :options="opcionesSucursal"
              label="Sucursal destino *" outlined dense emit-value map-options
              :rules="[required]"
            >
              <template #prepend><q-icon name="store" /></template>
            </q-select>
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.fechaEstimada"
              label="Fecha estimada de llegada" outlined dense type="date"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="form.notas" label="Notas" outlined dense />
          </div>
        </div>

        <q-separator class="q-my-md" />
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Productos a ordenar</div>

        <!-- Agregar producto -->
        <div class="row q-col-gutter-sm items-end q-mb-sm">
          <div class="col-5">
            <q-select
              v-model="nuevoDetalle.productoId"
              :options="opcionesProducto"
              label="Producto" outlined dense use-input input-debounce="200"
              emit-value map-options @filter="filtrarProductos"
            />
          </div>
          <div class="col-3">
            <q-input
              v-model.number="nuevoDetalle.cantidadPedida"
              label="Cantidad" outlined dense type="number" min="1"
            />
          </div>
          <div class="col-3">
            <q-input
              v-model.number="nuevoDetalle.precioUnitario"
              label="Precio unit. (Bs.)" outlined dense type="number" prefix="Bs."
            />
          </div>
          <div class="col-1">
            <q-btn round unelevated color="primary" icon="add" @click="agregarDetalle">
              <q-tooltip>Agregar producto</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Tabla de detalles -->
        <q-table
          :rows="form.detalles" :columns="columnasDetalle" row-key="productoId"
          flat dense class="sgi-table" hide-bottom
          no-data-label="Agrega productos a la orden"
        >
          <template #body-cell-subtotal="{ row }">
            <q-td class="text-right text-weight-bold">
              {{ formatCurrency(row.cantidadPedida * row.precioUnitario) }}
            </q-td>
          </template>
          <template #body-cell-acciones="{ row }">
            <q-td class="text-center">
              <q-btn flat round dense size="xs" icon="delete" color="negative"
                @click="quitarDetalle(row.productoId)">
                <q-tooltip>Quitar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <!-- Total -->
        <div class="row justify-end q-mt-sm">
          <div class="text-subtitle1 text-weight-bold">
            Total: {{ formatCurrency(totalOrden) }}
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup />
      <q-btn
        label="Crear orden de compra" color="primary" unelevated icon="shopping_cart"
        :loading="proveedorStore.saving" @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QForm, QTableColumn } from 'quasar'
import { useProveedorStore } from 'src/stores/proveedorStore'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useAuthStore } from 'src/stores/authStore'
import type { OrdenCompra, OrdenCompraForm, DetalleOrdenForm } from 'src/types'
import { required } from 'src/utils/validators'
import { formatCurrency } from 'src/utils/formatters'
import { useNotify } from 'src/composables/useNotify'

const emit = defineEmits<{ saved: [orden: OrdenCompra] }>()

const proveedorStore = useProveedorStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const authStore = useAuthStore()
const { notifySuccess, notifyError } = useNotify()

const formRef = ref<InstanceType<typeof QForm> | null>(null)

const form = ref<OrdenCompraForm>({
  proveedorId: '',
  sucursalId: authStore.sucursalId ?? '',
  fechaEstimada: '',
  notas: '',
  detalles: [],
})

const nuevoDetalle = ref<DetalleOrdenForm>({
  productoId: '', cantidadPedida: 1, precioUnitario: 0,
})

const opcionesSucursal = computed(() =>
  sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id })),
)

const opcionesProducto = ref(
  productoStore.activos.map((p) => ({
    label: `[${p.sku}] ${p.nombre} — ${p.marca}`,
    value: p.id,
    precioCompra: p.precioCompra,
  })),
)

const totalOrden = computed(() =>
  form.value.detalles.reduce((s, d) => s + d.cantidadPedida * d.precioUnitario, 0),
)

const columnasDetalle: QTableColumn[] = [
  { name: 'productoId', label: 'Producto', field: 'productoId',   align: 'left',
    format: (val) => {
      const p = productoStore.getById(val)
      return p ? `[${p.sku}] ${p.nombre}` : val
    },
  },
  { name: 'cantidadPedida',  label: 'Cantidad', field: 'cantidadPedida',  align: 'center' },
  { name: 'precioUnitario',  label: 'P. Unit.',  field: 'precioUnitario',
    align: 'right', format: (v) => formatCurrency(v) },
  { name: 'subtotal', label: 'Subtotal', field: 'cantidadPedida', align: 'right' },
  { name: 'acciones', label: '', field: 'productoId', align: 'center' },
]

function filtrarProductos(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase()
    opcionesProducto.value = productoStore.activos
      .filter((p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .map((p) => ({ label: `[${p.sku}] ${p.nombre}`, value: p.id, precioCompra: p.precioCompra }))
  })
}

function agregarDetalle(): void {
  if (!nuevoDetalle.value.productoId || nuevoDetalle.value.cantidadPedida <= 0) return
  const existe = form.value.detalles.find((d) => d.productoId === nuevoDetalle.value.productoId)
  if (existe) {
    existe.cantidadPedida += nuevoDetalle.value.cantidadPedida
    return
  }
  // Auto-completar precio de compra del producto
  if (!nuevoDetalle.value.precioUnitario) {
    const p = productoStore.getById(nuevoDetalle.value.productoId)
    nuevoDetalle.value.precioUnitario = p?.precioCompra ?? 0
  }
  form.value.detalles.push({ ...nuevoDetalle.value })
  nuevoDetalle.value = { productoId: '', cantidadPedida: 1, precioUnitario: 0 }
}

function quitarDetalle(productoId: string): void {
  form.value.detalles = form.value.detalles.filter((d) => d.productoId !== productoId)
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  if (!form.value.detalles.length) {
    notifyError('Agrega al menos un producto a la orden')
    return
  }
  try {
    const orden = await proveedorStore.createOrden(form.value)
    notifySuccess(`Orden de compra ${orden.numero} creada`)
    emit('saved', orden)
  } catch (e) { notifyError((e as Error).message) }
}
</script>
