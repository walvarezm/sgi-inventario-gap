<template>
  <tr
    :class="[
      'detalle-row',
      { 'detalle-row--editing': isEditing },
      { 'detalle-row--saving': isSaving },
      { 'detalle-row--deleted': isDeleted },
    ]"
  >
    <!-- # -->
    <td class="text-center text-caption text-grey-6 q-px-sm" style="width: 40px">
      {{ rowIndex + 1 }}
    </td>

    <!-- Secuencial -->
    <td style="width: 60px" class="q-px-xs text-center">
      <template v-if="isEditing">
        <q-input
          v-model.number="draft.secuencial"
          outlined
          dense
          borderless
          type="number"
          input-class="text-center"
          style="min-width: 70px"
        />
      </template>
      <span v-else class="text-caption text-grey-3">{{ item.secuencial || '—' }}</span>
    </td>

    <!-- Producto -->
    <td class="q-px-xs" style="min-width: 220px; max-width: 340px">
      <template v-if="isEditing">
        <q-select
          v-model="draft.productoId"
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
          @update:model-value="onProductoChange"
        >
          <template #selected-item="scope">
            <span class="ellipsis-text">
              {{ scope.opt?.label ?? productoLabel(draft.productoId) }}
            </span>
            <q-tooltip>{{ scope.opt?.label ?? productoLabel(draft.productoId) }}</q-tooltip>
          </template>
        </q-select>
      </template>
      <div v-else>
        <div class="text-weight-medium ellipsis-text">{{ productoLabel(item.productoId) }}</div>
        <q-tooltip>{{ productoLabel(item.productoId) }}</q-tooltip>
        <!--        <div v-if="item.productoSku" class="text-caption text-grey-6">{{ item.productoSku }}</div>-->
      </div>
    </td>

    <!-- Cantidad -->
    <td class="text-center q-px-xs" style="width: 90px">
      <template v-if="isEditing">
        <q-input
          v-model.number="draft.cantidad"
          outlined
          dense
          borderless
          type="number"
          min="1"
          input-class="text-center"
        />
      </template>
      <span v-else class="text-weight-bold">{{ item.cantidad }}</span>
    </td>

    <!-- Precio Venta -->
    <td class="text-right q-px-xs" style="width: 110px">
      <template v-if="isEditing && canEditPrices">
        <q-input
          v-model.number="draft.precioOfrecido"
          outlined
          dense
          borderless
          type="number"
          step="0.01"
          input-class="text-right"
          @update:model-value="draft.precioFinal = Number($event)"
        />
      </template>
      <span v-else class="text-caption text-info">{{ formatCurrency(item.precioOfrecido) }}</span>
    </td>

    <!-- Precio Final -->
    <td class="text-right q-px-xs" style="width: 110px">
      <template v-if="isEditing && canEditPrices">
        <q-input
          v-model.number="draft.precioFinal"
          outlined
          dense
          borderless
          type="number"
          step="0.01"
          input-class="text-right"
        />
      </template>
      <span v-else class="text-body2 text-weight-bold text-green">
        {{ formatCurrency(item.precioFinal) }}
      </span>
    </td>

    <!-- Observación -->
    <td class="q-px-xs" style="max-width: 150px">
      <template v-if="isEditing">
        <q-input v-model="draft.detalleAccion" outlined dense borderless placeholder="—" />
      </template>
      <span v-else class="text-caption text-grey-3 product-name-with-ellipsis">
        {{ item.detalleAccion || '—' }}
      </span>
      <q-tooltip v-if="item.detalleAccion">{{ item.detalleAccion }}</q-tooltip>
    </td>

    <!-- Acciones -->
    <td class="text-center q-px-xs" style="width: 110px">
      <!-- Modo visualización -->
      <template v-if="!isEditing && !isDeleted">
        <q-btn
          v-if="canEdit"
          flat
          round
          dense
          size="sm"
          icon="edit"
          color="primary"
          :disable="isSaving"
          @click="startEdit"
        >
          <q-tooltip>Editar esta línea</q-tooltip>
        </q-btn>
        <q-btn
          v-if="canEdit"
          flat
          round
          dense
          size="sm"
          icon="delete"
          color="negative"
          :disable="isSaving || isOnlyRow"
          :loading="isDeleting"
          @click="confirmDelete"
        >
          <q-tooltip>
            {{ isOnlyRow ? 'No se puede eliminar la única línea' : 'Eliminar esta línea' }}
          </q-tooltip>
        </q-btn>
      </template>

      <!-- Modo edición -->
      <template v-if="isEditing">
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="check"
          color="positive"
          :loading="isSaving"
          :disable="!isDirty || !isValid"
          @click="saveItem"
        >
          <q-tooltip>Guardar cambios de esta línea</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="close"
          color="grey"
          :disable="isSaving"
          @click="cancelEdit"
        >
          <q-tooltip>Cancelar edición</q-tooltip>
        </q-btn>
      </template>

      <!-- Eliminado -->
      <template v-if="isDeleted">
        <q-chip dense color="negative" text-color="white" size="sm" icon="delete">Eliminado</q-chip>
      </template>
    </td>
  </tr>

  <!-- Confirmación de eliminación inline (fila extra) -->
  <tr v-if="showDeleteConfirm" class="delete-confirm-row">
    <td colspan="8" class="q-pa-xs">
      <q-banner dense rounded class="bg-red-1 text-negative">
        <template #avatar><q-icon name="warning" color="negative" /></template>
        <span class="text-caption">
          ¿Eliminar la línea
          <strong>{{ productoLabel(item.productoId) }}</strong>
          ? El stock afectado por esta línea será revertido.
        </span>
        <template #action>
          <q-btn
            flat
            dense
            label="Sí, eliminar"
            color="negative"
            :loading="isDeleting"
            @click="executeDelete"
          />
          <q-btn
            flat
            dense
            label="Cancelar"
            color="grey"
            :disable="isDeleting"
            @click="showDeleteConfirm = false"
          />
        </template>
      </q-banner>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useProductoStore } from 'src/stores/productoStore'
