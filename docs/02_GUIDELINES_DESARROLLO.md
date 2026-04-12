# 🛠️ Guía de Desarrollo — SGI
## Estándares, Convenciones y Guidelines

> **v1.1** — Actualizado con: TypeScript en todo el frontend, patrones para QR/imágenes, tipos para sucursales y catálogo.

---

## 1. Configuración del Entorno de Desarrollo

### Requisitos previos
```bash
Node.js >= 18.x
npm >= 9.x  (o yarn >= 1.22)
Git >= 2.x
Quasar CLI:  npm install -g @quasar/cli
Clasp (Apps Script CLI): npm install -g @google/clasp
Cuenta Google Workspace con Sheets, Drive y Apps Script habilitados
```

### Inicializar el proyecto con TypeScript
```bash
# Crear proyecto Quasar con TypeScript desde cero
npm create quasar@latest
# Seleccionar: Vue 3, TypeScript, Quasar v2, ESLint + Prettier

# O clonar el repositorio existente
git clone https://github.com/tu-org/sgi-inventarios.git
cd sgi-inventarios/frontend
npm install
cp .env.example .env.local
# Editar .env.local con las variables de entorno
```

### Estructura de directorios
```
sgi-inventarios/
├── frontend/                        # Proyecto Quasar / Vue 3 + TypeScript
│   ├── src/
│   │   ├── assets/
│   │   ├── boot/                    # Plugins: axios.ts, pinia.ts, i18n.ts
│   │   ├── components/              # Componentes reutilizables
│   │   │   ├── productos/
│   │   │   │   ├── ProductoForm.vue
│   │   │   │   ├── ProductoQR.vue   # Muestra y genera QR
│   │   │   │   └── ProductoImagen.vue
│   │   │   ├── catalogo/
│   │   │   │   ├── CatalogoTabla.vue
│   │   │   │   └── CatalogoTarjeta.vue
│   │   │   └── shared/
│   │   ├── composables/             # Lógica reutilizable tipada
│   │   │   ├── useInventario.ts
│   │   │   ├── usePOS.ts
│   │   │   ├── useCatalogo.ts
│   │   │   ├── useSucursal.ts
│   │   │   └── useQR.ts
│   │   ├── layouts/
│   │   │   ├── MainLayout.vue
│   │   │   └── AuthLayout.vue
│   │   ├── pages/
│   │   │   ├── dashboard/
│   │   │   ├── productos/
│   │   │   ├── inventario/
│   │   │   ├── sucursales/
│   │   │   ├── catalogo/            # Consulta de catálogo por sucursal
│   │   │   ├── proveedores/
│   │   │   ├── pos/
│   │   │   ├── facturacion/
│   │   │   └── reportes/
│   │   ├── router/
│   │   │   ├── index.ts
│   │   │   └── guards.ts            # Guards de autenticación y rol/sucursal
│   │   ├── services/                # Llamadas a la API GAS (tipadas)
│   │   │   ├── api.ts               # Instancia Axios base
│   │   │   ├── productoService.ts
│   │   │   ├── inventarioService.ts
│   │   │   ├── sucursalService.ts
│   │   │   ├── cataloService.ts
│   │   │   ├── proveedorService.ts
│   │   │   ├── facturaService.ts
│   │   │   └── authService.ts
│   │   ├── stores/                  # Pinia stores tipados
│   │   │   ├── productoStore.ts
│   │   │   ├── sucursalStore.ts
│   │   │   ├── authStore.ts
│   │   │   └── cataloStore.ts
│   │   ├── types/                   # Interfaces y tipos globales
│   │   │   ├── index.ts             # Re-exports
│   │   │   ├── producto.types.ts
│   │   │   ├── sucursal.types.ts
│   │   │   ├── inventario.types.ts
│   │   │   ├── factura.types.ts
│   │   │   ├── usuario.types.ts
│   │   │   └── api.types.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── qrUtils.ts
│   ├── public/
│   ├── quasar.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                         # Google Apps Script
│   ├── src/
│   │   ├── main.gs
│   │   ├── auth.gs
│   │   ├── config.gs
│   │   ├── db/
│   │   │   └── sheets.gs
│   │   └── services/
│   │       ├── ProductoService.gs
│   │       ├── InventarioService.gs
│   │       ├── MovimientoService.gs
│   │       ├── SucursalService.gs
│   │       ├── CatalogoService.gs
│   │       ├── ProveedorService.gs
│   │       ├── FacturaService.gs
│   │       └── AlertaService.gs
│   ├── .clasp.json
│   └── appsscript.json
│
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

---

## 2. Convenciones de Código

### General
- Idioma del código: **inglés** (variables, funciones, interfaces, comentarios técnicos).
- Idioma de la UI y documentación: **español**.
- Lenguaje: **TypeScript estricto** en todo el frontend (`"strict": true` en tsconfig).
- Indentación: **2 espacios**.
- Comillas: **simples** en TS, **dobles** en HTML templates.
- Punto y coma: **omitir** (ESLint configurado).
- Máximo de caracteres por línea: **100**.

### Nomenclatura de archivos
```
PascalCase  → Componentes:   ProductoForm.vue, CatalogoTabla.vue
kebab-case  → Páginas:       lista-productos.vue, catalogo-sucursal.vue
camelCase   → Composables:   useInventario.ts, useCatalogo.ts
camelCase   → Stores:        productoStore.ts, sucursalStore.ts
camelCase   → Services:      productoService.ts, cataloService.ts
kebab-case  → Types files:   producto.types.ts, sucursal.types.ts
```

---

## 3. Tipos e Interfaces (TypeScript)

Todos los tipos globales se definen en `src/types/`. Ningún componente, composable o store debe usar `any`.

### `producto.types.ts`
```typescript
export interface Producto {
  id: string
  sku: string
  marca: string
  nombre: string
  descripcion: string
  categoriaId: string
  unidad: string
  precioCompra: number
  precioOfrecido: number   // Precio de lista / referencia
  precioFinal: number      // Precio de venta al cliente
  stockMinimo: number
  imagenUrl: string        // URL pública en Google Drive
  qrCode: string           // Cadena codificada en el QR (SKU o URL)
  activo: boolean
  fechaCreacion: string
}

