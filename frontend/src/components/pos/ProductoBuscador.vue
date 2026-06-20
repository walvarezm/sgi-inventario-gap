<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { formatCurrency } from 'src/utils/formatters'
import ProductoImagenIFrame from 'src/components/productos/ProductoImagenIFrame.vue'

interface Props {
  modelValue: string
  resultados: ProductoCatalogo[]
  label?: string
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  label: 'Buscar producto por SKU, nombre o marca…',
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [val: string]
  seleccionar: [producto: ProductoCatalogo]
  escanear: []
}>()

const inputValue = ref(props.modelValue ?? '')
const dropdownOpen = ref(false)
const activeIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (val !== inputValue.value) inputValue.value = val ?? ''
  },
)

watch(inputValue, (val) => {
  emit('update:modelValue', val)
  dropdownOpen.value = !!val.trim() && props.resultados.length > 0
  activeIndex.value = -1
})

watch(
  () => props.resultados,
  (val) => {
    dropdownOpen.value = !!inputValue.value.trim() && val.length > 0
  },
)

const hayResultados = computed(() => props.resultados.length > 0)
const busquedaVacia = computed(() => !inputValue.value.trim())

function onKeydown(e: KeyboardEvent): void {
  if (!dropdownOpen.value || !hayResultados.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % props.resultados.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + props.resultados.length) % props.resultados.length
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    seleccionar(props.resultados[activeIndex.value])
  } else if (e.key === 'Escape') {
    dropdownOpen.value = false
  }
}

function seleccionar(p: ProductoCatalogo): void {
  emit('seleccionar', p)
  inputValue.value = ''
  dropdownOpen.value = false
  activeIndex.value = -1
  nextTick(() => inputRef.value?.focus())
}

function onClickOutside(e: MouseEvent): void {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) dropdownOpen.value = false
}

