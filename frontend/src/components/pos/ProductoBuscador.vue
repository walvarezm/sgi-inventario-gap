<template>
  <div class="buscador-producto">
    <!-- Input de búsqueda -->
    <q-input
      v-model="modelValue"
      :label="label"
      outlined
      dense
      clearable
      autofocus
      @update:model-value="emit('update:modelValue', $event ?? '')"
      @keydown.enter="seleccionarPrimero"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
      <template #append>
        <q-icon name="qr_code_scanner" color="primary" class="cursor-pointer"
          @click="emit('escanear')">
          <q-tooltip>Escanear QR</q-tooltip>
        </q-icon>
      </template>
    </q-input>

    <!-- Resultados desplegables -->
    <q-list
      v-if="resultados.length"
      bordered separator
      class="buscador-resultados sgi-card"
    >
      <q-item
        v-for="producto in resultados"
        :key="producto.id"
        clickable v-ripple
        :disable="producto.stock <= 0"
        @click="emit('seleccionar', producto)"
      >
        <q-item-section avatar>
          <q-avatar size="40px" square rounded>
            <img v-if="producto.imagenUrl" :src="producto.imagenUrl" loading="lazy" />
            <q-icon v-else name="inventory_2" color="grey-4" />
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label>
            <span class="text-weight-bold text-mono">{{ producto.sku }}</span>
            — {{ producto.nombre }}
          </q-item-label>
          <q-item-label caption>{{ producto.marca }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="text-right">
            <div class="text-positive text-weight-bold">
              {{ formatCurrency(producto.precioFinal) }}
            </div>
            <q-chip
              dense size="xs"
              :color="producto.stock <= 0 ? 'grey' : producto.stockBajo ? 'orange' : 'positive'"
              text-color="white"
            >
              Stock: {{ producto.stock }}
            </q-chip>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import type { ProductoCatalogo } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'

interface Props {
  modelValue: string
  resultados: ProductoCatalogo[]
  label?: string
}
withDefaults(defineProps<Props>(), {
  label: 'Buscar producto por SKU, nombre o marca…',
})

const emit = defineEmits<{
  'update:modelValue': [val: string]
  'seleccionar': [producto: ProductoCatalogo]
  'escanear': []
}>()

function seleccionarPrimero(): void {
  // handled via enter key — the parent decides which product to add
}
</script>

<style scoped lang="scss">
.buscador-producto { position: relative; }
.buscador-resultados {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  z-index: 9999;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: var(--sgi-shadow-lg);
}
.text-mono { font-family: monospace; }
</style>