export type ProductoForm = Omit<Producto, 'id' | 'fechaCreacion'>

export interface ProductoCatalogo {
  id: string
  sku: string
  marca: string
  nombre: string
  descripcion: string
  precioOfrecido: number
  precioFinal: number
  stock: number            // Stock en la sucursal consultada
  imagenUrl: string
  qrCode: string
  stockBajo: boolean       // stock <= stockMinimo
}
```

### `sucursal.types.ts`
```typescript
export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  ciudad: string
  telefono: string
  email: string
  responsableId: string
  activo: boolean
  fechaCreacion: string
}

export type SucursalForm = Omit<Sucursal, 'id' | 'fechaCreacion'>
```

### `usuario.types.ts`
```typescript
export type Rol = 'ADMINISTRADOR' | 'SUPERVISOR' | 'BODEGUERO' | 'VENDEDOR' | 'CONTADOR'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  sucursalId: string   // 'ALL' para Administrador
  activo: boolean
  fechaCreacion: string
}

export interface SesionUsuario {
  userId: string
  nombre: string
  email: string
  rol: Rol
  sucursalId: string
  token: string
}
```

### `api.types.ts`
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  result: T
}

export interface ApiError {
  success: false
  message: string
  result: null
}
```

---

## 4. Estructura de Componentes Vue + TypeScript

```vue
<template>
  <!-- Estructura HTML -->
</template>

<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import type { Producto } from 'src/types'

// 2. Props & Emits
interface Props {
  productoId: string
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), { readonly: false })
const emit = defineEmits<{
  saved: [producto: Producto]
  cancelled: []
}>()

// 3. Stores
// 4. Estado reactivo
// 5. Computed
// 6. Métodos
// 7. Lifecycle hooks
// 8. Watchers
</script>

<style scoped lang="scss">
/* Estilos locales */
</style>
```

---

## 5. Ejemplos de Código con TypeScript

