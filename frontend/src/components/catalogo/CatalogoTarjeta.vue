<template>
  <div>
    <div
      v-if="!productos.length && !loading"
      class="full-width column flex-center q-pa-xl text-muted"
    >
      <q-icon name="menu_book" size="48px" style="opacity: 0.3" class="q-mb-md" />
      <span>No hay productos en el catálogo</span>
    </div>

    <div v-if="loading" class="row q-col-gutter-sm q-col-gutter-md-md">
      <div v-for="n in 8" :key="n" class="col-12 col-sm-6 col-md-4 col-lg-3">
        <q-card class="sgi-card" flat>
          <q-skeleton height="140px" square />
          <q-card-section class="q-gutter-xs">
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="80%" />
            <q-skeleton type="text" width="40%" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div v-else class="row q-col-gutter-sm q-col-gutter-md-md">
      <div
        v-for="producto in productos"
        :key="producto.id"
        class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-3"
      >
        <q-card class="sgi-card catalogo-card" flat>
          <div
            class="card-image-wrapper"
            :class="{ 'card-image-wrapper--clickable': !!producto.imagenUrl }"
            @click="producto.imagenUrl && emit('ver-image', producto)"
          >
            <ProductoImagenIFrame
              :imagen-url="producto.imagenUrl"
              :width="120"
              :height="65"
              :imagen-location="producto.imagenLocation"
              type="card"
            />

            <div class="card-image-overlay">
              <q-btn
                round
                unelevated
                size="xs"
                color="primary"
                text-color="white"
                icon="qr_code"
                class="card-fab card-fab--qr"
                @click.stop="emit('ver-qr', producto)"
              >
                <q-tooltip>Ver QR</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canEdit"
                round
                unelevated
                size="xs"
                color="purple"
                text-color="white"
                icon="edit"
                class="card-fab card-fab--edit"
                @click.stop="emit('editar', producto)"
              >
                <q-tooltip>Editar producto</q-tooltip>
              </q-btn>
            </div>
          </div>

          <q-card-section class="q-pb-xs q-pt-sm">
            <div class="row items-center no-wrap q-mb-xs">
              <span class="catalogo-card__marca text-caption text-weight-bold text-muted ellipsis">
                {{ producto.marca }}
              </span>
              <q-space />
              <span class="catalogo-card__sku text-caption text-weight-bold text-mono">
                {{ producto.sku }}
              </span>
            </div>

            <div class="text-subtitle2 text-weight-bold ellipsis-2-lines">
              {{ producto.nombre }}
              <q-tooltip>{{ producto.nombre }}</q-tooltip>
            </div>
            <div
              v-if="producto.descripcion && producto.nombre !== producto.descripcion"
              class="catalogo-card__description text-caption text-muted ellipsis-2-lines"
            >
              {{ producto.descripcion }}
            </div>
          </q-card-section>

          <q-separator class="q-mx-md" />

          <q-card-section class="q-py-sm">
            <div class="catalogo-card__prices">
              <div
                v-if="canViewPurchasePrice"
                class="catalogo-card__price catalogo-card__price--purchase"
              >
                <span class="catalogo-card__price-label">P.Compra</span>
                <strong class="catalogo-card__price-value">
                  {{ formatNotCurrency(Number(producto.precioCompra) || 0) }}
                </strong>
              </div>
              <div
                v-if="producto.precioOfrecido >= producto.precioFinal"
                class="catalogo-card__price catalogo-card__price--list"
              >
                <span class="catalogo-card__price-label">P.Venta</span>
                <strong class="catalogo-card__price-value text-info">
                  {{ formatNotCurrency(producto.precioOfrecido) }}
                </strong>
              </div>
              <div class="catalogo-card__price catalogo-card__price--final">
                <span class="catalogo-card__price-label">P.Final</span>
                <strong class="catalogo-card__price-value">
                  {{ formatNotCurrency(producto.precioFinal) }}
                </strong>
              </div>
            </div>
          </q-card-section>

          <q-card-section class="q-py-sm row items-center q-col-gutter-xs">
            <div class="col-auto">
              <q-chip
                dense
                size="sm"
                :color="stockColor(producto).chip"
                :text-color="stockColor(producto).text"
                :icon="stockColor(producto).icon"
                :label="`Stock: ${producto.stock}`"
              />
            </div>
            <div class="col" />
            <div v-if="producto.stockBajo && producto.stock > 0" class="col-auto">
              <q-chip dense size="sm" color="orange-2" text-color="orange-9" label="Stock bajo" />
            </div>
            <div v-if="producto.stock === 0" class="col-auto">
              <q-chip dense size="sm" color="grey-3" text-color="grey-7" label="Sin stock" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductoCatalogo } from 'src/types'
