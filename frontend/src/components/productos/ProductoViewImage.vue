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

<template>
  <q-dialog
    v-model="isOpen"
    maximized
    transition-show="jump-up"
    transition-hide="jump-down"
  >
    <div class="lightbox">
      <header class="lightbox__bar">
        <div class="lightbox__title">
          <q-icon name="image" size="20px" />
          <span class="text-body1 text-weight-bold">Código: {{ producto?.sku }}</span>
        </div>
        <q-space />
        <q-btn
          icon="close"
          flat
          round
          dense
          color="white"
          aria-label="Cerrar"
          @click="emit('cancelled')"
        />
      </header>

      <div class="lightbox__stage">
        <div class="lightbox__image-wrap">
          <ProductoImagenIFrame
            :imagen-url="String(producto?.imagenUrl)"
            :width="100"
            :height="70"
            :imagen-location="producto?.imagenLocation"
            type="view"
          />
        </div>
        <p v-if="producto?.nombre" class="lightbox__caption">{{ producto.nombre }}</p>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.lightbox {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background:
    radial-gradient(circle at top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.96) 70%);
  color: white;
  animation: lightbox-fade 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

.lightbox__bar {
  display: flex;
  align-items: center;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.lightbox__title {
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.92;
}

.lightbox__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 18px;
}

.lightbox__image-wrap {
  max-width: min(90vw, 900px);
  max-height: 75vh;
  display: grid;
  place-items: center;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  padding: 12px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
}

.lightbox__caption {
  margin: 0;
  max-width: 600px;
  text-align: center;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  line-height: 1.4;
}

@keyframes lightbox-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
