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
        <!-- ── Fila 1: Modo / Fecha / Ruta rápida ── -->
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-3">
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
          <div class="col-12 col-sm-2">
            <q-input
              v-model="fechaRegistro"
              label="Fecha del registro"
              outlined
              dense
              type="datetime-local"
            />
          </div>
          <div class="col-12 col-sm-1"></div>
          <div class="col-12 col-sm-6">
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
          </div>

          <div
            v-if="tipo === 'TRANSFERENCIA' && false"
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

        <!-- ── Fila 2: Sucursal(es) ── -->
        <div v-if="false" class="row q-col-gutter-sm">
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

        <!-- ── Fila 3: Referencia / Notas ── -->
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
          <div class="col-12 col-sm-4">
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
          <div class="col-12 col-sm-4">
            <q-input
              v-model="notas"
              label="Notas"
              outlined
              dense
              autogrow
              :hint="detalleTemplateLabel"
            />
          </div>
        </div>

        <q-separator />

        <!-- ══════════════════════════════════════════════════════════
             PANEL DE INGRESO  —  equivalente a OrdenCompraForm
             Visible siempre: búsqueda + cantidad + precios + botón
        ══════════════════════════════════════════════════════════ -->
        <div class="text-subtitle2 text-weight-bold q-mb-xs">Agregar producto</div>

        <div class="row q-col-gutter-sm items-end q-mb-sm">
          <div class="col-6 col-sm-1">
            <q-input v-model="nuevaLinea.secuencial" label="# Linea" outlined dense type="number" />
          </div>
          <!-- Búsqueda de producto -->
          <div class="col-12 col-sm-6">
            <q-select
              v-model="nuevaLinea.productoId"
              :options="opcionesProducto"
              label="Producto"
              outlined
              dense
              use-input
              input-debounce="200"
              emit-value
              map-options
              clearable
              :autofocus="autofocusValue"
              @filter="filtrarProductos"
              @update:model-value="onNuevaLineaProductoChange"
            />
          </div>

          <!-- Cantidad -->
          <div class="col-6 col-sm-1">
            <q-input
              v-model.number="nuevaLinea.cantidad"
              label="Cantidad"
              outlined
              dense
              type="number"
              min="1"
            />
          </div>

          <!-- Precio ofrecido -->
          <div class="col-6 col-sm-1">
            <q-input
              v-model.number="nuevaLinea.precioOfrecido"
              label="P. Venta"
              outlined
              dense
              type="number"
              step="0.01"
              prefix=""
              :disable="!canEditPrices"
              @update:model-value="nuevaLinea.precioFinal = Number($event)"
            />
          </div>

          <!-- Precio final -->
          <div class="col-6 col-sm-1">
            <q-input
              v-model.number="nuevaLinea.precioFinal"
              label="P. final"
              outlined
              dense
              type="number"
              step="0.01"
              prefix=""
              :disable="!canEditPrices"
            />
          </div>

          <!-- Detalle línea -->

          <div class="col-6 col-sm-1">
            <q-input v-model="nuevaLinea.detalleAccion" label="Obs" outlined dense />
          </div>

          <!-- Botón agregar -->
          <div class="col-12 col-sm-1 flex items-center">
            <q-btn
              round
              unelevated
              :color="color"
              icon="add"
              :disable="!nuevaLinea.productoId || nuevaLinea.cantidad < 0"
              @click="agregarDesdePanel"
            >
              <q-tooltip>Agregar producto a la lista</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
             TABLA DE ITEMS  —  formato tabla igual que OrdenCompraForm
        ══════════════════════════════════════════════════════════ -->
        <div class="row items-center q-mb-xs">
          <div class="text-captions text-weight-bold text-grey-4">
            En lista [{{ items.length }}] producto{{ items.length !== 1 ? 's' : '' }}
          </div>
          <q-space />
          <q-btn
            v-if="items.length > 1"
            dense
            color="negative"
            icon="delete_sweep"
            label="Limpiar todo"
            size="sm"
            @click="limpiarFilas"
          />
        </div>

        <q-table
          :rows="items"
          :columns="columnasDetalle"
          row-key="localId"
          flat
          dense
          class="sgi-table"
          no-data-label="Agrega productos usando el panel de arriba"
          :pagination="{ rowsPerPage: 10 }"
        >
          <!-- N° de fila -->
          <template #body-cell-nro="{ rowIndex }">
            <q-td class="text-center text-caption text-grey-6" style="width: 5%">
              {{ rowIndex + 1 }}
            </q-td>
          </template>

          <!-- Detalle editable -->
          <template #body-cell-secuencial="{ row }">
            <q-td style="width: 5%">
              <q-input
                v-model="row.secuencial"
                outlined
                dense
                borderless
                placeholder="—"
                input-class="text-center"
              />
            </q-td>
          </template>

          <!-- Cantidad editable inline -->
          <!--          <template #body-cell-cantidad="{ row }">
            <q-td style="width: 72px">
              <q-input
                v-model.number="row.cantidad"
                outlined
                dense
                borderless
                type="number"
                min="1"
                input-class="text-center"
              />
            </q-td>
          </template>-->

          <!-- Producto: nombre editable inline -->
          <template #body-cell-productoId="{ row }">
            <q-td style="width: 40%">
              <div
                v-if="false"
                class="text-weight-medium product-name-with-ellipsis"
                style="max-width: 100% !important"
              >
                {{ productoStore.getMarcaSkuNameProductById(row.productoId) }}
              </div>
              <q-select
                v-if="true"
                v-model="row.productoId"
                :options="opcionesProducto"
                outlined
                dense
                borderless
                use-input
                input-debounce="200"
                emit-value
                map-options
                clearable
                @filter="filtrarProductos"
                @update:model-value="onProductoChange(row)"
              >
                <template #selected-item="scope">
                  <span class="product-name-with-ellipsis">
                    {{ scope.opt?.label ?? productoLabel(row.productoId) }}
                  </span>
                  <q-tooltip>{{ scope.opt?.label ?? productoLabel(row.productoId) }}</q-tooltip>
                </template>
              </q-select>
            </q-td>
          </template>

          <!-- Cantidad editable inline -->
          <template #body-cell-cantidad="{ row }">
            <q-td style="width: 5%">
              <q-input
                v-model.number="row.cantidad"
                outlined
                dense
                borderless
                type="number"
                min="1"
                input-class="text-center"
              />
            </q-td>
          </template>

          <!-- Precio ofrecido editable -->
          <template #body-cell-precioOfrecido="{ row }">
            <q-td style="width: 10%">
              <q-input
                v-model.number="row.precioOfrecido"
                outlined
                dense
                borderless
                type="number"
                step="0.01"
                :disable="!canEditPrices"
                input-class="text-right"
                @update:model-value="row.precioFinal = Number($event)"
              />
            </q-td>
          </template>

          <!-- Precio final editable -->
          <template #body-cell-precioFinal="{ row }">
            <q-td style="width: 10%">
              <q-input
                v-model.number="row.precioFinal"
                outlined
                dense
                borderless
                type="number"
                step="0.01"
                :disable="!canEditPrices"
                input-class="text-right"
              />
            </q-td>
          </template>

          <!-- Detalle editable -->
          <template #body-cell-detalleAccion="{ row }">
            <q-td style="width: 10%">
              <q-input v-model="row.detalleAccion" outlined dense borderless placeholder="—" />
            </q-td>
          </template>

          <!-- Acciones por fila -->
          <template #body-cell-acciones="{ row, rowIndex }">
            <q-td class="text-center" style="width: 5%">
              <q-btn
                round
                dense
                size="xs"
                icon="content_copy"
                color="primary"
                :disable="modo === 'UNITARIO'"
                @click="duplicarFila(rowIndex)"
              >
                <q-tooltip>Duplicar fila</q-tooltip>
              </q-btn>
              <q-btn
                round
                dense
                size="xs"
                icon="delete"
                color="negative"
                :disable="items.length === 1 && modo === 'UNITARIO'"
                @click="quitarFila(rowIndex)"
              >
                <q-tooltip>
                  Quitar: [{{ row.secuencial }}] - {{ productoLabel(row.productoId) }}
                </q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
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
import { QForm, QTableColumn } from 'quasar'
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
import { useInventario } from 'src/composables/useInventario.ts'