function clearInput(): void {
  inputValue.value = ''
  inputRef.value?.focus()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div ref="rootRef" class="pos-search">
    <div class="pos-search__bar" :class="{ 'pos-search__bar--open': dropdownOpen }">
      <q-icon name="search" size="20px" class="pos-search__icon" />
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="label"
        class="pos-search__input"
        autocomplete="off"
        spellcheck="false"
        :aria-expanded="dropdownOpen"
        aria-autocomplete="list"
        @keydown="onKeydown"
        @focus="dropdownOpen = hayResultados && !busquedaVacia"
      />
      <button
        v-if="inputValue"
        type="button"
        class="pos-search__clear"
        aria-label="Limpiar búsqueda"
        @click="clearInput"
      >
        <q-icon name="close" size="14px" />
      </button>
      <span class="pos-search__divider" />
      <button
        type="button"
        class="pos-search__action"
        aria-label="Escanear código QR"
        @click="emit('escanear')"
      >
        <q-icon name="qr_code_scanner" size="20px" />
        <span class="pos-search__action-label">QR</span>
      </button>
    </div>

    <Transition name="dropdown">
      <div v-if="dropdownOpen && hayResultados" class="pos-search__dropdown">
        <div class="pos-search__dropdown-head">
          <q-icon name="inventory_2" size="14px" />
          <span>{{ resultados.length }} resultado{{ resultados.length === 1 ? '' : 's' }}</span>
          <q-space />
          <span class="pos-search__kbd">↑ ↓ ↵</span>
        </div>
        <ul class="pos-search__list" role="listbox">
          <li
            v-for="(producto, index) in resultados"
            :key="producto.id"
            class="pos-search__item"
            :class="{
              'pos-search__item--active': index === activeIndex,
              'pos-search__item--low': producto.stock <= 0,
            }"
            role="option"
            :aria-selected="index === activeIndex"
            @click="seleccionar(producto)"
            @mouseenter="activeIndex = index"
          >
            <div class="pos-search__thumb">
              <ProductoImagenIFrame
                :imagen-url="producto.imagenUrl"
                :imagen-location="producto.imagenLocation"
                :width="40"
                :height="40"
                type="table"
              />
            </div>
            <div class="pos-search__info">
              <div class="pos-search__name">
                <span class="pos-search__name-text">{{ producto.nombre }}</span>
              </div>
              <div class="pos-search__meta">
                <span class="pos-search__sku">{{ producto.sku }}</span>
                <span class="pos-search__sep">·</span>
                <span class="pos-search__marca">{{ producto.marca }}</span>
              </div>
            </div>
            <div class="pos-search__right">
              <div class="pos-search__price">{{ formatCurrency(producto.precioFinal) }}</div>
              <div
                class="pos-search__stock"
                :class="`pos-search__stock--${
                  producto.stock === 0 ? 'none' : producto.stockBajo ? 'low' : 'ok'
                }`"
              >
                <q-icon
                  :name="
                    producto.stock === 0
                      ? 'remove_circle'
                      : producto.stockBajo
                        ? 'warning_amber'
                        : 'check_circle'
                  "
                  size="12px"
                />
                {{ producto.stock }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </Transition>

    <Transition name="dropdown">
      <div
        v-if="dropdownOpen && !hayResultados && !busquedaVacia && !loading"
        class="pos-search__dropdown pos-search__dropdown--empty"
      >
        <q-icon name="search_off" size="22px" />
        <span>Sin resultados para «{{ inputValue }}»</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.pos-search {
  position: relative;
  width: 100%;
}

// ── Search bar ────────────────────────────────────────────────
.pos-search__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 6px 0 14px;
  border-radius: 14px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  box-shadow: var(--sgi-shadow-sm);
  transition:
    border-color var(--sgi-dur-fast) var(--sgi-ease-out),
    box-shadow var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-search__bar:focus-within,
.pos-search__bar--open {
  border-color: var(--sgi-primary);
  box-shadow: var(--sgi-focus-ring);
}

.pos-search__icon {
  color: var(--sgi-text-muted);
  flex-shrink: 0;
}

.pos-search__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sgi-text);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0;
}

.pos-search__input::placeholder {
  color: var(--sgi-text-muted);
  font-weight: 400;
}

.pos-search__clear {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--sgi-text-muted) 14%, transparent);
  color: var(--sgi-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    color var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-search__clear:hover {
  background: color-mix(in srgb, var(--sgi-negative) 22%, transparent);
  color: var(--sgi-negative);
}

.pos-search__divider {
  width: 1px;
  height: 24px;
  background: var(--sgi-border);
  flex-shrink: 0;
}

.pos-search__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    transform var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-search__action:hover {
  background: color-mix(in srgb, var(--sgi-primary) 22%, transparent);
  transform: translateY(-1px);
}

.pos-search__action-label {
  display: inline-block;
}

@media (max-width: 600px) {
  .pos-search__action-label {
    display: none;
  }
  .pos-search__action {
    width: 36px;
    padding: 0;
    justify-content: center;
  }
}

// ── Dropdown ──────────────────────────────────────────────────
.pos-search__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  border-radius: 14px;
  box-shadow: var(--sgi-shadow-lg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.pos-search__dropdown--empty {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--sgi-text-muted);
  font-size: 0.9rem;
}

.pos-search__dropdown-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sgi-text-muted);
  border-bottom: 1px solid var(--sgi-border);
  background: color-mix(in srgb, var(--sgi-surface) 70%, transparent);
}

.pos-search__kbd {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--sgi-surface-sunken);
  border: 1px solid var(--sgi-border);
  color: var(--sgi-text-secondary);
}

.pos-search__list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pos-search__item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background var(--sgi-dur-fast) var(--sgi-ease-out);
}

.pos-search__item--active {
  background: color-mix(in srgb, var(--sgi-primary) 10%, transparent);
}

.pos-search__item--low {
  opacity: 0.55;
  pointer-events: none;
}

.pos-search__thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--sgi-surface-sunken);
  display: grid;
  place-items: center;
  border: 1px solid var(--sgi-border);
}

.pos-search__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pos-search__name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--sgi-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pos-search__name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pos-search__meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: var(--sgi-text-muted);
}

.pos-search__sku {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 700;
  color: var(--sgi-text-secondary);
}

.pos-search__marca {
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sgi-warning);
}

.pos-search__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  text-align: right;
}

.pos-search__price {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--sgi-positive);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.pos-search__stock {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.pos-search__stock--ok {
  color: var(--sgi-positive);
  background: color-mix(in srgb, var(--sgi-positive) 14%, transparent);
}

.pos-search__stock--low {
  color: var(--sgi-warning);
  background: color-mix(in srgb, var(--sgi-warning) 16%, transparent);
}

.pos-search__stock--none {
  color: var(--sgi-text-muted);
  background: color-mix(in srgb, var(--sgi-text-muted) 14%, transparent);
}

// ── Dropdown transition ──────────────────────────────────────
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 180ms var(--sgi-ease-out),
    transform 180ms var(--sgi-ease-out);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .pos-search__item,
  .pos-search__bar,
  .pos-search__action,
  .pos-search__clear {
    transition: none;
  }
}
</style>
