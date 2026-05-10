<template>
  <q-layout view="lHh Lpr lFf">
    <!-- ── Header ─────────────────────────────────────────── -->
    <q-header elevated class="sgi-header">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menú" @click="toggleDrawer" />

        <q-toolbar-title class="sgi-logo">
          <q-icon name="inventory_2" size="22px" class="q-mr-xs" />
          SGI - MAXEL
          <span class="sgi-logo-sub">Inventarios</span>
        </q-toolbar-title>

        <q-chip
          v-if="sucursalActiva"
          icon="store"
          :label="sucursalActiva.nombre"
          dense
          class="q-mr-sm sgi-store-chip"
        />

<!--        <q-btn flat round dense icon="notifications">
          <q-badge color="negative" floating>0</q-badge>
          <q-tooltip>Alertas de stock</q-tooltip>
        </q-btn>-->

        <div class="sgi-theme-toggle q-ml-sm">
          <q-btn-toggle
            v-model="selectedThemeModel"
            unelevated
            rounded
            no-caps
            spread
            toggle-color="transparent"
            color="transparent"
            text-color="grey-7"
            :options="themeToggleOptions"
            @update:model-value="selectTheme"
          >
            <template #light>
              <div class="sgi-theme-toggle__option">
                <q-icon name="light_mode" size="16px" />
                <span class="sgi-theme-toggle__label">Claro</span>
              </div>
            </template>
            <template #medium>
              <div class="sgi-theme-toggle__option">
                <q-icon name="desktop_windows" size="16px" />
                <span class="sgi-theme-toggle__label">Medio</span>
              </div>
            </template>
            <template #dark>
              <div class="sgi-theme-toggle__option">
                <q-icon name="dark_mode" size="16px" />
                <span class="sgi-theme-toggle__label">Oscuro</span>
              </div>
            </template>
          </q-btn-toggle>
        </div>

        <q-btn flat round class="q-ml-sm">
          <q-avatar size="32px" color="primary" text-color="white">{{ avatarLetra }}</q-avatar>
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 180px">
              <q-item-label header>{{ authStore.nombreUsuario }}</q-item-label>
              <q-item-label caption class="q-px-md q-pb-xs text-muted">{{ rolLabel }}</q-item-label>
              <q-separator />
              <q-item v-close-popup clickable @click="logout">
                <q-item-section avatar><q-icon name="logout" color="" /></q-item-section>
                <q-item-section>Cerrar sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- ── Sidebar ────────────────────────────────────────── -->
    <q-drawer v-model="drawerOpen" show-if-above :width="260" :breakpoint="768" class="sgi-drawer">
      <q-scroll-area class="fit">
        <div class="sgi-drawer-brand q-pa-md">
          <div class="text-h6 text-weight-bold text-primary">
            <q-icon name="inventory_2" class="q-mr-sm" />
            SGI - MAXEL
          </div>
          <div class="text-caption text-muted">Sistema de Gestión de Inventarios</div>
        </div>
        <q-separator />
        <q-list padding class="q-mt-sm">
          <template v-for="item in navItems" :key="item.name">
            <q-item
              v-if="canSeeItem(item)"
              :to="{ name: item.name }"
              active-class="sgi-nav-active"
              clickable
              v-ripple
              class="sgi-nav-item"
            >
              <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </template>
        </q-list>
        <div class="sgi-drawer-footer q-pa-md">
          <div class="text-caption text-muted">v{{ appVersion }}</div>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- ── Content ────────────────────────────────────────── -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useThemeStore, type AppTheme } from 'src/stores/themeStore'
import { ROL_LABELS } from 'src/types'
import type { Rol } from 'src/types'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const themeStore = useThemeStore()
const router = useRouter()
const $q = useQuasar()
const drawerOpen = ref(!$q.screen.lt.md)

const avatarLetra = computed(() =>
  authStore.nombreUsuario ? authStore.nombreUsuario[0].toUpperCase() : 'U',
)
const rolLabel = computed(() => (authStore.rol ? ROL_LABELS[authStore.rol as Rol] : ''))
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION)
const selectedThemeModel = computed({
  get: () => themeStore.selectedTheme,
  set: (value: AppTheme) => themeStore.setTheme(value),
})
const sucursalActiva = computed(() => {
  if (!authStore.sucursalId || authStore.sucursalId === 'ALL') return null
  return sucursalStore.getById(authStore.sucursalId)
})

const themeToggleOptions = [
  { value: 'light', slot: 'light' },
  { value: 'medium', slot: 'medium' },
  { value: 'dark', slot: 'dark' },
]

const navItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard.ver' },
  {
    name: 'seguridad',
    label: 'Seguridad',
    icon: 'admin_panel_settings',
    anyPermissions: ['usuarios.ver', 'roles.ver'],
  },
  { name: 'sucursales', label: 'Sucursales', icon: 'store', permission: 'sucursales.ver' },
  { name: 'productos', label: 'Productos', icon: 'inventory_2', permission: 'productos.ver' },
  { name: 'inventario', label: 'Inventario', icon: 'warehouse', permission: 'inventario.ver' },
  { name: 'catalogo', label: 'Catálogo', icon: 'menu_book', permission: 'catalogo.ver' },
  {
    name: 'proveedores',
    label: 'Proveedores',
    icon: 'local_shipping',
    permission: 'proveedores.ver',
  },
  { name: 'pos', label: 'Punto de Venta', icon: 'point_of_sale', permission: 'pos.ver' },
  { name: 'facturacion', label: 'Facturación', icon: 'receipt_long', permission: 'facturas.ver' },
  { name: 'reportes', label: 'Reportes', icon: 'bar_chart', permission: 'reportes.ver' },
]

function canSeeItem(item: { permission?: string; anyPermissions?: string[] }): boolean {
  if (item.permission) return authStore.can(item.permission)
  if (item.anyPermissions) return authStore.canAny(item.anyPermissions)
  return true
}

function toggleDrawer(): void {
  drawerOpen.value = !drawerOpen.value
}

function selectTheme(theme: AppTheme): void {
  themeStore.setTheme(theme)
}

async function logout(): Promise<void> {
  authStore.logout()
  await router.push({ name: 'login' })
}

watch(
  () => themeStore.selectedTheme,
  () => {
    themeStore.applyTheme($q)
  },
  { immediate: true },
)

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()

  if (authStore.rol === 'CONSULTA_CATALOGO') {
    await router.push({ name: 'catalogo' })
  }
})
</script>

<style scoped lang="scss">
.sgi-header {
  background: var(--sgi-header-bg);
  color: var(--sgi-text);
  border-bottom: 1px solid var(--sgi-border);
  backdrop-filter: blur(16px);
  height: var(--sgi-header-height);
}
.sgi-logo {
  color: var(--sgi-text);
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sgi-logo-sub {
  color: var(--sgi-text-muted);
  font-weight: 600;
  font-size: 0.95rem;
  margin-left: 4px;
  opacity: 0.72;
}
.sgi-drawer {
  background: var(--sgi-surface);
  border-right: 1px solid var(--sgi-border);
  .sgi-drawer-brand {
    background: var(--sgi-surface-alt);
  }
  .sgi-drawer-footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    border-top: 1px solid var(--sgi-border);
  }
}
.sgi-nav-item {
  border-radius: var(--sgi-radius);
  margin: 2px 8px;
  transition: background 0.15s;
}
.sgi-store-chip {
  background: var(--sgi-chip-bg);
  color: var(--sgi-chip-text);
  border: 1px solid var(--sgi-border);
}

.sgi-header :deep(.q-btn) {
  color: var(--sgi-text);
}

.sgi-header :deep(.q-icon) {
  color: inherit;
}

.sgi-header :deep(.q-toolbar__title) {
  color: var(--sgi-text);
}
.sgi-theme-toggle {
  width: 240px;
}

.sgi-theme-toggle :deep(.q-btn-toggle) {
  width: 100%;
  padding: 4px;
  border: 1px solid var(--sgi-border);
  background: color-mix(in srgb, var(--sgi-surface) 90%, transparent);
  border-radius: 16px;
}

.sgi-theme-toggle :deep(.q-btn) {
  min-height: 38px;
  color: var(--sgi-text-muted) !important;
  border-radius: 12px !important;
}

.sgi-theme-toggle :deep(.q-btn[aria-pressed='true']) {
  background: color-mix(in srgb, var(--sgi-surface-alt) 86%, white) !important;
  color: var(--sgi-text) !important;
  box-shadow: 0 4px 14px rgba(15, 23, 40, 0.08);
}

.sgi-theme-toggle__option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.sgi-theme-toggle__label {
  font-size: 0.84rem;
  font-weight: 500;
}
:deep(.sgi-nav-active) {
  background: color-mix(in srgb, var(--sgi-primary) 18%, transparent) !important;
  color: var(--sgi-primary) !important;
  font-weight: 600;
  .q-icon {
    color: var(--sgi-primary) !important;
  }
}

@media (max-width: 768px) {
  .sgi-logo {
    font-size: 1rem;
  }

  .sgi-logo-sub {
    display: none;
  }

  .sgi-theme-toggle {
    width: auto;
  }

  .sgi-theme-toggle :deep(.q-btn-toggle) {
    min-width: 116px;
  }

  .sgi-theme-toggle__label {
    display: none;
  }
}
</style>
