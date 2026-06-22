<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import type { Sucursal } from 'src/types'
import { TODAS_LAS_SUCURSALES } from 'src/composables/useSucursalCatalog'

interface Props {
  modelValue: string
  size?: 'sm' | 'md' | 'lg'
  /** Mostrar la etiqueta "Sucursal:" antes del nombre. Por defecto true. */
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), { size: 'md', showLabel: true })
const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()

const menuOpen = ref(false)
const search = ref('')
const triggerRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

/** Puede cambiar de sucursal: admin, supervisor, o con permiso `sucursales.ver` */
const puedeCambiarSucursal = computed(() => authStore.isGlobal || authStore.can('sucursales.ver'))

const opcionesFiltradas = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = sucursalStore.activas
  if (!q) return base
  return base.filter(
    (s) => s.nombre.toLowerCase().includes(q) || (s.ciudad ?? '').toLowerCase().includes(q),
  )
})

const sucursalActual = computed(() => {
  if (props.modelValue === TODAS_LAS_SUCURSALES) {
    return { id: TODAS_LAS_SUCURSALES, nombre: 'Todas las sucursales', ciudad: 'Vista global' } as
      | Sucursal
      | (Pick<Sucursal, 'id' | 'nombre' | 'ciudad'> & { id: string })
  }
  return sucursalStore.getById(props.modelValue)
})

const esMiSucursal = computed(() => {
  if (props.modelValue === TODAS_LAS_SUCURSALES) return false
  return props.modelValue && props.modelValue === authStore.sucursalId
})

function seleccionar(id: string): void {
  console.log('seleccionar sucursalSeleccionadaActiva', id)
  emit('update:modelValue', id)
  emit('change', id)
  menuOpen.value = false
  search.value = ''
}

function positionMenu(): void {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const top = rect.bottom + 6
  const width = Math.max(rect.width, 280)
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))
  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  }
}

function openMenu(): void {
  if (!puedeCambiarSucursal.value) return
  positionMenu()
  menuOpen.value = true
}

function onScroll(): void {
  if (menuOpen.value) positionMenu()
}

