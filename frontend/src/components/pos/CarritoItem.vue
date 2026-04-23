<template>
  <div class="carrito-item row items-center q-pa-sm q-mb-xs">
    <!-- Imagen -->
    <q-avatar size="40px" square rounded class="q-mr-sm">
      <img v-if="item.imagenUrl" :src="item.imagenUrl" loading="lazy" />
      <q-icon v-else name="inventory_2" color="grey-4" size="28px" />
    </q-avatar>

    <!-- Info producto -->
    <div class="col">
      <div class="text-weight-medium ellipsis" style="max-width:180px">{{ item.nombre }}</div>
      <div class="text-caption text-muted">{{ item.sku }} · {{ formatCurrency(item.precioUnitario) }}</div>
    </div>

    <!-- Cantidad -->
    <div class="row items-center q-mx-sm" style="gap:4px">
      <q-btn
        round unelevated size="xs" color="grey-3" text-color="grey-8" icon="remove"
        @click="emit('cambiar-cantidad', item.productoId, item.cantidad - 1)"
      />
      <span class="text-weight-bold" style="min-width:28px; text-align:center">
        {{ item.cantidad }}
      </span>
      <q-btn
        round unelevated size="xs" color="grey-3" text-color="grey-8" icon="add"
        :disable="item.cantidad >= item.stockDisponible"
        @click="emit('cambiar-cantidad', item.productoId, item.cantidad + 1)"
      />
    </div>

    <!-- Subtotal -->
    <div class="text-weight-bold text-positive" style="min-width:80px; text-align:right">
      {{ formatCurrency(item.subtotal) }}
    </div>

    <!-- Quitar -->
    <q-btn flat round dense size="xs" icon="close" color="negative" class="q-ml-xs"
      @click="emit('quitar', item.productoId)">
      <q-tooltip>Quitar</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import type { ItemCarrito } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'

defineProps<{ item: ItemCarrito }>()

const emit = defineEmits<{
  'quitar': [productoId: string]
  'cambiar-cantidad': [productoId: string, cantidad: number]
}>()
</script>

<style scoped lang="scss">
.carrito-item {
  border-radius: var(--sgi-radius);
  background: var(--sgi-surface-alt);
  border: 1px solid var(--sgi-border);
  transition: background 0.15s;
  &:hover { background: rgba(21, 101, 192, 0.04); }
}
</style>
