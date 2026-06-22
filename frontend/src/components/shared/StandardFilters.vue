<script setup lang="ts">
import { computed, useSlots, ref } from 'vue'

interface Props {
  modelValue?: string
  total?: number
  filtered?: number
  placeholder?: string
  /** Mostrar el contador de resultados (X de Y) */
  showCount?: boolean
  /** Etiqueta singular para el contador */
  countLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  total: 0,
  filtered: 0,
  placeholder: 'Buscar…',
  showCount: true,
  countLabel: 'resultados',
  loading: false,
})

const showSearch = computed(() => props.modelValue !== undefined)

const emit = defineEmits<{
  'update:modelValue': [val: string]
  clear: []
}>()

const slots = useSlots()
const hasCustomFilters = computed(() => !!slots['extra'])
const hasActiveFilters = computed(() => props.modelValue.trim().length > 0)

function clearAll(): void {
  emit('update:modelValue', '')
  emit('clear')
}

const inputEl = ref<HTMLInputElement | null>(null)
</script>

<template>
  <div class="std-filters">
    <div
      v-if="showSearch"
      class="std-filters__bar"
      :class="{ 'std-filters__bar--focus': hasActiveFilters }"
    >
      <q-icon name="search" size="20px" class="std-filters__icon" />
      <input
        ref="inputEl"
        :value="modelValue"
        type="text"
        :placeholder="placeholder"
        class="std-filters__input"
        autocomplete="on"
        spellcheck="false"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="hasActiveFilters"
        type="button"
        class="std-filters__clear"
        aria-label="Limpiar búsqueda"
        @click="emit('update:modelValue', '')"
      >
        <q-icon name="close" size="14px" />
      </button>
      <q-spinner v-if="loading" size="18px" class="std-filters__spinner" />
    </div>
    <!--    <q-space />-->
    <div v-if="hasCustomFilters || hasActiveFilters || showCount" class="std-filters__row">
      <slot name="extra" />
      <!--      <button
        v-if="hasActiveFilters"
        type="button"
        class="std-filters__clear-all"
        @click="clearAll"
      >
        <q-icon name="filter_alt_off" size="14px" />
        Limpiar
      </button>-->
      <q-btn
        v-if="hasActiveFilters"
        outline
        rounded
        color="negative"
        icon="filter_alt_off"
        label="Limpiar"
        no-caps
        size="sm"
        @click="clearAll"
      />
    </div>
    <!--    <q-space class="std-filters__row" />-->
    <div v-if="showCount" class="std-filters__count">
      <span v-if="filtered !== total && total > 0" class="std-filters__count-highlight">
        {{ filtered }}
      </span>
      <span v-else class="std-filters__count-value">{{ total }}</span>
      <!--      <span class="std-filters__count-label">
        {{ countLabel }}
      </span>-->
      <span v-if="filtered !== total && total > 0" class="">
        <span class="std-filters__count-label q-pr-sm">registros en vista de</span>
        <span class="std-filters__count-value">{{ total }}</span>
      </span>
      <span class="std-filters__count-label">
        {{ countLabel }}
      </span>

      <!--        <button
          v-if="hasActiveFilters"
          type="button"
          class="std-filters__clear-all"
          @click="clearAll"
        >
          <q-icon name="filter_alt_off" size="14px" />
          Limpiar
        </button>-->
    </div>
  </div>
</template>

<style scoped lang="scss">
.std-filters {
  display: flex;
  /*flex-direction: row;*/
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

// ── Search bar ────────────────────────────────────────────────
.std-filters__bar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 25%;
  height: 44px;
  padding: 0 6px 0 14px;
  border-radius: 12px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  transition:
    border-color var(--sgi-dur-fast) var(--sgi-ease-out),
    box-shadow var(--sgi-dur-fast) var(--sgi-ease-out);
}

.std-filters__bar:focus-within,
.std-filters__bar--focus {
  border-color: var(--sgi-primary);
  box-shadow: var(--sgi-focus-ring);
}

.std-filters__icon {
  color: var(--sgi-text-muted);
  flex-shrink: 0;
}

.std-filters__input {
  /*flex: 1;*/
  display: flex;
  min-width: 80%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sgi-text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0;
}

.std-filters__input::placeholder {
  color: var(--sgi-text-muted);
  font-weight: 400;
}

.std-filters__clear {
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

.std-filters__clear:hover {
  background: color-mix(in srgb, var(--sgi-negative) 22%, transparent);
  color: var(--sgi-negative);
}

.std-filters__spinner {
  color: var(--sgi-primary);
  margin-right: 6px;
}

// ── Filter row (extra filters + counter) ──────────────────────
.std-filters__row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;

}

.std-filters__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--sgi-text-muted);
  /*white-space: nowrap;*/
  flex-wrap: wrap;
}

.std-filters__count-value,
.std-filters__count-highlight {
  font-weight: 800;
  color: var(--sgi-text);
  font-variant-numeric: tabular-nums;
}

.std-filters__count-highlight {
  color: var(--sgi-primary);
}

.std-filters__count-label {
  font-size: 0.78rem;
}

.std-filters__clear-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--sgi-border);
  background: var(--sgi-surface);
  color: var(--sgi-negative);
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    border-color var(--sgi-dur-fast) var(--sgi-ease-out);
}

.std-filters__clear-all:hover {
  background: color-mix(in srgb, var(--sgi-negative) 10%, transparent);
  border-color: color-mix(in srgb, var(--sgi-negative) 40%, var(--sgi-border));
}

@media (max-width: 1024px) {
  .std-filters {
    align-items: center;
    justify-content: center;
  }
  .std-filters__bar {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .std-filters__bar {
    height: 40px;
  }
}
</style>
