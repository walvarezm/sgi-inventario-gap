<template>
  <div>
    <!-- Sin datos -->
    <div v-if="!productos.length && !loading" class="full-width column flex-center q-pa-xl text-muted">
      <q-icon name="menu_book" size="48px" style="opacity:0.3" class="q-mb-md" />
      <span>No hay productos en el catálogo</span>
    </div>

    <!-- Skeleton loader -->
    <div v-if="loading" class="row q-col-gutter-md">
      <div v-for="n in 8" :key="n" class="col-12 col-sm-6 col-md-4 col-lg-3">
        <q-card class="sgi-card" flat>
          <q-skeleton height="160px" square />
          <q-card-section class="q-gutter-xs">
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="80%" />
            <q-skeleton type="text" width="40%" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Grid de tarjetas -->
    <div v-else class="row q-col-gutter-md">
      <div
        v-for="producto in productos"
        :key="producto.id"
        class="col-12 col-sm-6 col-md-4 col-lg-3"
      >
        <q-card class="sgi-card catalogo-card" flat>
          <!-- Imagen -->
          <div class="card-image-wrapper">
            <q-img
              :src="producto.imagenUrl || ''"
              style="height:160px"
              fit="contain"
              class="catalogo-img"
            >
              <template #error>
                <div class="absolute-full flex flex-center bg-grey-2">
                  <q-icon name="image" color="grey-4" size="48px" />
                </div>
              </template>
            </q-img>

            <!-- Badge stock bajo -->
            <q-badge
              v-if="producto.stockBajo && producto.stock > 0"
              floating color="orange" label="Stock bajo"
              style="top:8px; right:8px"
            />
            <q-badge
              v-if="producto.stock === 0"
              floating color="grey" label="Sin stock"
              style="top:8px; right:8px"
            />

            <!-- QR button -->
            <q-btn
              round unelevated size="sm" color="white" text-color="primary"
              icon="qr_code"
              class="qr-fab"
              @click="emit('ver-qr', producto)"
            >
              <q-tooltip>Ver QR</q-tooltip>
            </q-btn>
          </div>

          <q-card-section class="q-pb-xs">
            <!-- SKU -->
            <div class="text-caption text-muted text-mono q-mb-xs">{{ producto.sku }}</div>

            <!-- Nombre -->
            <div class="text-subtitle2 text-weight-bold ellipsis-2-lines" style="min-height:2.8em">
              {{ producto.nombre }}
            </div>

            <!-- Marca -->
            <div class="text-caption text-muted">{{ producto.marca }}</div>
          </q-card-section>

          <q-card-section class="q-pt-xs">
            <!-- Precios -->
            <div class="row items-baseline q-gutter-xs">
              <span
                v-if="producto.precioOfrecido > producto.precioFinal"
                class="text-caption text-muted"
                style="text-decoration:line-through"
              >
                {{ formatCurrency(producto.precioOfrecido) }}
              </span>
              <span class="text-h6 text-weight-bold text-positive">
                {{ formatCurrency(producto.precioFinal) }}
              </span>
            </div>

            <!-- Stock chip -->
            <div class="q-mt-xs">
              <q-chip
                dense size="sm"
                :color="producto.stock === 0 ? 'grey-3' : producto.stockBajo ? 'orange-2' : 'green-2'"
                :text-color="producto.stock === 0 ? 'grey-6' : producto.stockBajo ? 'orange-9' : 'green-9'"
                :icon="producto.stock === 0 ? 'remove_circle_outline' : producto.stockBajo ? 'warning' : 'check_circle'"
                :label="`Stock: ${producto.stock}`"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductoCatalogo } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'ver-qr': [producto: ProductoCatalogo]
}>()
</script>

<style scoped lang="scss">
.catalogo-card {
  transition: box-shadow 0.2s, transform 0.15s;
  cursor: default;
  &:hover {
    box-shadow: var(--sgi-shadow-lg);
    transform: translateY(-2px);
  }
  .card-image-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: var(--sgi-radius-lg) var(--sgi-radius-lg) 0 0;
  }
  .catalogo-img { background: var(--sgi-surface-alt); }
  .qr-fab {
    position: absolute;
    bottom: 8px;
    right: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
}
.text-mono { font-family: monospace; }
.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
