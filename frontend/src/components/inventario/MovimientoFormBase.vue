<template>
  <q-card class="sgi-card movimiento-form-card">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6 text-weight-bold">
        <q-icon :name="icon" :color="color" class="q-mr-sm" />
        {{ title }}
      </div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup @click="emit('cancelled')" />
    </q-card-section>

    <q-card-section>
      <q-form ref="formRef" class="q-gutter-md" @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-btn-toggle
              v-model="modo"
              spread
              unelevated
              no-caps
              toggle-color="primary"
              :options="[
                { label: 'Unitario', value: 'UNITARIO' },
                { label: 'Masivo', value: 'MASIVO', disable: !canMassive },
              ]"
              @update:model-value="onModoChange"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-input
              v-model="fechaRegistro"
              label="Fecha del registro"
              outlined
              dense
              type="datetime-local"
            />
          </div>
          <div
            v-if="tipo === 'TRANSFERENCIA'"
            class="col-12 col-sm-4 flex items-center justify-end"
          >
            <q-btn
              flat
              dense
              color="primary"
              icon="north_east"
              label="Casa Matriz -> S-T3"
              @click="aplicarRutaRapidaST3"
            />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div v-if="tipo !== 'TRANSFERENCIA'" class="col-12 col-sm-6">
            <q-select
              v-model="sucursalId"
              :options="opcionesSucursal"
              label="Sucursal *"
              outlined
              dense
              emit-value
              map-options
            >
              <template #prepend><q-icon name="store" /></template>
            </q-select>
          </div>
          <template v-else>
            <div class="col-12 col-sm-5">
              <q-select
                v-model="sucursalOrigen"
                :options="opcionesSucursal"
                label="Sucursal origen *"
                outlined
                dense
                emit-value
                map-options
              >
                <template #prepend><q-icon name="store" color="negative" /></template>
              </q-select>
            </div>
            <div class="col-12 col-sm-2 flex flex-center">
              <q-icon name="arrow_forward" color="primary" size="26px" />
            </div>
            <div class="col-12 col-sm-5">
              <q-select
                v-model="sucursalDestino"
                :options="opcionesDestino"
                label="Sucursal destino *"
                outlined
                dense
                emit-value
                map-options
              >
                <template #prepend><q-icon name="store" color="positive" /></template>
              </q-select>
            </div>
          </template>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-select
              v-model="referenciaTipo"
              :options="opcionesReferencia"
              label="Referencia guiada"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="onReferenciaTipoChange"
            />
          </div>
          <div class="col-12 col-sm-8">
            <q-input
              v-model="referenciaTexto"
              label="Referencia / responsable"
              outlined
              dense
              :hint="
                referenciaTipo !== 'OTRO'
                  ? 'Puedes completar el responsable y ajustar el texto.'
                  : 'Texto libre'
              "
            />
          </div>
          <div class="col-12">
            <q-input
              v-model="notas"
              label="Notas"
              outlined
              dense
              type="textarea"
              autogrow
              :hint="detalleTemplateLabel"
            />
          </div>
        </div>

        <q-separator />

        <div class="row items-center">
          <div class="text-subtitle2 text-weight-bold">
            [{{ items.length }}] Productos del Comprobante
          </div>
          <q-space />
          <q-btn
            flat
            dense
            color="primary"
            icon="add"
            label="Agregar fila"
            @click="agregarFila()"
          />
          <q-btn
            v-if="items.length > 1"
            flat
            dense
            color="negative"
            icon="delete_sweep"
            label="Limpiar"
            @click="limpiarFilas"
          />
        </div>

        <div v-for="(item, index) in items" :key="item.localId" class="mov-row q-py-none q-my-xs">
          <div class="row q-col-gutter-xs" style="border: 1px solid #afb7c2">
            <div class="col-12 col-md-7">
              <div class="row q-col-gutter-xs">
                <div class="col-12 col-md-1 flex items-center justify-center">
                  {{ index + 1 }}
                </div>
                <q-select
                  v-model="item.productoId"
                  :options="opcionesProducto"
                  label="Producto *"
                  outlined
                  dense
                  use-input
                  emit-value
                  map-options
                  input-debounce="20"
                  clearable
                  class="col-12 col-md-11 product-name-with-ellipsis"
                  :autofocus="autofocus"
                  @filter="filtrarProductos"
                  @update:model-value="onProductoChange(item)"
                />
                <q-tooltip>{{ item.productoNombre }}</q-tooltip>
              </div>
            </div>
            <div class="col-6 col-md-1">
              <q-input
                v-model.number="item.cantidad"
                label="Cantidad *"
                outlined
                dense
                type="number"
                min="1"
              />
            </div>
            <div class="col-6 col-md-1">
              <q-input
                v-model.number="item.precioOfrecido"
                label="Precio ofrecido"
                outlined
                dense
                type="number"
                step="0.01"
                :disable="!canEditPrices"
              />
            </div>
            <div class="col-6 col-md-1">
              <q-input
                v-model.number="item.precioFinal"
                label="Precio final"
                outlined
                dense
                type="number"
                step="0.01"
                :disable="!canEditPrices"
              />
            </div>
            <div class="col-6 col-md-1">
              <q-input
                v-model="item.detalleAccion"
                label="Detalle de la línea"
                outlined
                dense
                type="textarea"
                autogrow
              />
            </div>
            <div class="col-6 col-md-1 flex items-center justify-center">
              <q-btn
                flat
                round
                dense
                icon="content_copy"
                color="primary"
                @click="duplicarFila(index)"
              >
                <q-tooltip>Duplicar</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                :disable="items.length === 1 && modo === 'UNITARIO'"
                @click="quitarFila(index)"
              >
                <q-tooltip>Quitar</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn label="Cancelar" flat color="grey" v-close-popup @click="emit('cancelled')" />
      <q-btn
        :label="submitLabel"
        :color="color"
        unelevated
        :icon="icon"
        :loading="loading"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { QForm } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useProductoStore } from 'src/stores/productoStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { inventarioService } from 'src/services/inventarioService'
