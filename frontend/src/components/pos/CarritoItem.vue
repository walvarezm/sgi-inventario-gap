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
  { label: 'Sin', value: 'NINGUNO' },
  { label: 'Monto', value: 'MONTO' },
  { label: '%', value: 'PORCENTAJE' },
]

const stockCritico = computed(
  () => props.item.stockDisponible > 0 && props.item.cantidad >= props.item.stockDisponible,
)
const stockAgotado = computed(() => props.item.stockDisponible <= 0)
const descuentoAplicado = computed(() => props.item.descuentoMonto > 0)
const subtotalConDescuento = computed(() =>
  Math.max(0, props.item.subtotal - props.item.descuentoMonto),
)

function cambiarCantidad(delta: number): void {
  const nueva = props.item.cantidad + delta
  if (nueva < 1) return
  if (nueva > props.item.stockDisponible) return
  emit('cambiar-cantidad', props.item.productoId, nueva)
}

function onTipoDescuento(value: TipoDescuento): void {
  emit(
    'cambiar-descuento',
    props.item.productoId,
    value,
    value === 'NINGUNO' ? 0 : props.item.descuentoValor,
  )
}
</script>

<template>
  <article class="cart-item" :class="{ 'cart-item--critical': stockCritico || stockAgotado }">
    <!-- Image -->
    <div class="cart-item__image">
      <ProductoImagenIFrame
        :imagen-url="item.imagenUrl"
        :imagen-location="item.imagenLocation"
        :width="20"
        :height="20"
        type="card"
      />
    </div>

    <!-- Main info -->
    <div class="cart-item__main">
      <div class="cart-item__topline">
        <div class="cart-item__id">
          <span class="cart-item__marca">{{ item.marca }}</span>
          <span class="cart-item__sep">·</span>
          <span class="cart-item__sku">{{ item.sku }}</span>
        </div>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="close"
          color="negative"
          class="cart-item__remove"
          @click="emit('quitar', item.productoId)"
        >
          <q-tooltip>Quitar del carrito</q-tooltip>
        </q-btn>
      </div>

      <div class="cart-item__name" :title="item.nombre">{{ item.nombre }}</div>

      <!-- Controls grid -->
      <div class="cart-item__controls">
        <!-- Quantity -->
        <div class="cart-item__qty">
          <span class="cart-item__field-label">Cant.</span>
          <div class="cart-item__qty-stepper">
            <button
              type="button"
              class="cart-item__qty-btn"
              :disabled="item.cantidad <= 1"
              aria-label="Disminuir cantidad"
              @click="cambiarCantidad(-1)"
            >
              <q-icon name="remove" size="14px" />
            </button>
            <span class="cart-item__qty-value">{{ item.cantidad }}</span>
            <button
              type="button"
              class="cart-item__qty-btn"
              :disabled="item.cantidad >= item.stockDisponible"
              aria-label="Aumentar cantidad"
              @click="cambiarCantidad(1)"
            >
              <q-icon name="add" size="14px" />
            </button>
          </div>
          <span class="cart-item__stock">
            <q-icon name="inventory_2" size="11px" />
            {{ item.stockDisponible }}
          </span>
        </div>

        <!-- Unit price -->
        <div class="cart-item__field">
          <label class="cart-item__field-label">Precio</label>
          <div class="cart-item__price-input">
            <span class="cart-item__currency">Bs.</span>
            <input
              :value="item.precioUnitario"
              type="number"
              min="0"
              step="0.01"
              :disabled="!canEditarPrecio"
              class="cart-item__input"
              inputmode="decimal"
              @input="
                emit('cambiar-precio', item.productoId, Number(($event.target as HTMLInputElement).value) || 0)
              "
            />
          </div>
        </div>

        <!-- Discount -->
        <div class="cart-item__field">
          <label class="cart-item__field-label">Descuento</label>
          <div class="cart-item__discount">
            <select
              :value="item.descuentoTipo"
              class="cart-item__select"
              :disabled="!canAplicarDescuento"
              @change="
                onTipoDescuento(($event.target as HTMLSelectElement).value as TipoDescuento)
              "
            >
              <option v-for="opt in descuentoOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              :value="item.descuentoValor"
              type="number"
              min="0"
              step="0.01"
              class="cart-item__input cart-item__input--narrow"
              inputmode="decimal"
              :disabled="!canAplicarDescuento || item.descuentoTipo === 'NINGUNO'"
              @input="
                emit(
                  'cambiar-descuento',
                  item.productoId,
                  item.descuentoTipo,
                  Number(($event.target as HTMLInputElement).value) || 0,
                )
              "
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Subtotal -->
    <div class="cart-item__total">
      <span class="cart-item__total-label">Subtotal</span>
      <span class="cart-item__total-value">{{ formatCurrency(subtotalConDescuento) }}</span>
      <span
        v-if="descuentoAplicado"
        class="cart-item__total-discount"
        :title="`Descuento aplicado: ${formatCurrency(item.descuentoMonto)}`"
      >
        <q-icon name="sell" size="11px" />
        -{{ formatCurrency(item.descuentoMonto) }}
      </span>
    </div>
  </article>