### Servicio de API tipado (`productoService.ts`)
```typescript
// src/services/productoService.ts
import { api } from './api'
import type { Producto, ProductoForm, ApiResponse } from 'src/types'

export const productoService = {
  async getAll(): Promise<Producto[]> {
    const { data } = await api.get<ApiResponse<Producto[]>>('', {
      params: { action: 'getProductos' }
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async create(producto: ProductoForm): Promise<Producto> {
    const { data } = await api.post<ApiResponse<Producto>>('', {
      action: 'createProducto',
      payload: producto
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  },

  async update(id: string, changes: Partial<ProductoForm>): Promise<boolean> {
    const { data } = await api.post<ApiResponse<boolean>>('', {
      action: 'updateProducto',
      payload: { id, ...changes }
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  }
}
```

### Servicio de Catálogo por Sucursal (`cataloService.ts`)
```typescript
// src/services/cataloService.ts
import { api } from './api'
import type { ProductoCatalogo, ApiResponse } from 'src/types'

export const cataloService = {
  async getBySucursal(sucursalId: string): Promise<ProductoCatalogo[]> {
    const { data } = await api.get<ApiResponse<ProductoCatalogo[]>>('', {
      params: { action: 'getCatalogo', sucursal_id: sucursalId }
    })
    if (!data.success) throw new Error(data.message)
    return data.result
  }
}
```

### Pinia Store tipado (`sucursalStore.ts`)
```typescript
// src/stores/sucursalStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Sucursal } from 'src/types'
import { sucursalService } from 'src/services/sucursalService'

export const useSucursalStore = defineStore('sucursal', () => {
  const items = ref<Sucursal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activas = computed(() => items.value.filter(s => s.activo))

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await sucursalService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  function getById(id: string): Sucursal | undefined {
    return items.value.find(s => s.id === id)
  }

  return { items, loading, error, activas, fetchAll, getById }
})
```

### Composable de Catálogo (`useCatalogo.ts`)
```typescript
// src/composables/useCatalogo.ts
import { ref, computed } from 'vue'
import type { ProductoCatalogo } from 'src/types'
import { cataloService } from 'src/services/cataloService'

export function useCatalogo() {
  const productos = ref<ProductoCatalogo[]>([])
  const loading = ref(false)
  const busqueda = ref('')
  const categoriaFiltro = ref<string | null>(null)

  const productosFiltrados = computed(() => {
    let lista = productos.value
    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase()
      lista = lista.filter(p =>
        p.sku.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q)
      )
    }
    return lista
  })

  async function cargarCatalogo(sucursalId: string): Promise<void> {
    loading.value = true
    try {
      productos.value = await cataloService.getBySucursal(sucursalId)
    } finally {
      loading.value = false
    }
  }

  return { productos, loading, busqueda, categoriaFiltro, productosFiltrados, cargarCatalogo }
}
```

### Composable de QR (`useQR.ts`)
```typescript
// src/composables/useQR.ts
import QRCode from 'qrcode'

export function useQR() {
  async function generarDataUrl(texto: string, size = 200): Promise<string> {
    return QRCode.toDataURL(texto, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  }

  function buildQrContent(sku: string, baseUrl: string): string {
    return `${baseUrl}/producto/${sku}`
  }

  return { generarDataUrl, buildQrContent }
}
```

### Guard de ruta con validación de sucursal (`guards.ts`)
```typescript
// src/router/guards.ts
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from 'src/stores/authStore'
import type { Rol } from 'src/types'

export function requireRole(roles: Rol[]) {
  return (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const auth = useAuthStore()
    if (!auth.sesion) return next('/login')
    if (!roles.includes(auth.sesion.rol)) return next('/sin-permiso')
    next()
  }
}

// Rutas de catálogo global solo para Admin y Supervisor
// requireRole(['ADMINISTRADOR', 'SUPERVISOR'])
```

---

## 6. Backend — Google Apps Script

