<template>
  <q-layout view="lHh lpr lFf">
    <!-- ── Header ─────────────────────────────────────────── -->
    <q-header elevated class="sgi-header">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menú" @click="toggleDrawer" />

        <q-toolbar-title class="sgi-logo">
          <q-icon name="inventory_2" size="15px" class="q-mr-xs" />
          <span>{{ appName }}</span>
          <span class="sgi-logo-sub">[ {{ appNameSub }} ]</span>
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
          <button
            type="button"
            class="sgi-theme-toggle__btn"
            :class="{ 'sgi-theme-toggle__btn--dark': themeStore.isDark }"
            :aria-label="themeStore.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
            :aria-pressed="themeStore.isDark"
            @click="themeStore.toggleTheme()"
          >
            <span class="sgi-theme-toggle__thumb">
              <q-icon
                :name="themeStore.isDark ? 'dark_mode' : 'light_mode'"
                size="16px"
              />
            </span>
            <span class="sgi-theme-toggle__hint">
              {{ themeStore.isDark ? 'Oscuro' : 'Claro' }}
            </span>
          </button>
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

    <q-footer v-if="!isMobile" elevated class="sgi-footer q-pa-sm">
      <q-icon name="copyright" size="14px" class="q-mr-xs" color="primary" text-color="white" />
      <div class="text-caption text-muted text-center">{{ appAuthor }}</div>
    </q-footer>

    <!-- ── Sidebar ────────────────────────────────────────── -->
    <q-drawer v-model="drawerOpen" show-if-above :width="260" :breakpoint="768" class="sgi-drawer">
      <q-scroll-area class="fit">
        <div class="sgi-drawer-brand q-pa-md">
          <div class="text-body1 text-weight-bolder text-grey-3 text-left q-mt-xs">
            <q-icon name="inventory_2" class="q-mr-md" />
            <span>{{ appName }}</span>
          </div>
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
        <div class="sgi-drawer-footers sgi-footer q-pa-md" ele>
          <div class="text-caption text-muted">{{ appVersion }}</div>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- ── Content ────────────────────────────────────────── -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-page-scroller position="bottom-right" :scroll-offset="160" :offset="scrollTopButtonOffset">
      <q-btn
        fab
        icon="keyboard_arrow_up"
        color="primary"
        class="sgi-scroll-top-btn"
        aria-label="Subir al inicio"
      >
        <q-tooltip>Subir al inicio</q-tooltip>
      </q-btn>
    </q-page-scroller>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { useThemeStore } from 'src/stores/themeStore'
import { ROL_LABELS } from 'src/types'
import type { Rol } from 'src/types'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const themeStore = useThemeStore()
const router = useRouter()
const $q = useQuasar()
const drawerOpen = ref(!$q.screen.lt.md)
const isMobile = computed(() => $q.screen.lt.md)

// ── Config ──────────────────────────────────────────────────
const appName = computed(() =>
  !isMobile.value ? (import.meta.env.VITE_APP_NAME ?? 'SGI - MAXEL') : 'SGI - MAXEL',
)

const appNameSub = computed(() => (!isMobile.value ? import.meta.env.VITE_APP_NAME_SUBTITLE : ''))
const appAuthor = computed(() =>
  !isMobile.value ? (import.meta.env.VITE_APP_AUTHOR ?? 'AlvareX') : '',
)

const avatarLetra = computed(() =>
  authStore.nombreUsuario ? authStore.nombreUsuario[0].toUpperCase() : 'U',
)
const rolLabel = computed(() => (authStore.rol ? ROL_LABELS[authStore.rol as Rol] : ''))
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION)
const scrollTopButtonOffset = computed<[number, number]>(() => [18, isMobile.value ? 18 : 64])
const sucursalActiva = computed(() => {
  if (!authStore.sucursalId || authStore.sucursalId === 'ALL') return null
  return sucursalStore.getById(authStore.sucursalId)
})

const navItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard.ver' },
  {
    name: 'seguridad',
    label: 'Seguridad',
    icon: 'admin_panel_settings',
    anyPermissions: ['usuarios.ver', 'roles.ver'],
  },
  { name: 'sucursales', label: 'Sucursales', icon: 'store', permission: 'sucursales.ver' },
  { name: 'marcas', label: 'Marcas', icon: 'copyright', permission: 'productos.ver' },
  { name: 'categorias', label: 'Categorías', icon: 'category', permission: 'productos.ver' },
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
  font-size: 0.85rem;
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
    bottom: 100px;
    width: 100%;
    border-top: 1px solid var(--sgi-border);
  }
}
.sgi-footer {
  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--sgi-surface);

  width: 100%;
  border-top: 1px solid var(--sgi-border);

  .sgi-footer-brand {
    background: var(--sgi-surface-alt);
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
.sgi-scroll-top-btn {
  box-shadow: 0 10px 24px rgba(15, 23, 40, 0.18);
}
.sgi-theme-toggle {
  display: flex;
  align-items: center;
}

// ── Sun/Moon switch button ─────────────────────────────────────
.sgi-theme-toggle__btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px 0 4px;
  border: 1px solid var(--sgi-border);
  background: var(--sgi-surface-soft);
  color: var(--sgi-text);
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    background var(--sgi-dur-normal) var(--sgi-ease-out),
    border-color var(--sgi-dur-normal) var(--sgi-ease-out),
    color var(--sgi-dur-normal) var(--sgi-ease-out),
    box-shadow var(--sgi-dur-normal) var(--sgi-ease-out);
}

.sgi-theme-toggle__btn:hover {
  border-color: var(--sgi-border-strong);
  background: var(--sgi-surface);
  box-shadow: var(--sgi-shadow-sm);
}

.sgi-theme-toggle__btn:focus-visible {
  outline: 2px solid var(--sgi-primary);
  outline-offset: 2px;
}

.sgi-theme-toggle__thumb {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff7e6;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
  transition:
    background var(--sgi-dur-normal) var(--sgi-ease-out),
    transform var(--sgi-dur-normal) var(--sgi-ease-spring),
    box-shadow var(--sgi-dur-normal) var(--sgi-ease-out);
}

.sgi-theme-toggle__btn--dark .sgi-theme-toggle__thumb {
  background: linear-gradient(135deg, #6366f1, #4338ca);
  color: #e0e7ff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);
  transform: rotate(360deg);
}

.sgi-theme-toggle__hint {
  color: var(--sgi-text-secondary);
  user-select: none;
}

@media (max-width: 768px) {
  .sgi-theme-toggle__hint {
    display: none;
  }
  .sgi-theme-toggle__btn {
    padding: 0 4px 0 4px;
    width: 38px;
    justify-content: center;
  }
}
:deep(.sgi-nav-active) {
  background: color-mix(in srgb, var(--sgi-primary) 18%, transparent) !important;
  color: var(--sgi-primary) !important;
  font-weight: 600;
  .q-icon {
    color: var(--sgi-primary) !important;
  }
}

@media (max-width: 1024px) {
  .sgi-logo {
    font-size: 1rem;
  }
  .sgi-logo-sub {
    display: none;
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
