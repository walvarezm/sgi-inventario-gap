<script setup lang="ts">
import { computed } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { formatNotCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'
import { useQuasar } from 'quasar'

interface Props {
  productos: ProductoCatalogo[]
  loading?: boolean
  showSucursalColumn?: boolean
}
const props = withDefaults(defineProps<Props>(), { loading: false, showSucursalColumn: false })

const emit = defineEmits<{
  'ver-image': [producto: ProductoCatalogo]
  'ver-qr': [producto: ProductoCatalogo]
  editar: [producto: ProductoCatalogo]
}>()

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const $q = useQuasar()
const canEdit = computed(() => authStore.can('productos.editar'))
const canViewPurchasePrice = computed(() => authStore.can('productos.editar'))
const esMovil = computed(() => $q.screen.lt.md)

function getNombreSucursal(id: string): string {
  return sucursalStore.getById(id)?.nombre ?? id
}

function stockState(producto: ProductoCatalogo): {
  tone: 'positive' | 'warning' | 'negative'
  label: string
  icon: string
} {
  if (producto.stock === 0) {
    return { tone: 'negative', label: 'Sin stock', icon: 'remove_circle' }
  }
  if (producto.stockBajo || producto.stock <= producto.stockMinimo) {
    return { tone: 'warning', label: 'Stock bajo', icon: 'warning_amber' }
  }
  return { tone: 'positive', label: 'En stock', icon: 'check_circle' }
}

function hasDiscount(p: ProductoCatalogo): boolean {
  return Number(p.precioOfrecido) > Number(p.precioFinal)
}
</script>

<template>
  <div class="catalogo-grid">
    <!-- Empty state (no data, not loading) -->
    <div v-if="!productos.length && !loading" class="catalogo-empty">
      <div class="catalogo-empty__art">
        <q-icon name="menu_book" size="56px" />
      </div>
      <h3 class="catalogo-empty__title">Catálogo vacío</h3>
      <p class="catalogo-empty__text">No hay productos que coincidan con los filtros aplicados.</p>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div v-for="n in 8" :key="`sk-${n}`" class="catalogo-grid__item">
        <div class="catalogo-card catalogo-card--skeleton">
          <div class="catalogo-card__image">
            <q-skeleton height="100%" square />
          </div>
          <div class="catalogo-card__body">
            <q-skeleton width="40%" />
            <q-skeleton width="80%" />
            <q-skeleton width="60%" />
            <div class="row q-mt-sm q-gutter-sm">
              <q-skeleton width="48px" height="32px" />
              <q-skeleton width="48px" height="32px" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Cards -->
    <div
      v-for="(producto, idx) in productos"
      v-else
      :key="producto.id"
      class="catalogo-grid__item"
      :style="{ '--stagger': `${idx * 35}ms` }"
    >
      <article class="catalogo-card" :class="`catalogo-card--${stockState(producto).tone}`">
        <!-- Stock corner ribbon -->
        <div
          v-if="producto.stock === 0 || producto.stockBajo"
          class="catalogo-card__ribbon"
          :class="`catalogo-card__ribbon--${stockState(producto).tone}`"
          :title="stockState(producto).label"
        >
          <q-icon :name="stockState(producto).icon" size="14px" />
          <span>{{ stockState(producto).label }}</span>
        </div>

        <!-- Image -->
        <div
          class="catalogo-card__image"
          :class="{ 'catalogo-card__image--clickable': !!producto.imagenUrl }"
          @click="producto.imagenUrl && emit('ver-image', producto)"
        >
          <ProductoImagenIFrame
            :imagen-url="producto.imagenUrl"
            :imagen-location="producto.imagenLocation"
            :width="100"
            :height="50"
            type="card"
          />
          <div class="catalogo-card__image-overlay">
            <q-btn
              round
              unelevated
              size="sm"
              color="white"
              text-color="primary"
              icon="qr_code_2"
              class="catalogo-card__fab"
              @click.stop="emit('ver-qr', producto)"
            >
              <q-tooltip anchor="center left" self="center right">Ver QR</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canEdit"
              round
              unelevated
              size="sm"
              color="white"
              text-color="primary"
              icon="edit"
              class="catalogo-card__fab"
              @click.stop="emit('editar', producto)"
            >
              <q-tooltip anchor="center left" self="center right">Editar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Body -->
        <div class="catalogo-card__body">
          <div v-if="props.showSucursalColumn" class="catalogo-card__sucursal-tag">
            <q-icon name="store" size="14px" />
            <span :title="getNombreSucursal(producto.sucursalId)">
              {{ getNombreSucursal(producto.sucursalId) }}
            </span>
          </div>

          <div class="catalogo-card__topline">
            <span class="catalogo-card__marca" :title="producto.marca">{{ producto.marca }}</span>
            <span class="catalogo-card__sku" :title="producto.sku">{{ producto.sku }}</span>
          </div>

          <h3 class="catalogo-card__nombre" :title="producto.nombre">
            {{ producto.nombre }}
          </h3>

          <p
            v-if="producto.descripcion && producto.nombre !== producto.descripcion"
            class="catalogo-card__descripcion"
            :title="producto.descripcion"
          >
            {{ producto.descripcion }}
          </p>

          <!-- Prices -->
          <div class="catalogo-card__prices">
            <div
              v-if="canViewPurchasePrice"
              class="catalogo-card__price catalogo-card__price--purchase"
            >
              <span class="catalogo-card__price-label">Compra</span>
              <span class="catalogo-card__price-value">
                {{ formatNotCurrency(Number(producto.precioCompra) || 0) }}
              </span>
            </div>
            <div
              v-if="hasDiscount(producto)"
              class="catalogo-card__price catalogo-card__price--list"
            >
              <span class="catalogo-card__price-label">Lista</span>
              <span class="catalogo-card__price-value">
                <s>{{ formatNotCurrency(producto.precioOfrecido) }}</s>
              </span>
            </div>
            <div class="catalogo-card__price catalogo-card__price--final">
              <span class="catalogo-card__price-label">
                {{ hasDiscount(producto) ? 'Oferta' : 'Venta' }}
              </span>
              <span class="catalogo-card__price-value">
                Bs. {{ formatNotCurrency(producto.precioFinal) }}
              </span>
            </div>
          </div>
          <!-- Stock + actions -->
          <div class="catalogo-card__footer">
            <div class="catalogo-card__stock">
              <q-icon
                :name="stockState(producto).icon"
                :class="`catalogo-card__stock-icon--${stockState(producto).tone}`"
                size="18px"
              />
              <span class="catalogo-card__stock-value">{{ producto.stock }}</span>
              <span class="catalogo-card__stock-label">en stock</span>
            </div>
            <div v-if="esMovil" class="catalogo-card__actions">
              <q-btn
                round
                unelevated
                size="sm"
                color="primary"
                text-color="white"
                icon="qr_code_2"
                class="catalogo-card__fab"
                @click.stop="emit('ver-qr', producto)"
              >
                <q-tooltip>Ver QR</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canEdit"
                round
                unelevated
                size="sm"
                color="primary"
                text-color="white"
                icon="edit"
                class="catalogo-card__fab"
                @click.stop="emit('editar', producto)"
              >
                <q-tooltip>Editar producto</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
.catalogo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
  align-items: stretch;
}