import { computed } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { formatCurrency, formatNotCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'ver-image': [producto: ProductoCatalogo]
  'ver-qr': [producto: ProductoCatalogo]
  editar: [producto: ProductoCatalogo]
}>()

const authStore = useAuthStore()
const canEdit = computed(() => authStore.can('productos.editar'))
const canViewPurchasePrice = computed(() => authStore.can('productos.editar'))

function stockColor(producto: ProductoCatalogo): { chip: string; text: string; icon: string } {
  if (producto.stock === 0) return { chip: 'grey-3', text: 'grey-7', icon: 'remove_circle_outline' }
  if (producto.stockBajo) return { chip: 'orange-2', text: 'orange-9', icon: 'warning' }
  return { chip: 'green-2', text: 'green-9', icon: 'check_circle' }
}
</script>

<style scoped lang="scss">
.catalogo-card {
  transition:
    box-shadow 0.2s,
    transform 0.15s;
  cursor: default;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--sgi-radius-lg);

  &:hover {
    box-shadow: var(--sgi-shadow-lg);
    transform: translateY(-4px);
  }

  > .q-card__section:last-child {
    margin-top: auto;
  }
}

.card-image-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: var(--sgi-radius-lg) var(--sgi-radius-lg) 0 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--sgi-primary) 8%, transparent), transparent),
    var(--sgi-surface-alt);
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(.q-img) {
    width: 100%;
    height: 100%;
  }

  :deep(.imagen-preview) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.card-image-wrapper--clickable {
  cursor: pointer;
}

.card-image-overlay {
  position: absolute;
  bottom: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.card-image-wrapper:hover .card-image-overlay {
  opacity: 1;
}

@media (hover: none) {
  .card-image-overlay {
    opacity: 1;
  }
}

.card-fab {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  width: 28px;
  height: 28px;

  .q-icon {
    font-size: 16px;
  }
}

.catalogo-card__marca {
  color: var(--sgi-warning);
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}

.catalogo-card__sku {
  color: var(--sgi-text-muted);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.catalogo-card__description {
  min-height: 2.2em;
  font-size: 0.75rem;
}

.catalogo-card__prices {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.catalogo-card__price {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 7px !important;
  border: 1px solid var(--sgi-border);
  border-radius: 5px;
  background: color-mix(in srgb, var(--sgi-surface) 84%, transparent);
}

.catalogo-card__price-label {
  color: var(--sgi-text-muted);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.catalogo-card__price-value {
  font-size: 0.85rem;
  text-align: right;
  font-weight: 800;
}

.catalogo-card__price--purchase .catalogo-card__price-value {
  color: var(--sgi-primary);
}

.catalogo-card__price--list .catalogo-card__price-value {
  color: var(--sgi-secondary);
}

.catalogo-card__price--final .catalogo-card__price-value {
  color: var(--sgi-positive);
  font-size: 0.95rem;
}

.text-mono {
  font-family: monospace;
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 599px) {
  .catalogo-card__prices {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .catalogo-card__price {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
  }

  .catalogo-card__price-value {
    font-size: 0.9rem;
  }

  .catalogo-card__price--final .catalogo-card__price-value {
    font-size: 0.95rem;
  }
}

@media (min-width: 600px) and (max-width: 1023px) {
  .catalogo-card__prices {
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .catalogo-card__price--final {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

@media (min-width: 1024px) and (max-width: 1439px) {
  .catalogo-card__prices {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
}

@media (min-width: 1440px) {
  .catalogo-card__prices {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .catalogo-card__price {
    padding: 8px 10px;
  }

  .catalogo-card__price-value {
    font-size: 0.9rem;
  }
}
</style>