### Router principal (`main.gs`)
```javascript
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const { action, payload, token } = body

    if (action !== 'login') {
      const session = Auth.verifyToken(token)
      if (!session.valid) return respond(401, 'No autorizado')

      // Inyectar sesión en el contexto para validaciones de sucursal
      body._session = session
    }

    const routes = {
      // Productos
      'getProductos':     () => ProductoService.getAll(payload),
      'createProducto':   () => ProductoService.create(payload),
      'updateProducto':   () => ProductoService.update(payload),
      'deleteProducto':   () => ProductoService.remove(payload),
      // Catálogo por sucursal
      'getCatalogo':      () => CatalogoService.getBySucursal(payload, body._session),
      // Sucursales
      'getSucursales':    () => SucursalService.getAll(),
      'createSucursal':   () => SucursalService.create(payload),
      'updateSucursal':   () => SucursalService.update(payload),
      // Inventario
      'registrarEntrada': () => MovimientoService.entrada(payload, body._session),
      'registrarSalida':  () => MovimientoService.salida(payload, body._session),
      'transferir':       () => MovimientoService.transferir(payload, body._session),
      // Facturas
      'createFactura':    () => FacturaService.create(payload, body._session),
    }

    if (!routes[action]) return respond(404, 'Acción no encontrada')
    const result = routes[action]()
    return respond(200, 'OK', result)

  } catch (err) {
    Logger.log(err)
    return respond(500, err.message)
  }
}
```

### Servicio de Catálogo (`CatalogoService.gs`)
```javascript
const CatalogoService = {
  getBySucursal(payload, session) {
    const { sucursal_id } = payload

    // Validar acceso: solo Admin/Supervisor pueden consultar cualquier sucursal
    if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
      if (session.sucursalId !== sucursal_id) {
        throw new Error('Acceso no autorizado a esta sucursal')
      }
    }

    const productos = Sheets.getAll('Productos').filter(p => p.activo === true)
    const inventario = Sheets.getAll('Inventario')

    const stockMap = {}
    inventario
      .filter(i => i.sucursal_id === sucursal_id)
      .forEach(i => { stockMap[i.producto_id] = Number(i.stock_actual) || 0 })

    return productos.map(p => ({
      id: p.id,
      sku: p.sku,
      marca: p.marca,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precioOfrecido: Number(p.precio_ofrecido),
      precioFinal: Number(p.precio_final),
      stock: stockMap[p.id] ?? 0,
      imagenUrl: p.imagen_url,
      qrCode: p.qr_code,
      stockBajo: (stockMap[p.id] ?? 0) <= Number(p.stock_minimo)
    }))
  }
}
```

### Subida de imágenes a Drive (`ProductoService.gs`)
```javascript
const ProductoService = {
  subirImagen(payload) {
    // payload.base64: string base64 de la imagen
    // payload.nombre: nombre del archivo
    const folder = DriveApp.getFoldersByName('sgi-imagenes').next()
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.base64),
      payload.mimeType,
      payload.nombre
    )
    const file = folder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    // URL de previsualización directa
    return `https://drive.google.com/uc?export=view&id=${file.getId()}`
  }
}
```

---

## 7. Variables de Entorno

### Frontend (`.env.local` y `.env.production`)
```env
VITE_GAS_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
VITE_APP_NAME=SGI - Gestión de Inventarios
VITE_APP_VERSION=1.1.0
VITE_QR_BASE_URL=https://sgi.tudominio.com
```

### `src/env.d.ts` — Tipado de variables de entorno
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_QR_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### Apps Script (Script Properties)
```
SPREADSHEET_ID       = ID del Google Sheet principal
JWT_SECRET           = cadena aleatoria >= 32 caracteres
ADMIN_EMAIL          = admin@tudominio.com
STOCK_ALERT_EMAIL    = alertas@tudominio.com
DRIVE_FOLDER_IMAGENES = ID de la carpeta Drive para imágenes
DRIVE_FOLDER_FACTURAS = ID de la carpeta Drive para PDFs
ENV                  = development | production
```

---

## 8. Flujo de Trabajo Git

### Ramas
```
main          → Código en producción (protegida)
develop       → Integración continua
feature/xxx   → Nuevas funcionalidades
fix/xxx       → Correcciones de bugs
hotfix/xxx    → Fixes urgentes en producción
```

### Flujo estándar
```bash
git checkout develop && git pull origin develop
git checkout -b feature/catalogo-sucursal