</template>

<style scoped lang="scss">
.cart-item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  transition:
    border-color var(--sgi-dur-fast) var(--sgi-ease-out),
    box-shadow var(--sgi-dur-fast) var(--sgi-ease-out);
  animation: cart-item-enter 280ms var(--sgi-ease-out) both;
}

.cart-item:hover {
  border-color: color-mix(in srgb, var(--sgi-primary) 30%, var(--sgi-border));
  box-shadow: var(--sgi-shadow-sm);
}

.cart-item--critical {
  border-color: color-mix(in srgb, var(--sgi-warning) 50%, var(--sgi-border));
  background: color-mix(in srgb, var(--sgi-warning) 4%, var(--sgi-surface));
}

// ── Image ──────────────────────────────────────────────────────
.cart-item__image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--sgi-surface-sunken);
  display: grid;
  place-items: center;
}

// ── Main info ──────────────────────────────────────────────────
.cart-item__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cart-item__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cart-item__id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 0.72rem;
  color: var(--sgi-text-muted);
}

.cart-item__marca {
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sgi-warning);
}

.cart-item__sep {
  opacity: 0.5;
}

.cart-item__sku {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 600;
  color: var(--sgi-text-secondary);
}

.cart-item__remove {
  flex-shrink: 0;
}

.cart-item__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sgi-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

// ── Controls grid ──────────────────────────────────────────────
.cart-item__controls {
  display: grid;
  grid-template-columns: auto 1fr 1.2fr;
  gap: 10px;
  align-items: end;
  margin-top: 4px;
}

.cart-item__field,
.cart-item__qty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cart-item__field-label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sgi-text-muted);
}

.cart-item__qty {
  flex-direction: column;
  gap: 4px;
}

.cart-item__qty-stepper {
  display: inline-flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  background: var(--sgi-surface-sunken);
  border: 1px solid var(--sgi-border);
  padding: 0 2px;
}

.cart-item__qty-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sgi-text);
  cursor: pointer;
  transition: background var(--sgi-dur-fast) var(--sgi-ease-out);
}

.cart-item__qty-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--sgi-primary) 14%, transparent);
  color: var(--sgi-primary);
}

.cart-item__qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cart-item__qty-value {
  min-width: 28px;
  text-align: center;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  font-size: 0.92rem;
  color: var(--sgi-text);
  padding: 0 2px;
}

.cart-item__stock {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--sgi-text-muted);
  margin-top: 2px;
}

// ── Price / Discount inputs ───────────────────────────────────
.cart-item__price-input,
.cart-item__discount {
  display: flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  background: var(--sgi-surface-sunken);
  border: 1px solid var(--sgi-border);
  padding: 0 8px;
  gap: 6px;
  transition: border-color var(--sgi-dur-fast) var(--sgi-ease-out);
}

.cart-item__price-input:focus-within,
.cart-item__discount:focus-within {
  border-color: var(--sgi-primary);
  box-shadow: var(--sgi-focus-ring);
}

.cart-item__currency {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sgi-text-muted);
}

.cart-item__input,
.cart-item__select {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sgi-text);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 0;
  text-align: right;
}

.cart-item__input:disabled,
.cart-item__select:disabled {
  color: var(--sgi-text-muted);
  cursor: not-allowed;
}

.cart-item__input--narrow {
  max-width: 70px;
  text-align: right;
}

.cart-item__select {
  text-align: left;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'><path fill='%2394a3b8' d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right center;
  padding-right: 14px;
  flex: 0 0 auto;
  min-width: 64px;
}

.cart-item__select option {
  background: var(--sgi-surface);
  color: var(--sgi-text);
}

// ── Subtotal ───────────────────────────────────────────────────
.cart-item__total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  min-width: 80px;
  text-align: right;
  border-left: 1px solid var(--sgi-border-subtle);
  padding-left: 12px;
}

.cart-item__total-label {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sgi-text-muted);
}

.cart-item__total-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--sgi-positive);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.cart-item__total-discount {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--sgi-warning);
}

// ── Mobile (xs) ────────────────────────────────────────────────
@media (max-width: 600px) {
  .cart-item {
    grid-template-columns: 56px minmax(0, 1fr);
    grid-template-areas:
      'image main'
      'image total';
    column-gap: 10px;
    padding: 10px;
  }

  .cart-item__image {
    grid-area: image;
    width: 56px;
    height: 56px;
  }

  .cart-item__main {
    grid-area: main;
  }

  .cart-item__total {
    grid-area: total;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-end;
    border-left: 0;
    padding-left: 0;
    border-top: 1px dashed var(--sgi-border-subtle);
    padding-top: 6px;
    gap: 8px;
  }

  .cart-item__total-value {
    font-size: 0.95rem;
  }

  .cart-item__controls {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .cart-item__qty {
    grid-column: 1 / 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cart-item {
    animation: none;
  }
}

@keyframes cart-item-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
