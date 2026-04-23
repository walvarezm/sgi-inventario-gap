<template>
  <q-layout view="lHh Lpr lFf">
    <!-- ── Header ─────────────────────────────────────────── -->
    <q-header elevated class="sgi-header">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menú" @click="toggleDrawer" />

        <q-toolbar-title class="sgi-logo">
          <q-icon name="inventory_2" size="22px" class="q-mr-xs" />
          SGI <span class="sgi-logo-sub">Inventarios</span>
        </q-toolbar-title>

        <q-chip
          v-if="sucursalActiva"
          icon="store" :label="sucursalActiva.nombre"
          color="blue-2" text-color="blue-10" dense class="q-mr-sm"
        />

        <q-btn flat round dense icon="notifications">
          <q-badge color="negative" floating>3</q-badge>
          <q-tooltip>Alertas de stock</q-tooltip>
        </q-btn>

        <q-btn flat round dense icon="brightness_6" class="q-ml-xs" @click="toggleDark">
          <q-tooltip>Cambiar tema</q-tooltip>
        </q-btn>

        <q-btn flat round class="q-ml-sm">
          <q-avatar size="32px" color="primary" text-color="white">{{ avatarLetra }}</q-avatar>
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 180px">
              <q-item-label header>{{ authStore.nombreUsuario }}</q-item-label>
              <q-item-label caption class="q-px-md q-pb-xs text-muted">{{ rolLabel }}</q-item-label>
              <q-separator />
              <q-item v-close-popup clickable @click="logout">
                <q-item-section avatar><q-icon name="logout" color="negative" /></q-item-section>
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
            <q-icon name="inventory_2" class="q-mr-sm" />SGI
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
              clickable v-ripple class="sgi-nav-item"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/authStore'
import { useSucursalStore } from 'src/stores/sucursalStore'
import { ROL_LABELS } from 'src/types'
import type { Rol } from 'src/types'

const authStore = useAuthStore()
const sucursalStore = useSucursalStore()
const router = useRouter()
const $q = useQuasar()
const drawerOpen = ref(true)

const avatarLetra = computed(() =>
  authStore.nombreUsuario ? authStore.nombreUsuario[0].toUpperCase() : 'U',
)
const rolLabel = computed(() => authStore.rol ? ROL_LABELS[authStore.rol as Rol] : '')
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION)
const sucursalActiva = computed(() => {
  if (!authStore.sucursalId || authStore.sucursalId === 'ALL') return null
  return sucursalStore.getById(authStore.sucursalId)
})

const navItems = [
  { name: 'dashboard',   label: 'Dashboard',     icon: 'dashboard',      roles: null },
  { name: 'sucursales',  label: 'Sucursales',     icon: 'store',          roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  { name: 'productos',   label: 'Productos',      icon: 'inventory_2',    roles: null },
  { name: 'inventario',  label: 'Inventario',     icon: 'warehouse',      roles: null },
  { name: 'catalogo',    label: 'Catálogo',       icon: 'menu_book',      roles: null },
  { name: 'proveedores', label: 'Proveedores',    icon: 'local_shipping', roles: ['ADMINISTRADOR', 'SUPERVISOR', 'BODEGUERO', 'CONTADOR'] },
  { name: 'pos',         label: 'Punto de Venta', icon: 'point_of_sale',  roles: ['ADMINISTRADOR', 'SUPERVISOR', 'VENDEDOR'] },
  { name: 'facturacion', label: 'Facturación',    icon: 'receipt_long',   roles: ['ADMINISTRADOR', 'SUPERVISOR', 'VENDEDOR', 'CONTADOR'] },
  { name: 'reportes',    label: 'Reportes',       icon: 'bar_chart',      roles: ['ADMINISTRADOR', 'SUPERVISOR', 'CONTADOR'] },
]

function canSeeItem(item: { roles: string[] | null }): boolean {
  if (!item.roles) return true
  return authStore.hasRole(item.roles as Rol[])
}

function toggleDrawer(): void { drawerOpen.value = !drawerOpen.value }
function toggleDark(): void { $q.dark.toggle() }
async function logout(): Promise<void> {
  authStore.logout()
  await router.push({ name: 'login' })
}

onMounted(async () => {
  if (sucursalStore.items.length === 0) await sucursalStore.fetchAll()
})
</script>

<style scoped lang="scss">
.sgi-header { background: var(--sgi-dark); height: var(--sgi-header-height); }
.sgi-logo { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; }
.sgi-logo-sub { font-weight: 300; font-size: 0.85rem; margin-left: 4px; opacity: 0.7; }
.sgi-drawer {
  background: var(--sgi-surface);
  border-right: 1px solid var(--sgi-border);
  .sgi-drawer-brand { background: var(--sgi-surface-alt); }
  .sgi-drawer-footer { position: absolute; bottom: 0; width: 100%; border-top: 1px solid var(--sgi-border); }
}
.sgi-nav-item { border-radius: var(--sgi-radius); margin: 2px 8px; transition: background 0.15s; }
:deep(.sgi-nav-active) {
  background: rgba(21, 101, 192, 0.1) !important;
  color: var(--sgi-primary) !important;
  font-weight: 600;
  .q-icon { color: var(--sgi-primary) !important; }
}
</style>