import type {
  MovimientoCabecera,
  MovimientoDetalleItem,
  ReferenciaMovimientoTemplate,
  TipoMovimiento,
  MovimientoUpdatePayload,
} from 'src/types'
import { useNotify } from 'src/composables/useNotify'
import { truncate } from 'src/utils/formatters.ts'

type LocalItem = MovimientoDetalleItem & { localId: string }

const props = defineProps<{
  tipo: TipoMovimiento
  title: string
  color: string
  icon: string
  initialData?: MovimientoCabecera | null
}>()

const emit = defineEmits<{ saved: []; cancelled: [] }>()

const authStore = useAuthStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError } = useNotify()

const formRef = ref<InstanceType<typeof QForm> | null>(null)
const loading = ref(false)
const autofocus = ref(false)
const modo = ref<'UNITARIO' | 'MASIVO'>('UNITARIO')
const fechaRegistro = ref(new Date().toISOString().slice(0, 16))
const sucursalId = ref(authStore.sucursalId ?? '')
const sucursalOrigen = ref(authStore.sucursalId ?? '')
const sucursalDestino = ref('')
const referenciaTipo = ref<
  'INICIO_INVENTARIO' | 'CIERRE_INVENTARIO' | 'REPOSICION_PRODUCTO' | 'BAJA_PRODUCTO' | 'OTRO'
>('OTRO')
const referenciaTexto = ref('')
const notas = ref('')
const items = ref<LocalItem[]>([])
const plantillas = ref<ReferenciaMovimientoTemplate[]>([])

const canMassive = computed(
  () =>
    authStore.can('inventario.crear_masivo') || authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)
const canEditPrices = computed(
  () =>
    authStore.can('inventario.editar_precios_movimiento') ||
    authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)

const opcionesSucursal = computed(() =>
  authStore.isGlobal
    ? sucursalStore.activas.map((sucursal) => ({
        label: `${sucursal.nombre} — ${sucursal.ciudad}`,
        value: sucursal.id,
      }))
    : sucursalStore.activas
        .filter((sucursal) => sucursal.id === authStore.sucursalId)
        .map((sucursal) => ({ label: sucursal.nombre, value: sucursal.id })),
)