// ── Tipos locales ────────────────────────────────────────────
type LocalItem = MovimientoDetalleItem & { localId: string }

interface NuevaLinea {
  productoId: string
  cantidad: number
  precioOfrecido: number
  precioFinal: number
  detalleAccion: string
  secuencial: number
}

// ── Props / Emits ────────────────────────────────────────────
const props = defineProps<{
  tipo: TipoMovimiento
  title: string
  color: string
  icon: string
  initialData?: MovimientoCabecera | null
}>()

const emit = defineEmits<{ saved: []; cancelled: [] }>()

// ── Stores ───────────────────────────────────────────────────
const authStore = useAuthStore()
const productoStore = useProductoStore()
const sucursalStore = useSucursalStore()
const { notifySuccess, notifyError, notifyWarning } = useNotify()
const { getMovimientoPlantillasReferencia } = useInventario()

// ── Estado reactivo ──────────────────────────────────────────
const formRef = ref<InstanceType<typeof QForm> | null>(null)
//const productoSelec = ref<InstanceType<typeof QSelect> | null>(null)
const loading = ref(false)
const autofocus = ref<boolean>(false)
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

const autofocusValue = computed(() => autofocus.value).value

const ultimoNumeroSecuencial = computed<number>(() => {
  if (!items.value.length) return 1
  const max = Math.max(0, ...items.value.map((i) => Number(i.secuencial) || 0))
  return max + 1
})