function onResize(): void {
  if (menuOpen.value) positionMenu()
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div
    ref="triggerRef"
    class="sucursal-switcher"
    :class="[
      `sucursal-switcher--${size}`,
      {
        'sucursal-switcher--open': menuOpen,
        'sucursal-switcher--locked': !puedeCambiarSucursal,
        'sucursal-switcher--all': modelValue === TODAS_LAS_SUCURSALES,
      },
    ]"
  >
    <button
      type="button"
      class="sucursal-switcher__trigger"
      :aria-label="`Sucursal actual: ${sucursalActual?.nombre ?? 'Sin seleccionar'}`"
      :aria-disabled="!puedeCambiarSucursal"
      :aria-expanded="menuOpen"
      @click="openMenu"
    >
      <span class="sucursal-switcher__icon">
        <q-icon :name="modelValue === TODAS_LAS_SUCURSALES ? 'public' : 'store'" size="18px" />
      </span>
      <span class="sucursal-switcher__body">
        <span v-if="showLabel" class="sucursal-switcher__label">
          {{ puedeCambiarSucursal ? 'Sucursal' : 'Mi sucursal' }}
        </span>
        <span class="sucursal-switcher__name">
          {{ sucursalActual?.nombre ?? 'Seleccionar' }}
        </span>
      </span>
      <q-icon
        v-if="puedeCambiarSucursal"
        :name="menuOpen ? 'expand_less' : 'expand_more'"
        size="20px"
        class="sucursal-switcher__caret"
      />
      <q-icon v-else name="lock" size="14px" class="sucursal-switcher__lock">
        <q-tooltip>Tu rol no permite consultar otras sucursales</q-tooltip>
      </q-icon>
    </button>

    <span v-if="esMiSucursal" class="sucursal-switcher__pill">Mi sucursal</span>

    <Teleport v-if="menuOpen" to="body">
      <div class="sucursal-switcher__backdrop" @click="menuOpen = false" />
      <div class="sucursal-switcher__menu" role="listbox" :style="menuStyle" @click.stop>
        <div class="sucursal-switcher__menu-head">
          <q-icon name="store" size="18px" />
          <span>Cambiar de sucursal</span>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" @click="menuOpen = false" />
        </div>

        <div class="sucursal-switcher__menu-search">
          <q-icon name="search" size="18px" />
          <input
            v-model="search"
            class="sucursal-switcher__menu-input"
            type="text"
            placeholder="Buscar por nombre o ciudad…"
            autofocus
          />
        </div>

        <div class="sucursal-switcher__menu-list">
          <button
            type="button"
            class="sucursal-switcher__option"
            :class="{
              'sucursal-switcher__option--active': modelValue === TODAS_LAS_SUCURSALES,
            }"
            role="option"
            :aria-selected="modelValue === TODAS_LAS_SUCURSALES"
            @click="seleccionar(TODAS_LAS_SUCURSALES)"
          >
            <span class="sucursal-switcher__option-icon sucursal-switcher__option-icon--all">
              <q-icon name="public" size="18px" />
            </span>
            <span class="sucursal-switcher__option-body">
              <span class="sucursal-switcher__option-name">Todas las sucursales</span>
              <span class="sucursal-switcher__option-meta">Vista global consolidada</span>
            </span>
            <q-icon
              v-if="modelValue === TODAS_LAS_SUCURSALES"
              name="check"
              size="18px"
              class="sucursal-switcher__option-check"
            />
          </button>

          <div class="sucursal-switcher__divider">
            <span>Sucursales</span>
          </div>

          <button
            v-for="sucursal in opcionesFiltradas"
            :key="sucursal.id"
            type="button"
            class="sucursal-switcher__option"
            :class="{
              'sucursal-switcher__option--active': modelValue === sucursal.id,
              'sucursal-switcher__option--mine': sucursal.id === authStore.sucursalId,
            }"
            role="option"
            :aria-selected="modelValue === sucursal.id"
            @click="seleccionar(sucursal.id)"
          >
            <span class="sucursal-switcher__option-icon">
              <q-icon name="store" size="18px" />
            </span>
            <span class="sucursal-switcher__option-body">
              <span class="sucursal-switcher__option-name">
                {{ sucursal.nombre }}
                <span
                  v-if="sucursal.id === authStore.sucursalId"
                  class="sucursal-switcher__option-tag"
                >
                  Mi sucursal
                </span>
              </span>
              <span class="sucursal-switcher__option-meta">
                {{ sucursal.ciudad || '—' }}
                <span v-if="sucursal.telefono">· {{ sucursal.telefono }}</span>
              </span>
            </span>
            <q-icon
              v-if="modelValue === sucursal.id"
              name="check"
              size="18px"
              class="sucursal-switcher__option-check"
            />
          </button>

          <div v-if="!opcionesFiltradas.length" class="sucursal-switcher__empty">
            <q-icon name="search_off" size="20px" />
            <span>Sin resultados para "{{ search }}"</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.sucursal-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.sucursal-switcher__trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  min-width: 0;
  border-radius: 12px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  color: var(--sgi-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease,
    background 200ms ease;
}

.sucursal-switcher__trigger:hover {
  border-color: color-mix(in srgb, var(--sgi-primary) 35%, var(--sgi-border));
}

.sucursal-switcher--open .sucursal-switcher__trigger,
.sucursal-switcher__trigger:focus-visible {
  border-color: var(--sgi-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sgi-primary) 14%, transparent);
  outline: none;
}

.sucursal-switcher--locked .sucursal-switcher__trigger {
  cursor: default;
  background: color-mix(in srgb, var(--sgi-surface) 88%, transparent);
  border-style: dashed;
}

.sucursal-switcher--locked .sucursal-switcher__trigger:hover {
  border-color: var(--sgi-border);
}

.sucursal-switcher--all .sucursal-switcher__icon {
  background: color-mix(in srgb, var(--sgi-info) 18%, transparent);
  color: var(--sgi-info);
}

.sucursal-switcher__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  flex-shrink: 0;
}

.sucursal-switcher__body {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  line-height: 1.1;
}

.sucursal-switcher__label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sgi-text-muted);
}

.sucursal-switcher__name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--sgi-text);
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sucursal-switcher__caret {
  color: var(--sgi-text-muted);
  transition: transform 200ms ease;
}

.sucursal-switcher--open .sucursal-switcher__caret {
  color: var(--sgi-primary);
}

.sucursal-switcher__lock {
  color: var(--sgi-text-muted);
  opacity: 0.7;
}

.sucursal-switcher__pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sgi-primary) 14%, transparent);
  color: var(--sgi-primary);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

