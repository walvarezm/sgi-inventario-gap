<template>
  <div>
    <!-- Sin datos -->
    <div
      v-if="!productos.length && !loading"
      class="full-width column flex-center q-pa-xl text-muted"
    >
      <q-icon name="menu_book" size="48px" style="opacity: 0.3" class="q-mb-md" />
      <span>No hay productos en el catálogo</span>
    </div>

    <!-- Skeleton loader -->
    <div v-if="loading" class="row q-col-gutter-md">
      <div v-for="n in 8" :key="n" class="col-12 col-sm-6 col-md-4 col-xl-3">
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
        class="col-12 col-sm-6 col-md-4 col-xl-3"
      >
        <q-card class="sgi-card catalogo-card" flat>
          <!-- Imagen -->
          <div class="card-image-wrapper">
            <ProductoImagenIFrame
              v-if="!esMovil"
              :imagen-url="producto.imagenUrl"
              :width="40"
              :height="40"
              :imagen-location="producto.imagenLocation"
              :type="'card'"
            ></ProductoImagenIFrame>

<!--            <div v-if="producto.imagenUrl && esMovil" class="placeholder-img"></div>-->

            <!-- Badge stock bajo -->
            <!--            <q-badge
              v-if="producto.stockBajo && producto.stock > 0"
              floating
              color="orange"
              label="Stock bajo"
              style="top: 8px; right: 8px"
            />
            <q-badge
              v-if="producto.stock === 0"
              floating
              color="grey"
              label="Sin stock"
              style="top: 8px; right: 8px"
            />-->

            <!-- QR button -->
            <div v-if="!esMovil" class="card-actions">
              <q-btn
                round
                unelevated
                size="sm"
                color="white"
                text-color="primary"
                icon="qr_code"
                class="qr-fab"
                @click="emit('ver-qr', producto)"
              >
                <q-tooltip>Ver QR</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canEdit"
                round
                unelevated
                size="sm"
                color="white"
                text-color="secondary"
                icon="edit"
                class="edit-fab"
                @click="emit('editar', producto)"
              >
                <q-tooltip>Editar producto</q-tooltip>
              </q-btn>
            </div>
          </div>

          <q-card-section class="q-pb-xs">
            <!-- SKU | Marca-->
            <div class="text-caption text-weight-bold text-muted text-mono q-mb-xs">
              {{ producto.sku }} | {{ producto.marca }}
            </div>

            <!-- Nombre -->
            <div class="text-subtitle2 text-weight-bold ellipsis-2-lines" style="min-height: 2.8em">
              {{ producto.nombre }}
            </div>
            <div
              v-if="producto.descripcion && producto.nombre !== producto.descripcion"
              class="catalogo-card__description text-caption text-muted ellipsis-2-lines q-mt-xs"
            >
              {{ producto.descripcion }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-xs">
            <!-- Precios -->
            <div class="catalogo-card__prices">
              <div
                v-if="canViewPurchasePrice"
                class="catalogo-card__price catalogo-card__price--purchase"
              >
                <span class="catalogo-card__price-label">P. Compra</span>
                <strong>{{ formatCurrency(Number(producto.precioCompra) || 0) }}</strong>
              </div>
              <div
                v-if="producto.precioOfrecido >= producto.precioFinal"
                class="catalogo-card__price catalogo-card__price--list"
              >
                <span class="catalogo-card__price-label">P. Venta</span>
                <strong class="text-strike">{{ formatCurrency(producto.precioOfrecido) }}</strong>
              </div>
              <div class="catalogo-card__price catalogo-card__price--final">
                <span class="catalogo-card__price-label">P. Final</span>
                <strong>{{ formatCurrency(producto.precioFinal) }}</strong>
              </div>
            </div>
          </q-card-section>
          <q-card-section class="row q-pt-none">
            <!-- Stock chip -->
            <div class="col-4 col-md-6 text-left">
              <q-chip
                dense
                size="md"
                :color="
                  producto.stock === 0 ? 'grey-3' : producto.stockBajo ? 'orange-2' : 'green-2'
                "
                :text-color="
                  producto.stock === 0 ? 'grey-6' : producto.stockBajo ? 'orange-9' : 'green-9'
                "
                :icon="
                  producto.stock === 0
                    ? 'remove_circle_outline'
                    : producto.stockBajo
                      ? 'warning'
                      : 'check_circle'
                "
                :label="`Stock: ${producto.stock}`"
              />
            </div>
            <div class="col-4 col-md-6 text-right">
              <!-- Badge stock bajo -->
              <q-chip
                v-if="producto.stockBajo && producto.stock > 0"
                dense
                size="md"
                color="orange"
                label="Stock bajo"
                style="bottom: auto; right: 0"
              />
              <q-chip
                v-if="producto.stock === 0"
                dense
                size="md"
                color="grey"
                label="Sin stock"
                style="bottom: auto; right: 0"
              />
            </div>
            <div v-if="esMovil" class="col-4 col-md-6 text-right">
              <q-btn
                v-if="canEdit"
                round
                unelevated
                size="sm"
                color="white"
                text-color="secondary"
                icon="edit"
                class="edit-fabs"
                @click="emit('editar', producto)"
              >
                <q-tooltip>Editar producto</q-tooltip>
              </q-btn>
              <q-btn
                round
                unelevated
                size="sm"
                color="white"
                text-color="primary"
                icon="qr_code"
                class="qr-fabs q-ml-sm"
                @click="emit('ver-qr', producto)"
              >
                <q-tooltip>Ver QR</q-tooltip>
              </q-btn>
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
import { formatCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useQuasar } from 'quasar'
const $q = useQuasar()

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })

const emit = defineEmits<{
  'ver-qr': [producto: ProductoCatalogo]
  editar: [producto: ProductoCatalogo]
}>()

const authStore = useAuthStore()
const esMovil = computed(() => $q.screen.lt.md)
const canEdit = computed(() => authStore.can('productos.editar'))
const canViewPurchasePrice = computed(() => authStore.can('productos.editar'))
</script>

<style scoped lang="scss">
.catalogo-card {
  transition:
    box-shadow 0.2s,
    transform 0.15s;
  cursor: default;
  height: 100%;

  &:hover {
    box-shadow: var(--sgi-shadow-lg);
    transform: translateY(-6px);
  }

  .card-image-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: var(--sgi-radius-lg) var(--sgi-radius-lg) 0 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--sgi-primary) 10%, transparent), transparent),
      var(--sgi-surface-alt);
  }

  .catalogo-img {
    background: var(--sgi-surface-alt);
  }

  .qr-fab {
    position: absolute;
    bottom: 8px;
    right: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .edit-fab {
    position: absolute;
    bottom: 8px;
    right: 48px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.catalogo-card__description {
  min-height: 2.5em;
  font-size: 0.75rem;
}

.catalogo-card__prices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.catalogo-card__price {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--sgi-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--sgi-surface) 84%, transparent);
}

.catalogo-card__price-label {
  color: var(--sgi-text-muted);
  font-size: 0.72em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.catalogo-card__price--purchase strong {
  color: var(--sgi-primary);
  text-align: right;
}

.catalogo-card__price--list strong {
  color: var(--sgi-primary);
  text-align: right;
}

.catalogo-card__price--final strong {
  color: var(--sgi-positive);
  font-size: 0.95rem;
  text-align: right;
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

.placeholder-img {
  height: 3rem;
  border: 0px dashed var(--sgi-border);
  border-radius: 12px;
  background: var(--sgi-surface-alt);
}

@media (max-width: 599px) {
  .catalogo-card__prices {
    grid-template-columns: 1fr;
  }

  .catalogo-card .edit-fab {
    right: 52px;
  }

  .catalogo-card__price {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}

@media (min-width: 600px) and (max-width: 1023.98px) {
  .catalogo-card__prices {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