.catalogo-grid__item {
  display: flex;
  animation: card-enter 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--stagger, 0ms);
}

.catalogo-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  border-radius: 18px;
  background: var(--sgi-surface-soft);
  border: 1px dashed var(--sgi-border);
}

.catalogo-empty__art {
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  background: color-mix(in srgb, var(--sgi-primary) 10%, transparent);
  color: var(--sgi-primary);
  margin-bottom: 16px;
}

.catalogo-empty__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--sgi-text);
}

.catalogo-empty__text {
  margin: 6px 0 0;
  color: var(--sgi-text-muted);
  max-width: 320px;
}

.catalogo-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 16px;
  background: var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  overflow: hidden;
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 200ms ease;
  box-shadow: 0 6px 18px rgba(15, 23, 40, 0.05);
}

.catalogo-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 38px rgba(15, 23, 40, 0.12);
  border-color: color-mix(in srgb, var(--sgi-primary) 25%, var(--sgi-border));
}

.catalogo-card--skeleton {
  pointer-events: none;
  animation: none;
}

.catalogo-card__ribbon {
  position: absolute;
  top: 12px;
  right: -36px;
  transform: rotate(40deg);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 44px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.catalogo-card__ribbon--positive {
  background: var(--sgi-positive);
}
.catalogo-card__ribbon--warning {
  background: var(--sgi-warning);
  color: #2a1a00;
}
.catalogo-card__ribbon--negative {
  background: var(--sgi-negative);
}

.catalogo-card__image {
  position: relative;
  aspect-ratio: 16 / 9;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--sgi-primary) 6%, transparent),
      transparent 70%
    ),
    var(--sgi-surface-alt);
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: not-allowed;
}