/** Panel de ingreso – estado temporal antes de agregar a la tabla */
const nuevaLinea = ref<NuevaLinea>({
  productoId: '',
  cantidad: 1,
  precioOfrecido: 0,
  precioFinal: 0,
  detalleAccion: '',
  secuencial: Number(ultimoNumeroSecuencial.value) || 0,
})

// ── Permisos ─────────────────────────────────────────────────
const canMassive = computed(
  () =>
    authStore.can('inventario.crear_masivo') || authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)
const canEditPrices = computed(
  () =>
    authStore.can('inventario.editar_precios_movimiento') ||
    authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)

// ── Opciones de select ────────────────────────────────────────
const opcionesSucursal = computed(() =>
  authStore.isGlobal
    ? sucursalStore.activas.map((s) => ({ label: `${s.nombre} — ${s.ciudad}`, value: s.id }))
    : sucursalStore.activas
        .filter((s) => s.id === authStore.sucursalId)
        .map((s) => ({ label: s.nombre, value: s.id })),
)

const opcionesDestino = computed(() =>
  opcionesSucursal.value.filter((o) => o.value !== sucursalOrigen.value),
)

const opcionesReferencia = computed(() =>
  plantillas.value.map((t) => ({
    label: String(t.tipo).replace(/_/g, ' '),
    value: t.tipo,
  })),
)

const detalleTemplateLabel = computed(
  () =>
    plantillas.value.find((t) => t.tipo === referenciaTipo.value)?.detalleLabel || 'Detalle libre',
)

const submitLabel = computed(() => (props.initialData ? 'Guardar cambios' : 'Guardar movimiento'))

// ── Productos sin restricción de duplicado ───────────────────
// IDs que pueden registrarse múltiples veces en el mismo comprobante
// (ej: "producto sin código" usado como comodín para ajuste posterior)
const PRODUCTOS_SIN_RESTRICCION = new Set<string>(['f14fe181-7896-4c19-8a92-b87bc8511d09'])

// ── Opciones de producto (filtrable) ─────────────────────────
const opcionesProducto = ref(
  productoStore.activos.map((p) => ({
    label: truncate(`[${p.marca}][${p.sku}] — ${p.nombre}`, 100),
    value: p.id,
  })),
)

function filtrarProductos(val: string, update: (fn: () => void) => void): void {
  update(() => {
    // Divide el criterio en tokens y exige que TODOS estén presentes en algún campo
    const tokens = val
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0)

    opcionesProducto.value = productoStore.activos
      .filter((p) => {
        if (!tokens.length) return true
        const haystack = `${p.sku} ${p.marca} ${p.nombre}`.toLowerCase()
        return tokens.every((t) => haystack.includes(t))
      })
      .map((p) => ({
        label: truncate(`[${p.marca}] - [${p.sku}] — ${p.nombre}`, 100),
        value: p.id,
      }))
  })
}

/** Obtiene el label legible de un productoId para mostrarlo en la tabla */
function productoLabel(productoId: string): string {
  const p = productoStore.getById(productoId)
  return p ? truncate(`[${p.marca}] [${p.sku}] ${p.nombre}`, 100) : productoId
}

// ── Columnas de la tabla ──────────────────────────────────────
const columnasDetalle: QTableColumn[] = [
  { name: 'nro', label: '#', field: 'localId', align: 'center' },
  { name: 'secuencial', label: 'Linea', field: 'secuencial', align: 'center' },
  { name: 'productoId', label: 'Producto', field: 'productoId', align: 'left' },
  { name: 'cantidad', label: 'Cantidad', field: 'cantidad', align: 'center' },
  { name: 'precioOfrecido', label: 'P. Venta', field: 'precioOfrecido', align: 'right' },
  { name: 'precioFinal', label: 'P. final', field: 'precioFinal', align: 'right' },
  { name: 'detalleAccion', label: 'Observación', field: 'detalleAccion', align: 'left' },
  { name: 'acciones', label: '', field: 'localId', align: 'center' },
]

