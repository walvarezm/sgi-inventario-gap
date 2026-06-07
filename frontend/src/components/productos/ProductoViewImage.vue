<template>
  <!-- Dialog IMG -->
  <q-dialog v-model="isOpen" persistent>
    <q-card
      class="sgi-card q-pa-md text-center"
      style="width: 700px; max-width: 80vw; max-height: 90vh"
    >
      <q-card-section class="row items-center q-pt-none q-pb-md">
        <div class="text-subtitle1 text-weight-bold">Código producto: {{ producto?.sku }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="emit('cancelled')" />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <ProductoImagenIFrame
          :imagen-url="String(producto?.imagenUrl)"
          :width="90"
          :height="80"
          :imagen-location="producto?.imagenLocation"
          :type="'view'"
        />
        <div class="text-caption text-muted q-mt-md">{{ producto?.nombre }}</div>
      </q-card-section>

      <q-card-actions align="right" class="q-pt-none q-pb-none card-footer">
        <q-btn label="Cerrar" color="primary" v-close-popup @click="emit('cancelled')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Producto } from 'src/types'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

interface Props {
  isOpen: boolean
  producto?: Producto | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ cancelled: [] }>()
const isOpen = computed(() => props.isOpen)
</script>

<style scoped lang="scss">
.card-footer {
  display: flex;
  align-items: center;
  justify-content: end;
  color: var(--sgi-text-muted);
  font-size: 0.8rem;
  padding: 10px 10px;
  margin: 0;
  position: sticky;
  bottom: 0;
  width: auto;
  height: auto !important;
  /*background: var(--sgi-surface-alt);*/
  background: color-mix(in srgb, var(--sgi-surface-alt) 15%, transparent);
  border-top: 1px solid var(--sgi-border);
}
</style>