const opcionesDestino = computed(() =>
  opcionesSucursal.value.filter((option) => option.value !== sucursalOrigen.value),
)

const opcionesProducto1 = computed(() =>
  productoStore.activos.map((producto) => ({
    label: truncate(`[${producto.sku}] ${producto.marca} — ${producto.nombre}`, 55),
    value: producto.id,
  })),
)

const opcionesReferencia = computed(() =>
  plantillas.value.map((template) => ({
    label: String(template.tipo).replace(/_/g, ' '),
    value: template.tipo,
  })),
)

const detalleTemplateLabel = computed(
  () =>
    plantillas.value.find((template) => template.tipo === referenciaTipo.value)?.detalleLabel ||
    'Detalle libre',
)

const submitLabel = computed(() => (props.initialData ? 'Guardar cambios' : 'Guardar movimiento'))

function createEmptyItem(): LocalItem {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    productoId: '',
    cantidad: 1,
    precioOfrecido: 0,
    precioFinal: 0,
    detalleAccion: '',
  }
}

function ensureSingleRow(): void {
  if (modo.value === 'UNITARIO') {
    items.value = [items.value[0] ? { ...items.value[0] } : createEmptyItem()]
  }
}

function onModoChange(): void {
  ensureSingleRow()
}

function agregarFila(seed?: Partial<LocalItem>): void {
  autofocus.value = true
  if (modo.value === 'UNITARIO' && items.value.length) return
  items.value.push({ ...createEmptyItem(), ...seed, localId: `${Date.now()}-${Math.random()}` })
}

function duplicarFila(index: number): void {
  autofocus.value = true
  const source = items.value[index]
  if (!source) return
  if (modo.value === 'UNITARIO') return
  agregarFila({ ...source, id: undefined, movimientoOrigenId: undefined })
}

function quitarFila(index: number): void {
  autofocus.value = false
  if (items.value.length === 1 && modo.value === 'UNITARIO') return
  items.value.splice(index, 1)
  if (!items.value.length) agregarFila()
}

function limpiarFilas(): void {
  items.value = [createEmptyItem()]
  ensureSingleRow()
}

const opcionesProducto = ref(
  //productoStore.options,

  productoStore.activos.map((producto) => ({
    //label: `[${producto.marca}][${producto.sku}] — ${producto.nombre}`,
    label: truncate(`[${producto.marca}][${producto.sku}] — ${producto.nombre}`, 75),
    value: producto.id,
  })),
)

function filtrarProductos(val: string, update: (fn: () => void) => void) {
  console.log('filtrarProductos VAL', val)
  //productoStore.getById(form.value.productoId)
  //if (!update) return
  update(() => {
    const q = val.toLowerCase()
    //if (q === '' || !q) return productoStore.options
    console.log('filtrarProductos', val, q)
    opcionesProducto.value = productoStore.activos
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q),
      )
      //.slice(0, 10)
      .map((p) => ({
        label: truncate(`[${p.marca}] - [${p.sku}] — ${p.nombre}`, 75),
        value: p.id,
      }))
    console.log('filtrarProductos2', opcionesProducto.value)
  })
}

function filtrarProductosss(val: string, update: (fn: () => void) => void): void {
  update(() => {
    const q = String(val || '').toLowerCase()
    console.log('filtrarProductos', val, q)
    if (!q) return
    //const result = filtrarProductosInput(q)
    //console.log('result', result)
    //return result
  })
}

function filtrarProductosInput(val: string) {
  return productoStore.activos.filter(
    (producto) =>
      producto.sku.toLowerCase().includes(val) ||
      producto.marca.toLowerCase().includes(val) ||
      producto.nombre.toLowerCase().includes(val),
  )
}

/*const resultadosBusqueda = computed(() => {
  if (!busqueda.value.trim()) return []
  const q = busqueda.value.toLowerCase()
  const cache = cataloStore.cache[sucursalActiva.value]
  if (!cache) return []
  return cache.data
    .filter(
      (producto) =>
        producto.sku.toLowerCase().includes(q) ||
        producto.nombre.toLowerCase().includes(q) ||
        producto.marca.toLowerCase().includes(q),
    )
    .slice(0, 8)
})*/