// ── Helpers de items ──────────────────────────────────────────
function createEmptyItem(): LocalItem {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    secuencial: Number(ultimoNumeroSecuencial.value) || 0,
    productoId: '',
    cantidad: 1,
    precioOfrecido: 0,
    precioFinal: 0,
    detalleAccion: '',
  }
}

function resetNuevaLinea(): void {
  nuevaLinea.value = {
    secuencial: Number(ultimoNumeroSecuencial.value) || 0,
    productoId: '',
    cantidad: 1,
    precioOfrecido: 0,
    precioFinal: 0,
    detalleAccion: '',
  }
  autofocus.value = true
}

/** Máximo secuencial actual en la tabla + 1, listo para asignar a la siguiente línea. */
/*const ultimoNumeroSecuencial = computed<number>(() => {
  if (!items.value.length) return 1
  const max = Math.max(0, ...items.value.map((i) => Number(i.secuencial) || 0))
  return max + 1
})*/

function ensureSingleRow(): void {
  if (modo.value === 'UNITARIO') {
    items.value = [items.value[0] ? { ...items.value[0] } : createEmptyItem()]
  }
}

function onModoChange(): void {
  ensureSingleRow()
}

// ── Acciones del panel de ingreso ─────────────────────────────

/**
 * Cuando el usuario selecciona un producto en el panel de ingreso,
 * autocompleta precios.
 */
function onNuevaLineaProductoChange(): void {
  const producto = productoStore.getById(nuevaLinea.value.productoId)
  if (!producto) return
  nuevaLinea.value.precioOfrecido = Number(producto.precioOfrecido) || 0
  nuevaLinea.value.precioFinal = Number(producto.precioFinal) || 0
}

/**
 * Agrega el contenido del panel de ingreso a la tabla.
 * - En modo UNITARIO: reemplaza la única fila existente.
 * - En modo MASIVO:   valida duplicado; si ya existe, acumula cantidad.
 */
function agregarDesdePanel(): void {
  if (!nuevaLinea.value.productoId || nuevaLinea.value.cantidad < 0) return

  if (modo.value === 'UNITARIO') {
    // Reemplaza la única fila
    const existing = items.value[0]
    items.value = [
      {
        localId: existing?.localId ?? `${Date.now()}-${Math.random()}`,
        secuencial: Number(nuevaLinea.value.secuencial),
        productoId: nuevaLinea.value.productoId,
        cantidad: nuevaLinea.value.cantidad,
        precioOfrecido: nuevaLinea.value.precioOfrecido,
        precioFinal: nuevaLinea.value.precioFinal,
        detalleAccion: nuevaLinea.value.detalleAccion,
      },
    ]
    resetNuevaLinea()
    return
  }

  // Modo MASIVO — bloquear duplicado (excepto IDs en PRODUCTOS_SIN_RESTRICCION)
  const existente = items.value.find((i) => i.productoId === nuevaLinea.value.productoId)
  if (existente && !PRODUCTOS_SIN_RESTRICCION.has(nuevaLinea.value.productoId)) {
    notifyError(
      'El producto ya está en la lista. Elimínalo primero o edita directamente en la tabla.',
    )
    return
  }

  // Auto-completar precio si vino vacío
  if (!nuevaLinea.value.precioOfrecido || !nuevaLinea.value.precioFinal) {
    const p = productoStore.getById(nuevaLinea.value.productoId)
    if (p) {
      if (!nuevaLinea.value.precioOfrecido)
        nuevaLinea.value.precioOfrecido = Number(p.precioOfrecido) || 0
      if (!nuevaLinea.value.precioFinal) nuevaLinea.value.precioFinal = Number(p.precioFinal) || 0
    }
  }

  items.value.push({
    localId: `${Date.now()}-${Math.random()}`,
    secuencial: Number(nuevaLinea.value.secuencial),
    productoId: nuevaLinea.value.productoId,
    cantidad: nuevaLinea.value.cantidad,
    precioOfrecido: nuevaLinea.value.precioOfrecido,
    precioFinal: nuevaLinea.value.precioFinal,
    detalleAccion: nuevaLinea.value.detalleAccion,
  })
  resetNuevaLinea()
  autofocus.value = true
}

