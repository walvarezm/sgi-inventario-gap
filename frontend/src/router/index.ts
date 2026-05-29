// =============================================================
// router/index.ts — Vue Router con lazy loading y tipado
// =============================================================
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { authGuard, anyPermissionGuard, permissionGuard, guestGuard } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('src/layouts/AuthLayout.vue'),
    beforeEnter: guestGuard,
    children: [
      { path: '', name: 'login', component: () => import('src/pages/auth/LoginPage.vue') },
    ],
  },

  // ── Ruta pública de detalle de producto (acceso sin sesión) ──
  // Usada cuando VITE_QR_MODE=enlace: el QR apunta a esta URL.
  {
    path: '/producto/:sku',
    name: 'detalle-producto-publico',
    component: () => import('src/pages/productos/DetalleProductoPage.vue'),
    meta: { public: true, title: 'Detalle de Producto' },
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
        path: 'seguridad', name: 'seguridad',
        component: () => import('src/pages/seguridad/SeguridadPage.vue'),
        meta: { title: 'Seguridad', icon: 'admin_panel_settings' },
        beforeEnter: anyPermissionGuard(['usuarios.ver', 'roles.ver']),
      },
      {
        path: 'sucursales', name: 'sucursales',
        component: () => import('src/pages/sucursales/SucursalesPage.vue'),
        meta: { title: 'Sucursales', icon: 'store' },
        beforeEnter: permissionGuard('sucursales.ver'),
      },
      {
        path: 'productos', name: 'productos',
        component: () => import('src/pages/productos/ProductosPage.vue'),
        meta: { title: 'Productos', icon: 'inventory_2' },
        beforeEnter: permissionGuard('productos.ver'),
      },
      {
        path: 'inventario', name: 'inventario',
        component: () => import('src/pages/inventario/InventarioPage.vue'),
        meta: { title: 'Inventario', icon: 'warehouse' },
        beforeEnter: permissionGuard('inventario.ver'),
      },
      {
        path: 'catalogo', name: 'catalogo',
        component: () => import('src/pages/catalogo/CatalogoPage.vue'),
        meta: { title: 'Catálogo', icon: 'menu_book' },
        beforeEnter: permissionGuard('catalogo.ver'),
      },
      {
        path: 'proveedores', name: 'proveedores',
        component: () => import('src/pages/proveedores/ProveedoresPage.vue'),
        meta: { title: 'Proveedores', icon: 'local_shipping' },
        beforeEnter: permissionGuard('proveedores.ver'),
      },
      {
        path: 'pos', name: 'pos',
        component: () => import('src/pages/pos/PosPage.vue'),
        meta: { title: 'Punto de Venta', icon: 'point_of_sale' },
        beforeEnter: permissionGuard('pos.ver'),
      },
      {
        path: 'facturacion', name: 'facturacion',
        component: () => import('src/pages/facturacion/FacturacionPage.vue'),
        meta: { title: 'Facturación', icon: 'receipt_long' },
        beforeEnter: permissionGuard('facturas.ver'),
      },
      {
        path: 'reportes', name: 'reportes',
        component: () => import('src/pages/reportes/ReportesPage.vue'),
        meta: { title: 'Reportes', icon: 'bar_chart' },
        beforeEnter: permissionGuard('reportes.ver'),
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