import { useAuthStore } from 'src/stores/authStore'
import { inventarioService } from 'src/services/inventarioService'
import { useNotify } from 'src/composables/useNotify'
import { truncate } from 'src/utils/formatters'
import type { MovimientoDetalleItem, TipoMovimiento } from 'src/types'

// ── Props / Emits ────────────────────────────────────────────────────────────
const props = defineProps<{
  item: MovimientoDetalleItem
  rowIndex: number
  cabeceraId: string
  tipo: TipoMovimiento
  totalRows: number
  sucursalOrigen?: string | null
  sucursalDestino?: string | null
}>()

const emit = defineEmits<{
  saved: [updated: MovimientoDetalleItem]
  deleted: [productoId: string]
}>()

// ── Stores / composables ─────────────────────────────────────────────────────
const productoStore = useProductoStore()
const authStore = useAuthStore()
const { notifySuccess, notifyError } = useNotify()

// ── Estado local ─────────────────────────────────────────────────────────────
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const isDeleted = ref(false)
const showDeleteConfirm = ref(false)

const draft = reactive<MovimientoDetalleItem>({
  id: props.item.id,
  movimientoOrigenId: props.item.movimientoOrigenId,
  productoId: props.item.productoId,
  productoSku: props.item.productoSku,
  productoNombre: props.item.productoNombre,
  cantidad: props.item.cantidad,
  precioOfrecido: props.item.precioOfrecido,
  precioFinal: props.item.precioFinal,
  detalleAccion: props.item.detalleAccion,
  secuencial: props.item.secuencial,
})

// ── Permisos ─────────────────────────────────────────────────────────────────
const canEdit = computed(
  () =>
    authStore.can('inventario.editar_movimientos') ||
    authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)
const canEditPrices = computed(
  () =>
    authStore.can('inventario.editar_precios_movimiento') ||
    authStore.hasRole(['ADMINISTRADOR', 'SUPERVISOR']),
)
const isOnlyRow = computed(() => props.totalRows <= 1)

// ── Validación / suciedad ────────────────────────────────────────────────────
const isDirty = computed(
  () =>
    draft.productoId !== props.item.productoId ||
    draft.cantidad !== props.item.cantidad ||
    draft.precioOfrecido !== props.item.precioOfrecido ||
    draft.precioFinal !== props.item.precioFinal ||
    draft.detalleAccion !== props.item.detalleAccion ||
    Number(draft.secuencial) !== Number(props.item.secuencial),
)

