<template>
  <div class="carrito-item q-pa-sm q-mb-sm">
    <div class="row items-start no-wrap">
      <q-avatar size="42px" square rounded class="q-mr-sm">
        <ProductoImagenIFrame
          v-if="item.imagenUrl"
          :imagen-url="item.imagenUrl"
          :width="42"
          :height="42"
          :imagen-location="item.imagenLocation"
        />
        <q-icon v-else name="inventory_2" color="grey-4" size="28px" />
      </q-avatar>

      <div class="col min-w-0">
        <div class="row items-start">
          <div class="col min-w-0">
            <div class="text-weight-medium ellipsis">{{ item.nombre }}</div>
            <div class="text-caption text-muted">{{ item.sku }} · {{ item.marca }}</div>
          </div>
          <q-btn
            flat
            round
            dense
            size="xs"
            icon="close"
            color="negative"
            class="q-ml-sm"
            @click="emit('quitar', item.productoId)"
          >
            <q-tooltip>Quitar</q-tooltip>
          </q-btn>
        </div>

        <div class="row q-col-gutter-sm q-mt-sm">
          <div class="col-12 col-sm-4">
            <div class="text-caption text-muted q-mb-xs">Cantidad</div>
            <div class="row items-center no-wrap" style="gap: 4px">
              <q-btn
                round
                unelevated
                size="xs"
                color="grey-3"
                text-color="grey-8"
                icon="remove"
                @click="emit('cambiar-cantidad', item.productoId, item.cantidad - 1)"
              />
              <span class="text-weight-bold text-center cantidad-box">
                {{ item.cantidad }}
              </span>
              <q-btn
                round
                unelevated
                size="xs"
                color="grey-3"
                text-color="grey-8"
                icon="add"
                :disable="item.cantidad >= item.stockDisponible"
                @click="emit('cambiar-cantidad', item.productoId, item.cantidad + 1)"
              />
            </div>
          </div>

          <div class="col-12 col-sm-4">
            <q-input
              :model-value="item.precioUnitario"
              label="Precio final"
              type="number"
              outlined
              dense
              min="0"
              step="0.01"
              :disable="!canEditarPrecio"
              @update:model-value="emit('cambiar-precio', item.productoId, Number($event) || 0)"
            />
          </div>

          <div class="col-12 col-sm-4">
            <div class="text-caption text-muted q-mb-xs">Precio lista</div>
            <div class="text-body2 text-weight-medium">{{ formatCurrency(item.precioLista) }}</div>
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mt-xs">
          <div class="col-12 col-sm-4">
            <q-select
              :model-value="item.descuentoTipo"
              :options="descuentoOptions"
              emit-value
              map-options
              outlined
              dense
              label="Descuento"
              :disable="!canAplicarDescuento"
              @update:model-value="onTipoDescuento"
            />
          </div>
          <div class="col-12 col-sm-4">
            <q-input
              :model-value="item.descuentoValor"
              label="Valor desc."
              type="number"
              outlined
              dense
              min="0"
              step="0.01"
              :disable="!canAplicarDescuento || item.descuentoTipo === 'NINGUNO'"
              @update:model-value="emit('cambiar-descuento', item.productoId, item.descuentoTipo, Number($event) || 0)"
            />
          </div>
          <div class="col-12 col-sm-4">
            <div class="text-caption text-muted q-mb-xs">Subtotal</div>
            <div class="text-subtitle2 text-weight-bold text-positive">
              {{ formatCurrency(item.subtotal) }}
            </div>
            <div v-if="item.descuentoMonto > 0" class="text-caption text-warning">
              Desc.: {{ formatCurrency(item.descuentoMonto) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ItemCarrito, TipoDescuento } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useAuthStore } from 'src/stores/authStore'

const props = defineProps<{ item: ItemCarrito }>()
const emit = defineEmits<{
  quitar: [productoId: string]
  'cambiar-cantidad': [productoId: string, cantidad: number]
  'cambiar-precio': [productoId: string, precioUnitario: number]
  'cambiar-descuento': [productoId: string, descuentoTipo: TipoDescuento, descuentoValor: number]
}>()

const authStore = useAuthStore()
const canEditarPrecio = computed(() => authStore.can('pos.editar_precio'))
const canAplicarDescuento = computed(() => authStore.can('pos.aplicar_descuento'))

const descuentoOptions = [
  { label: 'Sin descuento', value: 'NINGUNO' },
  { label: 'Monto', value: 'MONTO' },
  { label: 'Porcentaje', value: 'PORCENTAJE' },
]

function onTipoDescuento(value: TipoDescuento): void {
  emit('cambiar-descuento', props.item.productoId, value, value === 'NINGUNO' ? 0 : props.item.descuentoValor)
}
</script>

<style scoped lang="scss">
.carrito-item {
  border-radius: var(--sgi-radius);
  background: var(--sgi-surface-alt);
  border: 1px solid var(--sgi-border);
}

.cantidad-box {
  min-width: 28px;
}

.min-w-0 {
  min-width: 0;
}
</style>
