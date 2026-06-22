<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  icon?: string
  /** Etiqueta de la acción primaria (botón grande) */
  primaryLabel?: string
  primaryIcon?: string
  primaryDisabled?: boolean
  primaryLoading?: boolean
  /** Mostrar botón primario */
  showPrimary?: boolean
  /** Color del botón primario (default primary) */
  primaryColor?: string
  /** Mostrar el selector de sucursal inline */
  showSucursalSelector?: boolean
  /** Texto del placeholder para filtros */
  searchPlaceholder?: string
  /** Estado de carga para filtros */
  loading?: boolean
  /** Slot info: el contenido debajo del toolbar (tabla, etc.) */
  noPadding?: boolean
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  icon: '',
  primaryLabel: '',
  primaryIcon: 'add',
  primaryDisabled: false,
  primaryLoading: false,
  showPrimary: false,
  primaryColor: 'primary',
  showSucursalSelector: true,
  searchPlaceholder: 'Buscar…',
  loading: false,
  noPadding: false,
})

const emit = defineEmits<{
  primary: []
  'update:search': [val: string]
}>()

// Búsqueda interna controlada por v-model:search
const searchValue = defineModel<string>('search', { default: '' })
</script>

<template>
  <div class="std-toolbar" :class="{ 'std-toolbar--no-padding': noPadding }">
    <!-- Hero / Title row -->
    <header class="std-toolbar__hero">
      <div class="std-toolbar__copy">
        <div v-if="icon" class="std-toolbar__eyebrow">
          <q-icon :name="icon" size="14px" />
          <span class="std-toolbar__title">{{ title }}</span>
          <!--          <span>{{ title }}</span>-->
        </div>
<!--        <h1 v-if="!showSucursalSelector" class="std-toolbar__title">
          {{ title }}
        </h1>-->
        <p v-if="subtitle" class="std-toolbar__subtitle">{{ subtitle }}</p>
      </div>

      <div v-if="showPrimary || $slots.actions" class="std-toolbar__actions">
        <slot name="actions" />
        <button
          v-if="showPrimary"
          type="button"
          class="std-toolbar__primary"
          :class="`std-toolbar__primary--${primaryColor}`"
          :disabled="primaryDisabled || primaryLoading"
          @click="emit('primary')"
        >
          <q-spinner-dots v-if="primaryLoading" size="18px" color="white" />
          <q-icon v-else :name="primaryIcon" size="18px" />
          <span>{{ primaryLabel }}</span>
        </button>
      </div>
    </header>

    <!-- Filters / Search row -->
    <div v-if="$slots.default" class="std-toolbar__filters">
      <slot :search="searchValue" :update-search="(v: string) => (searchValue = v)" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.std-toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 18px;
}

.std-toolbar--no-padding {
  margin-bottom: 0;
}

// ── Hero ──────────────────────────────────────────────────────
.std-toolbar__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 22px 24px;
  border-radius: var(--sgi-radius-lg);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--sgi-primary) 6%, transparent),
      transparent 60%
    ),
    var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  box-shadow: var(--sgi-shadow);
}

.std-toolbar__copy {
  flex: 1;
  min-width: 240px;
}

.std-toolbar__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.std-toolbar__title {
  margin: 0 0 6px;
  font-size: clamp(1.0rem, 2vw, 1.5rem) !important;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: var(--sgi-text);
}

.std-toolbar__subtitle {
  margin: 0;
  color: var(--sgi-text-secondary);
  font-size: 0.9rem;
  max-width: 600px;
}

.std-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

// ── Primary action button ─────────────────────────────────────
.std-toolbar__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--sgi-primary), var(--sgi-primary-hover));
  color: white;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--sgi-primary) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition:
    transform var(--sgi-dur-fast) var(--sgi-ease-out),
    box-shadow var(--sgi-dur-fast) var(--sgi-ease-out),
    filter var(--sgi-dur-fast) var(--sgi-ease-out);
}

.std-toolbar__primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--sgi-primary) 35%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.std-toolbar__primary:active:not(:disabled) {
  transform: translateY(0);
}

.std-toolbar__primary:disabled {
  filter: grayscale(0.4) opacity(0.5);
  cursor: not-allowed;
  box-shadow: none;
}

.std-toolbar__primary--positive {
  background: linear-gradient(135deg, var(--sgi-positive), #0d9669);
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--sgi-positive) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.std-toolbar__primary--negative {
  background: linear-gradient(135deg, var(--sgi-negative), #c53030);
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--sgi-negative) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.std-toolbar__primary--info {
  background: linear-gradient(135deg, var(--sgi-info), #0284c7);
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--sgi-info) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

// ── Filters slot wrapper ──────────────────────────────────────
.std-toolbar__filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// ── Mobile ───────────────────────────────────────────────────
@media (max-width: 720px) {
  .std-toolbar__hero {
    padding: 16px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .std-toolbar__primary {
    transition: none;
  }
}
</style>