.catalogo-card__image--clickable {
  cursor: zoom-in;
}

.catalogo-card__image :deep(.q-img) {
  width: 100%;
  height: 100%;
}

.catalogo-card__image-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: row;
  gap: 6px;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.catalogo-card:hover .catalogo-card__image-overlay {
  opacity: 1;
  transform: translateY(0);
}

.catalogo-card__fab {
  box-shadow: 0 6px 14px rgba(15, 23, 40, 0.22);
}

@media (hover: none) {
  .catalogo-card__image-overlay {
    opacity: 1;
    transform: none;
  }
}

.catalogo-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
  flex: 1;
}

.catalogo-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.catalogo-card__sucursal-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--sgi-primary);
  background: color-mix(in srgb, var(--sgi-primary) 10%, transparent);
  padding: 3px 8px;
  border-radius: 6px;
  max-width: 100%;

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.catalogo-card__marca {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sgi-warning);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.catalogo-card__sku {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--sgi-text-muted);
  background: color-mix(in srgb, var(--sgi-text-muted) 12%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40%;
}

.catalogo-card__nombre {
  margin: 2px 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--sgi-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.catalogo-card__descripcion {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--sgi-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.catalogo-card__prices {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.catalogo-card__price {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sgi-surface) 88%, transparent);
  border: 1px solid var(--sgi-border);
}

.catalogo-card__price--final {
  grid-column: 1 / -1;
  background: color-mix(in srgb, var(--sgi-positive) 10%, transparent);
  border-color: color-mix(in srgb, var(--sgi-positive) 24%, var(--sgi-border));
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
}

.catalogo-card__price-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sgi-text-muted);
}

.catalogo-card__price-value {
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--sgi-text);
}

.catalogo-card__price--purchase .catalogo-card__price-value {
  color: var(--sgi-primary);
}

.catalogo-card__price--list .catalogo-card__price-value {
  color: var(--sgi-text-muted);
  font-weight: 500;
  font-size: 0.82rem;
}

.catalogo-card__price--final .catalogo-card__price-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--sgi-positive);
  letter-spacing: -0.01em;
}

.catalogo-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--sgi-border) 60%, transparent);
}

.catalogo-card__stock {
  display: flex;
  align-items: center;
  gap: 6px;
}

.catalogo-card__stock-value {
  font-size: 1.1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--sgi-text);
}

.catalogo-card__stock-label {
  font-size: 0.72rem;
  color: var(--sgi-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.catalogo-card__stock-icon--positive {
  color: var(--sgi-positive);
}
.catalogo-card__stock-icon--warning {
  color: var(--sgi-warning);
}
.catalogo-card__stock-icon--negative {
  color: var(--sgi-negative);
}

.catalogo-card__actions {
  display: flex;
  gap: 2px;
}

@media (max-width: 380px) {
  .catalogo-card__prices {
    grid-template-columns: 1fr;
  }
  .catalogo-card__price--final {
    grid-column: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .catalogo-grid__item,
  .catalogo-card,
  .catalogo-card__image-overlay {
    animation: none;
    transition: none;
  }
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
