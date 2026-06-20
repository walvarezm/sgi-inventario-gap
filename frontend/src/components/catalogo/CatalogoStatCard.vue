<script setup lang="ts">
interface Props {
  icon: string
  value: number | string
  label: string
  tone: 'primary' | 'positive' | 'warning' | 'negative' | 'info'
  active?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), { active: false, loading: false })

const emit = defineEmits<{ click: [] }>()

function onClick(): void {
  emit('click')
}
</script>

<template>
  <button
    type="button"
    class="stat-card"
    :class="[`stat-card--${tone}`, { 'stat-card--active': active, 'stat-card--clickable': $attrs.onClick || true }]"
    @click="onClick"
  >
    <div class="stat-card__icon">
      <q-icon :name="icon" size="22px" />
    </div>
    <div class="stat-card__body">
      <div class="stat-card__value">
        <q-skeleton v-if="loading" type="text" width="60%" />
        <template v-else>{{ value }}</template>
      </div>
      <div class="stat-card__label">{{ label }}</div>
    </div>
    <div v-if="active" class="stat-card__indicator" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  border-radius: 16px;
  background: var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 200ms ease;
  box-shadow: 0 6px 18px rgba(15, 23, 40, 0.05);
  overflow: hidden;
  isolation: isolate;
}

.stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tone-color, var(--sgi-primary)) 8%, transparent),
    transparent 65%
  );
  z-index: -1;
  opacity: 0.8;
}

.stat-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(15, 23, 40, 0.1);
  border-color: color-mix(in srgb, var(--tone-color, var(--sgi-primary)) 35%, var(--sgi-border));
}

.stat-card--clickable:active {
  transform: translateY(0);
}

.stat-card--clickable:focus-visible {
  outline: 2px solid var(--tone-color, var(--sgi-primary));
  outline-offset: 2px;
}

.stat-card--primary {
  --tone-color: var(--sgi-primary);
}
.stat-card--positive {
  --tone-color: var(--sgi-positive);
}
.stat-card--warning {
  --tone-color: var(--sgi-warning);
}
.stat-card--negative {
  --tone-color: var(--sgi-negative);
}
.stat-card--info {
  --tone-color: var(--sgi-info);
}

.stat-card__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--tone-color) 14%, transparent);
  color: var(--tone-color);
  flex-shrink: 0;
  transition: transform 200ms ease;
}

.stat-card--clickable:hover .stat-card__icon {
  transform: scale(1.06);
}

.stat-card__body {
  min-width: 0;
  flex: 1;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--sgi-text);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.stat-card__label {
  margin-top: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sgi-text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stat-card--active {
  border-color: var(--tone-color);
  box-shadow:
    0 12px 28px color-mix(in srgb, var(--tone-color) 22%, transparent),
    inset 0 0 0 1px var(--tone-color);
}

.stat-card__indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: var(--tone-color);
  clip-path: polygon(100% 0, 100% 100%, 0 0);
}

@media (max-width: 600px) {
  .stat-card {
    padding: 14px 16px;
    gap: 12px;
  }

  .stat-card__icon {
    width: 38px;
    height: 38px;
  }

  .stat-card__value {
    font-size: 1.3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .stat-card__icon {
    transition: none;
  }
}
</style>
