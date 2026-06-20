<script setup lang="ts">
import { computed } from 'vue'
import type { MetodoPago } from 'src/types'

interface Props {
  metodoActual: MetodoPago
  pagos: Array<{ metodoPago: MetodoPago; monto: number; referencia: string }>
  requirePago: boolean
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'seleccionar-metodo': [metodo: MetodoPago]
  'agregar-pago-mixto': []
  'quitar-pago-mixto': [index: number]
  'actualizar-pago': [index: number, patch: { metodoPago?: MetodoPago; monto?: number; referencia?: string }]
}>()

interface Metodo {
  value: Exclude<MetodoPago, 'MIXTO'>
  label: string
  icon: string
  color: string
}

const metodosSimples: Metodo[] = [
  { value: 'EFECTIVO',     label: 'Efectivo',     icon: 'payments',        color: 'positive' },
  { value: 'QR',           label: 'QR',           icon: 'qr_code_2',      color: 'info' },
  { value: 'TRANSFERENCIA',label: 'Transferencia',icon: 'account_balance', color: 'primary' },
  { value: 'TARJETA',      label: 'Tarjeta',      icon: 'credit_card',    color: 'secondary' },
  { value: 'CREDITO',      label: 'Crédito',      icon: 'schedule',       color: 'warning' },
]

const esMixto = computed(() => props.pagos.length > 1)
const metodoUnico = computed<Exclude<MetodoPago, 'MIXTO'>>(() => {
  return (props.pagos[0]?.metodoPago ?? 'EFECTIVO') as Exclude<MetodoPago, 'MIXTO'>
})

function isActive(metodo: Exclude<MetodoPago, 'MIXTO'>): boolean {
  if (esMixto.value) return metodo === 'EFECTIVO' && false
  return metodoUnico.value === metodo
}

function classForMetodo(color: string): string {
  return `payment-method payment-method--${color}`
}
</script>

<template>
  <div v-if="requirePago" class="payment-methods">
    <div class="payment-methods__head">
      <span class="payment-methods__label">Modalidad de pago</span>
      <button
        type="button"
        class="payment-methods__mixto"
        :class="{ 'payment-methods__mixto--active': esMixto }"
        :disabled="disabled"
        @click="emit('agregar-pago-mixto')"
      >
        <q-icon name="call_split" size="14px" />
        Mixto
      </button>
    </div>

    <div v-if="!esMixto" class="payment-methods__grid">
      <button
        v-for="metodo in metodosSimples"
        :key="metodo.value"
        type="button"
        :class="[classForMetodo(metodo.color), { 'is-active': isActive(metodo.value) }]"
        :disabled="disabled"
        :aria-pressed="isActive(metodo.value)"
        @click="emit('seleccionar-metodo', metodo.value)"
      >
        <q-icon :name="metodo.icon" size="20px" />
        <span class="payment-methods__name">{{ metodo.label }}</span>
      </button>
    </div>

    <div v-else class="payment-methods__mixto-list">
      <div
        v-for="(pago, index) in pagos"
        :key="`mixto-${index}`"
        class="payment-methods__mixto-row"
      >
        <q-select
          :model-value="pago.metodoPago"
          :options="metodosSimples.map((m) => ({ label: m.label, value: m.value }))"
          outlined
          dense
          emit-value
          map-options
          @update:model-value="
            emit('actualizar-pago', index, { metodoPago: $event as MetodoPago })
          "
        />
        <q-input
          :model-value="pago.monto"
          type="number"
          step="0.01"
          outlined
          dense
          input-class="text-right"
          @update:model-value="
            emit('actualizar-pago', index, { monto: Number($event) || 0 })
          "
        />
        <q-input
          :model-value="pago.referencia"
          outlined
          dense
          placeholder="Ref."
          @update:model-value="
            emit('actualizar-pago', index, { referencia: String($event || '') })
          "
        />
        <q-btn
          v-if="pagos.length > 1"
          flat
          round
          dense
          color="negative"
          icon="close"
          size="sm"
          @click="emit('quitar-pago-mixto', index)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-methods__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.payment-methods__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sgi-text-muted);
}

.payment-methods__mixto {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--sgi-border);
  background: var(--sgi-surface);
  color: var(--sgi-text-secondary);
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition:
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    color var(--sgi-dur-fast) var(--sgi-ease-out),
    border-color var(--sgi-dur-fast) var(--sgi-ease-out);
}

.payment-methods__mixto:hover {
  border-color: var(--sgi-primary);
  color: var(--sgi-primary);
}

.payment-methods__mixto--active {
  background: color-mix(in srgb, var(--sgi-primary) 14%, transparent);
  border-color: var(--sgi-primary);
  color: var(--sgi-primary);
}

.payment-methods__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.payment-method {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  border: 1px solid var(--sgi-border);
  background: var(--sgi-surface);
  border-radius: 10px;
  cursor: pointer;
  color: var(--sgi-text-secondary);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  min-width: 0;
  transition:
    border-color var(--sgi-dur-fast) var(--sgi-ease-out),
    background var(--sgi-dur-fast) var(--sgi-ease-out),
    color var(--sgi-dur-fast) var(--sgi-ease-out),
    transform var(--sgi-dur-fast) var(--sgi-ease-out);
}

.payment-method:hover:not(:disabled):not(.is-active) {
  border-color: var(--sgi-border-strong);
  background: var(--sgi-surface-sunken);
  transform: translateY(-1px);
}

.payment-method:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.payment-method.is-active {
  border-color: var(--sgi-primary);
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sgi-primary) 18%, transparent);
}

.payment-methods__name {
  font-size: 0.7rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

// ── Mixto list ────────────────────────────────────────────────
.payment-methods__mixto-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.payment-methods__mixto-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  gap: 6px;
  align-items: center;
}

@media (max-width: 480px) {
  .payment-methods__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .payment-methods__mixto-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
