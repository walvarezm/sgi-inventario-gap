// =============================================================
// router/index.ts — Vue Router con lazy loading y tipado
// =============================================================
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { authGuard, roleGuard, guestGuard } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('src/layouts/AuthLayout.vue'),
    beforeEnter: guestGuard,
    children: [
      { path: '', name: 'login', component: () => import('src/pages/auth/LoginPage.vue') },
    ],
  },
  {
    path: '/',
    component: () => import('src/layouts/MainLayout.vue'),
    beforeEnter: authGuard,
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard', name: 'dashboard',
        component: () => import('src/pages/dashboard/DashboardPage.vue'),
        meta: { title: 'Dashboard', icon: 'dashboard' },
      },
      {
        path: 'sucursales', name: 'sucursales',
        component: () => import('src/pages/sucursales/SucursalesPage.vue'),
        meta: { title: 'Sucursales', icon: 'store' },
        beforeEnter: roleGuard(['ADMINISTRADOR', 'SUPERVISOR']),
      },
      {
        path: 'productos', name: 'productos',
        component: () => import('src/pages/productos/ProductosPage.vue'),
        meta: { title: 'Productos', icon: 'inventory_2' },
      },
      {
        path: 'inventario', name: 'inventario',
        component: () => import('src/pages/inventario/InventarioPage.vue'),
        meta: { title: 'Inventario', icon: 'warehouse' },
      },
      {
        path: 'catalogo', name: 'catalogo',
        component: () => import('src/pages/catalogo/CatalogoPage.vue'),
        meta: { title: 'Catálogo', icon: 'menu_book' },
      },
      {
        path: 'proveedores', name: 'proveedores',
        component: () => import('src/pages/proveedores/ProveedoresPage.vue'),
        meta: { title: 'Proveedores', icon: 'local_shipping' },
        beforeEnter: roleGuard(['ADMINISTRADOR', 'SUPERVISOR', 'BODEGUERO', 'CONTADOR']),
      },
      {
        path: 'pos', name: 'pos',
        component: () => import('src/pages/pos/PosPage.vue'),
        meta: { title: 'Punto de Venta', icon: 'point_of_sale' },
        beforeEnter: roleGuard(['ADMINISTRADOR', 'SUPERVISOR', 'VENDEDOR']),
      },
      {
        path: 'facturacion', name: 'facturacion',
        component: () => import('src/pages/facturacion/FacturacionPage.vue'),
        meta: { title: 'Facturación', icon: 'receipt_long' },
        beforeEnter: roleGuard(['ADMINISTRADOR', 'SUPERVISOR', 'VENDEDOR', 'CONTADOR']),
      },
      {
        path: 'reportes', name: 'reportes',
        component: () => import('src/pages/reportes/ReportesPage.vue'),
        meta: { title: 'Reportes', icon: 'bar_chart' },
        beforeEnter: roleGuard(['ADMINISTRADOR', 'SUPERVISOR', 'CONTADOR']),
      },
    ],
  },
  { path: '/sin-permiso', name: 'sin-permiso', component: () => import('src/pages/auth/SinPermisoPage.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('src/pages/auth/NotFoundPage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

export default router
