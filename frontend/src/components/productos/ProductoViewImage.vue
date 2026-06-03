<template>
  <!-- Dialog IMG -->
  <q-dialog v-model="isOpen" persistent>
    <q-card class="sgi-card q-pa-md text-center" style="width: 700px; max-width: 80vw">
      <q-card-section class="row items-center q-pt-none q-pb-md">
        <div class="text-subtitle1 text-weight-bold">Código producto: {{ producto?.sku }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="emit('cancelled')" />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <ProductoImagenIFrame
          :imagen-url="String(producto?.imagenUrl)"
          :width="80"
          :height="80"
          :imagen-location="producto?.imagenLocation"
          :type="'card'"
        />
        <div class="text-caption text-muted q-mt-md">{{ producto?.nombre }}</div>
      </q-card-section>
      <q-separator />
      <q-card-actions align="right" class="q-pt-md q-pb-none">
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