const isValid = computed(() => !!draft.productoId && (draft.cantidad ?? 0) > 0)

// ── Opciones de producto ─────────────────────────────────────────────────────
const opcionesProducto = ref(
  productoStore.activos.map((p) => ({
    label: truncate(`[${p.marca}][${p.sku}] — ${p.nombre}`, 100),
    value: p.id,
  })),
)

function filtrarProductos(val: string, update: (fn: () => void) => void): void {
  update(() => {
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

function productoLabel(productoId: string): string {
  const p = productoStore.getById(productoId)
  return p ? truncate(`[${p.marca}] [${p.sku}] ${p.nombre}`, 280) : productoId
}

function onProductoChange(): void {
  const p = productoStore.getById(draft.productoId)
  if (!p) return
  if (!draft.precioOfrecido) draft.precioOfrecido = Number(p.precioOfrecido) || 0
  if (!draft.precioFinal) draft.precioFinal = Number(p.precioFinal) || 0
}

// ── Formateo ─────────────────────────────────────────────────────────────────
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '—'
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ── Edición ──────────────────────────────────────────────────────────────────
function startEdit(): void {
  Object.assign(draft, {
    id: props.item.id,
    movimientoOrigenId: props.item.movimientoOrigenId,
    productoId: props.item.productoId,
    productoSku: props.item.productoSku,
    productoNombre: props.item.productoNombre,
    cantidad: props.item.cantidad,
    precioOfrecido: props.item.precioOfrecido,
    precioFinal: props.item.precioFinal,
    detalleAccion: props.item.detalleAccion,
    secuencial: props.item.secuencial,
  })
  isEditing.value = true
}

function cancelEdit(): void {
  isEditing.value = false
}

async function saveItem(): Promise<void> {
  if (!isValid.value || !isDirty.value) return
  isSaving.value = true
  try {
    const updated = await inventarioService.updateMovimientoDetalle({
      cabeceraId: props.cabeceraId,
      tipo: props.tipo,
      detalleId: draft.id ?? '',
      productoId: draft.productoId,
      cantidad: Number(draft.cantidad),
      precioOfrecido: Number(draft.precioOfrecido),
      precioFinal: Number(draft.precioFinal),
      detalleAccion: draft.detalleAccion ?? '',
      secuencial: Number(draft.secuencial ?? 0),
      sucursalOrigen: props.sucursalOrigen ?? null,
      sucursalDestino: props.sucursalDestino ?? null,
    })
    emit('saved', updated)
    notifySuccess('Línea actualizada correctamente')
    isEditing.value = false
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    isSaving.value = false
  }
}

// ── Eliminación ───────────────────────────────────────────────────────────────
function confirmDelete(): void {
  showDeleteConfirm.value = true
}

async function executeDelete(): Promise<void> {
  isDeleting.value = true
  try {
    await inventarioService.deleteMovimientoDetalle({
      cabeceraId: props.cabeceraId,
      tipo: props.tipo,
      detalleId: draft.id ?? '',
      productoId: draft.productoId,
      cantidad: Number(draft.cantidad),
      sucursalOrigen: props.sucursalOrigen ?? null,
      sucursalDestino: props.sucursalDestino ?? null,
    })
    isDeleted.value = true
    showDeleteConfirm.value = false
    emit('deleted', draft.productoId)
    notifySuccess('Línea eliminada y stock revertido correctamente')
  } catch (e) {
    notifyError((e as Error).message)
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped lang="scss">
.detalle-row {
  transition: background 0.15s;

  &:hover td {
    background: rgba(25, 118, 210, 0.04);
  }

  &--editing td {
    background: rgba(25, 118, 210, 0.06) !important;
    border-left: 3px solid var(--q-primary, #1976d2);
  }

  &--saving td {
    opacity: 0.65;
    pointer-events: none;
  }

  &--deleted td {
    opacity: 0.38;
    text-decoration: line-through;
    background: rgba(220, 50, 50, 0.05) !important;
  }
}

.delete-confirm-row td {
  padding: 2px 8px 4px;
}

.ellipsis-text {
  display: inline-block;
  max-width: 100%; /*280px;*/
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