function onProductoChange(item: LocalItem): void {
  const producto = productoStore.getById(item.productoId)
  if (!producto) return
  item.precioOfrecido = Number(producto.precioOfrecido) || 0
  item.precioFinal = Number(producto.precioFinal) || 0
  item.productoNombre = producto.nombre || ''
}

function onReferenciaTipoChange(): void {
  const template = plantillas.value.find((entry) => entry.tipo === referenciaTipo.value)
  if (!template) return
  referenciaTexto.value = template.textoBase || referenciaTexto.value
}

function aplicarRutaRapidaST3(): void {
  const casaMatriz = sucursalStore.activas.find((sucursal) => /casa matriz/i.test(sucursal.nombre))
  const st3 = sucursalStore.activas.find((sucursal) => /s-t3/i.test(sucursal.nombre))
  if (!casaMatriz || !st3) return
  sucursalOrigen.value = casaMatriz.id
  sucursalDestino.value = st3.id
}

function buildPayload() {
  return {
    cabeceraId: props.initialData?.id,
    tipo: props.tipo,
    modo: modo.value,
    sucursalId: props.tipo === 'TRANSFERENCIA' ? undefined : sucursalId.value,
    sucursalOrigen: props.tipo === 'TRANSFERENCIA' ? sucursalOrigen.value : sucursalId.value,
    sucursalDestino: props.tipo === 'TRANSFERENCIA' ? sucursalDestino.value : undefined,
    fechaRegistro: fechaRegistro.value,
    referenciaTipo: referenciaTipo.value,
    referenciaTexto: referenciaTexto.value,
    notas: notas.value,
    items: items.value.map((item) => ({
      productoId: item.productoId,
      cantidad: Number(item.cantidad) || 0,
      precioOfrecido: Number(item.precioOfrecido) || 0,
      precioFinal: Number(item.precioFinal) || 0,
      detalleAccion: item.detalleAccion || '',
    })),
  }
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return
  if (!items.value.length || items.value.some((item) => !item.productoId || item.cantidad <= 0)) {
    notifyError('Completa todas las líneas del movimiento')
    return
  }

  loading.value = true
  try {
    if (props.initialData?.id) {
      await inventarioService.updateMovimiento(buildPayload() as MovimientoUpdatePayload)
      notifySuccess('Movimiento actualizado correctamente')
    } else {
      await inventarioService.createMovimientoMasivo(buildPayload())
      notifySuccess('Movimiento registrado correctamente')
    }
    emit('saved')
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    loading.value = false
  }
}

function fillFromInitialData(): void {
  if (!props.initialData) {
    items.value = [createEmptyItem()]
    return
  }
  modo.value = props.initialData.modo || 'UNITARIO'
  fechaRegistro.value = String(props.initialData.fechaRegistro || '').slice(0, 16)
  sucursalId.value =
    props.initialData.sucursalOrigen ||
    props.initialData.sucursalDestino ||
    authStore.sucursalId ||
    ''
  sucursalOrigen.value = props.initialData.sucursalOrigen || authStore.sucursalId || ''
  sucursalDestino.value = props.initialData.sucursalDestino || ''
  referenciaTipo.value = props.initialData.referenciaTipo || 'OTRO'
  referenciaTexto.value = props.initialData.referenciaTexto || ''
  notas.value = props.initialData.notas || ''
  items.value = (props.initialData.items || []).map((item) => ({
    ...item,
    localId: `${item.productoId}-${Math.random()}`,
  }))
  if (!items.value.length) items.value = [createEmptyItem()]
}

watch(() => props.initialData, fillFromInitialData, { immediate: true })

onMounted(async () => {
  if (!sucursalStore.items.length) await sucursalStore.fetchAll()
  if (!productoStore.items.length) await productoStore.fetchAll()
  plantillas.value = await inventarioService.getMovimientoPlantillasReferencia()
  if (!items.value.length) items.value = [createEmptyItem()]
})
</script>

<style scoped lang="scss">
.movimiento-form-card {
  min-width: 920px;
  max-width: 80vw;
}

.mov-row {
  border: 1px solid var(--sgi-border);
  border-radius: var(--sgi-radius);
  background: var(--sgi-surface-alt);
}
</style>