// ── Size variants ──────────────────────────────────────────────
.sucursal-switcher--sm .sucursal-switcher__trigger {
  height: 36px;
  padding: 0 10px;
}
.sucursal-switcher--sm .sucursal-switcher__icon {
  width: 24px;
  height: 24px;
}
.sucursal-switcher--sm .sucursal-switcher__name {
  font-size: 0.82rem;
  max-width: 160px;
}

.sucursal-switcher--lg .sucursal-switcher__trigger {
  height: 52px;
  padding: 0 18px;
  border-radius: 14px;
}
.sucursal-switcher--lg .sucursal-switcher__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}
.sucursal-switcher--lg .sucursal-switcher__name {
  font-size: 1rem;
  max-width: 280px;
}

// ── Dropdown menu ──────────────────────────────────────────────
.sucursal-switcher__backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
  animation: switcher-fade 180ms ease;
}

.sucursal-switcher__menu {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: var(--sgi-surface-soft);
  border: 1px solid var(--sgi-border);
  border-radius: 16px;
  box-shadow:
    0 24px 48px rgba(15, 23, 40, 0.18),
    0 4px 12px rgba(15, 23, 40, 0.08);
  overflow: hidden;
  backdrop-filter: blur(20px);
  animation: switcher-pop 220ms cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 70vh;
}

.sucursal-switcher__menu-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--sgi-text);
  border-bottom: 1px solid var(--sgi-border);
}

.sucursal-switcher__menu-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 12px 4px;
  padding: 0 12px;
  height: 36px;
  border-radius: 10px;
  background: var(--sgi-surface);
  border: 1px solid var(--sgi-border);
  color: var(--sgi-text-muted);
}

.sucursal-switcher__menu-search:focus-within {
  border-color: color-mix(in srgb, var(--sgi-primary) 40%, var(--sgi-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sgi-primary) 12%, transparent);
}

.sucursal-switcher__menu-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sgi-text);
  font: inherit;
  font-size: 0.85rem;
}

.sucursal-switcher__menu-input::placeholder {
  color: var(--sgi-text-muted);
}

.sucursal-switcher__menu-list {
  display: flex;
  flex-direction: column;
  padding: 4px 6px 8px;
  overflow-y: auto;
  max-height: 60vh;
}

.sucursal-switcher__divider {
  display: flex;
  align-items: center;
  margin: 8px 8px 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sgi-text-muted);
}

.sucursal-switcher__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  margin-left: 10px;
  background: var(--sgi-border);
}

.sucursal-switcher__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 10px;
  border: 0;
  background: transparent;
  color: var(--sgi-text);
  border-radius: 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 150ms ease;
}

.sucursal-switcher__option:hover,
.sucursal-switcher__option:focus-visible {
  background: color-mix(in srgb, var(--sgi-primary) 8%, transparent);
  outline: none;
}

.sucursal-switcher__option--active {
  background: color-mix(in srgb, var(--sgi-primary) 14%, transparent);
}

.sucursal-switcher__option--mine .sucursal-switcher__option-name {
  color: var(--sgi-primary);
}

.sucursal-switcher__option-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sgi-primary) 12%, transparent);
  color: var(--sgi-primary);
  flex-shrink: 0;
}

.sucursal-switcher__option-icon--all {
  background: color-mix(in srgb, var(--sgi-info) 14%, transparent);
  color: var(--sgi-info);
}

.sucursal-switcher__option-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.sucursal-switcher__option-name {
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sucursal-switcher__option-tag {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sgi-primary) 16%, transparent);
  color: var(--sgi-primary);
}

.sucursal-switcher__option-meta {
  font-size: 0.74rem;
  color: var(--sgi-text-muted);
}

.sucursal-switcher__option-check {
  color: var(--sgi-primary);
  flex-shrink: 0;
}

.sucursal-switcher__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 14px;
  color: var(--sgi-text-muted);
  font-size: 0.85rem;
}

.sucursal-switcher__pill {
  display: inline-flex;
}

@keyframes switcher-pop {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes switcher-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 720px) {
  .sucursal-switcher__name {
    max-width: 140px;
  }
  .sucursal-switcher__label {
    display: none;
  }
  .sucursal-switcher__menu {
    max-width: calc(100vw - 16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sucursal-switcher__trigger,
  .sucursal-switcher__caret,
  .sucursal-switcher__option,
  .sucursal-switcher__menu {
    transition: none;
    animation: none;
  }
}
</style>