// ── Acciones sobre filas de la tabla ─────────────────────────

/** Mantiene compatibilidad con código interno (fillFromInitialData, etc.) */
function agregarFila(seed?: Partial<LocalItem>): void {
  autofocus.value = true
  if (modo.value === 'UNITARIO' && items.value.length) return
  items.value.push({ ...createEmptyItem(), ...seed, localId: `${Date.now()}-${Math.random()}` })
}

function duplicarFila(index: number): void {
  console.log('duplicarFila', index, items.value)
  if (modo.value === 'UNITARIO') return
  const source = items.value[index]
  if (!source) return
  // En masivo: bloquear duplicado (excepto IDs en PRODUCTOS_SIN_RESTRICCION)
  const existente = items.value.find(
    (i, idx) => i.productoId === source.productoId && idx !== index,
  )
  if (existente && !PRODUCTOS_SIN_RESTRICCION.has(source.productoId)) {
    notifyError('El producto ya está en la lista. No se puede duplicar.')
    return
  }
  agregarFila({ ...source, id: undefined, movimientoOrigenId: undefined })
}

function quitarFila(index: number): void {
  autofocus.value = false
  if (items.value.length === 1 && modo.value === 'UNITARIO') return
  items.value.splice(index, 1)
  //if (!items.value.length) agregarFila()
}

function limpiarFilas(): void {
  items.value = [] // [createEmptyItem()]
  ensureSingleRow()
}

// ── Cambio de producto en fila de tabla (edición inline) ──────
function onProductoChange(item: LocalItem): void {
  const producto = productoStore.getById(item.productoId)
  if (!producto) return
  item.precioOfrecido = Number(producto.precioOfrecido) || 0
  item.precioFinal = Number(producto.precioFinal) || 0
  item.productoNombre = producto.nombre || ''
}

// ── Referencia ────────────────────────────────────────────────
function onReferenciaTipoChange(): void {
  const template = plantillas.value.find((t) => t.tipo === referenciaTipo.value)
  if (!template) return
  referenciaTexto.value = template.textoBase || referenciaTexto.value
}

function aplicarRutaRapidaST3(): void {
  const casaMatriz = sucursalStore.activas.find((s) => /casa matriz/i.test(s.nombre))
  const st3 = sucursalStore.activas.find((s) => /s-t3/i.test(s.nombre))
  if (!casaMatriz || !st3) return
  sucursalOrigen.value = casaMatriz.id
  sucursalDestino.value = st3.id
}

// ── Submit ────────────────────────────────────────────────────
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
      secuencial: Number(item.secuencial) || 0,
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

  // Validación final anti-duplicados — excluye IDs en PRODUCTOS_SIN_RESTRICCION
  const idsRestringidos = items.value
    .map((i) => i.productoId)
    .filter((id) => !PRODUCTOS_SIN_RESTRICCION.has(id))
  const hasDuplicates = idsRestringidos.length !== new Set(idsRestringidos).size
  if (hasDuplicates) {
    notifyError('Hay productos duplicados en la lista. Consolídalos antes de guardar.')
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

// ── Cargar desde initialData ──────────────────────────────────
function fillFromInitialData(): void {
  autofocus.value = true
  console.log('fillFromInitialData', props.initialData, props)
  if (!props.initialData) {
    items.value = [] //[createEmptyItem()]
    return
  }
  console.log('fillFromInitialData-222', items.value)
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
watch(
  items.value,
  () => {
    console.log('watch items.value', items.value.length, items.value)
  },
  { immediate: true },
)

onMounted(async () => {
  if (!sucursalStore.items.length) await sucursalStore.fetchAll()
  if (!productoStore.items.length) await productoStore.fetchAll()
  plantillas.value = (await getMovimientoPlantillasReferencia()) as ReferenciaMovimientoTemplate[]
  // inventarioService.getMovimientoPlantillasReferencia()
  if (!items.value.length) items.value = [] //[createEmptyItem()]
})
</script>

<style scoped lang="scss">
.movimiento-form-card {
  min-width: 80vw;
  max-width: 80vw;
}

/* Celda de producto en la tabla: evita que el q-select
   desborde verticalmente en modo dense */
.sgi-table :deep(td) {
  padding-top: 2px;
  padding-bottom: 2px;
  vertical-align: middle;
}

/* Truncar texto largo dentro del select de la tabla */
.ellipsis {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