git add .
git commit -m "feat(catalogo): vista de catálogo por sucursal con QR y precios"

git push origin feature/catalogo-sucursal
# → Crear PR hacia develop

# Release
git checkout main && git merge develop
git tag -a v1.1.0 -m "Release v1.1.0 — Catálogo por sucursal + QR"
git push origin main --tags
```

### Convención de commits (Conventional Commits)
```
feat:     Nueva funcionalidad
fix:      Corrección de bug
docs:     Documentación
style:    Formato/espacios sin cambio lógico
refactor: Refactorización
test:     Pruebas
chore:    Tareas de mantenimiento
types:    Cambios en interfaces/tipos TypeScript
```

---

## 9. Pruebas

### Frontend (Vitest + Vue Test Utils)
```bash
npm run test:unit    # Pruebas unitarias
npm run test:e2e     # Pruebas e2e con Cypress (opcional)
```

Ejemplo de prueba de composable:
```typescript
// tests/unit/useCatalogo.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { useCatalogo } from 'src/composables/useCatalogo'

describe('useCatalogo', () => {
  it('filtra productos por búsqueda', async () => {
    const { productos, busqueda, productosFiltrados } = useCatalogo()
    productos.value = [
      { sku: 'A001', marca: 'Nike', nombre: 'Zapato', descripcion: 'Deportivo', precioOfrecido: 100, precioFinal: 80, stock: 5, imagenUrl: '', qrCode: '', stockBajo: false, id: '1' },
      { sku: 'B002', marca: 'Adidas', nombre: 'Camisa', descripcion: 'Casual', precioOfrecido: 50, precioFinal: 45, stock: 10, imagenUrl: '', qrCode: '', stockBajo: false, id: '2' }
    ]
    busqueda.value = 'nike'
    expect(productosFiltrados.value).toHaveLength(1)
    expect(productosFiltrados.value[0].marca).toBe('Nike')
  })
})
```

---

## 10. Consideraciones de Performance

### Google Sheets / Apps Script
- Leer siempre hojas completas con `getDataRange().getValues()`, nunca celda por celda.
- Usar `ScriptCache` para datos poco cambiantes (sucursales, categorías):
```javascript
function getCachedSucursales() {
  const cache = CacheService.getScriptCache()
  const cached = cache.get('sucursales')
  if (cached) return JSON.parse(cached)
  const data = Sheets.getAll('Sucursales').filter(s => s.activo)
  cache.put('sucursales', JSON.stringify(data), 300)
  return data
}
```
- Limitar hojas a **50,000 filas**. Archivar movimientos antiguos.
- Agrupar escrituras con `setValues()` en bloque.

### Frontend
- Paginación o virtualización en el catálogo con muchos productos.
- Lazy loading de imágenes (atributo `loading="lazy"` o `q-img` de Quasar).
- Cache del catálogo en Pinia con timestamp de expiración:
```typescript
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

const cataloStore = defineStore('catalo', () => {
  const cache = ref<Record<string, { data: ProductoCatalogo[], ts: number }>>({})

  async function getCatalogo(sucursalId: string) {
    const now = Date.now()
    if (cache.value[sucursalId] && now - cache.value[sucursalId].ts < CACHE_TTL) {
      return cache.value[sucursalId].data
    }
    const data = await cataloService.getBySucursal(sucursalId)
    cache.value[sucursalId] = { data, ts: now }
    return data
  }

  return { getCatalogo }
})
```

---

## 11. Seguridad

- **Nunca** exponer el `SPREADSHEET_ID` ni credenciales en el frontend.
- Validar `sucursal_id` en **cada request del backend**; no confiar solo en el frontend.
- Implementar tokens de sesión con expiración y campo `sucursalId` embebido.
- Sanitizar todos los inputs en GAS antes de escribir en Sheets.
- Registrar en `LogAcciones` todas las operaciones críticas (crear, editar, eliminar, transferir).
- Las imágenes en Drive deben ser accesibles solo con enlace; nunca públicas en modo indexable.

---

*Documento generado: 2026 — SGI v1.1*
