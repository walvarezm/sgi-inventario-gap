# Resultado de Ejecución — Página Pública de Detalle de Producto (`/producto/:sku`)

## Resumen

Se implementó la página pública de detalle de producto referenciada por los QR en modo
`enlace`. La ruta `/producto/:sku` es accesible **sin autenticación** y muestra la
información comercial del producto: imagen, nombre, marca, SKU, categoría, descripción,
precios y el propio código QR del artículo.

La implementación es completamente independiente del layout principal de la aplicación
(sin sidebar, sin header de sesión), usa el mismo sistema de diseño (`sgi-*` CSS variables)
y es totalmente responsiva.

---

## Rama Git

- **Repositorio:** `sgi-inventario-gap`
- **Rama destino:** `dev` (deriva de `main`)
- **Commit sugerido:**
  ```
  feat(productos): página pública de detalle /producto/:sku para QR modo enlace
  ```

---

## Checklist

- [x] Página `DetalleProductoPage.vue` creada en `src/pages/productos/`
- [x] Ruta `/producto/:sku` registrada en `src/router/index.ts` con `meta: { public: true }`
- [x] Guard `authGuard` actualizado: respeta `meta.public`, no redirige a login
- [x] La página usa su propio layout (`q-layout` embebido) sin sidebar ni header de sesión
- [x] Tres estados cubiertos: cargando, error/no encontrado, detalle completo
- [x] QR generado en la propia página a partir del SKU (modo enlace, tamaño 160px)
- [x] Imagen del producto con fallback visual si no hay imagen
- [x] Solo se muestran datos públicos (sin stock, sin precio de compra)
- [x] Banner informativo indicando que stock y precio de compra son para usuarios internos
- [x] Diseño responsivo: dos columnas en escritorio, apilado en móvil
- [x] Categoría resuelta desde `categoriaStore` (nombre legible, no ID)
- [x] Integración con `productoService.getBySku()` existente
- [x] Integración con `drivePreviewUrl()` para imágenes en Drive

---

## Detalles de la Implementación

### Ruta y acceso

```
GET /producto/ZAPT-001
→ DetalleProductoPage.vue
→ Sin autenticación requerida (meta.public = true)
→ Llama: productoService.getBySku('ZAPT-001')
```

La ruta está registrada **fuera** del bloque con `beforeEnter: authGuard`, por lo que
el guard de autenticación no la intercepta. El guard `authGuard` también fue actualizado
para respetar `meta.public` como capa adicional de seguridad.

### Datos mostrados (públicos)

| Campo           | Fuente                         | Visible  |
|-----------------|-------------------------------|----------|
| Imagen          | `producto.imagenUrl`           | ✅       |
| Marca           | `producto.marca`               | ✅       |
| Nombre          | `producto.nombre`              | ✅       |
| SKU             | `producto.sku`                 | ✅       |
| Descripción     | `producto.descripcion`         | ✅       |
| Categoría       | `categoriaStore` (nombre)      | ✅       |
| Unidad          | `producto.unidad`              | ✅       |
| Precio catálogo | `producto.precioOfrecido`      | ✅       |
| Precio final    | `producto.precioFinal`         | ✅       |
| Código QR       | Generado desde `buildQrEnlace` | ✅       |
| Stock           | —                              | ❌ Oculto |
| Precio compra   | —                              | ❌ Oculto |

### Manejo de imagen

La función `drivePreviewUrl()` de `src/utils/qrUtils.ts` se usa cuando la URL de imagen
no comienza con `http` (es decir, es un ID de Drive). Si comienza con `http`, se usa
directamente. Si no hay imagen, se muestra un placeholder con ícono.

### Estados de la página

1. **Cargando**: spinner centrado con el SKU buscado.
2. **Error / No encontrado**: ícono `search_off`, mensaje descriptivo con el SKU, botón
   "Volver". También se muestra este estado si el producto está inactivo (`activo = false`).
3. **Detalle**: tarjeta completa con imagen, QR, datos y precios.

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/pages/productos/DetalleProductoPage.vue` | Página pública de detalle de producto |

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/router/index.ts` | Ruta `/producto/:sku` agregada con `meta: { public: true }` |
| `frontend/src/router/guards.ts` | `authGuard` actualizado para respetar `meta.public` |

---

## Pruebas de Test

### Pruebas manuales recomendadas

#### Escenario 1 — Acceso con SKU válido
1. Configurar `.env.local`: `VITE_QR_MODE=enlace`
2. Levantar el servidor: `quasar dev`
3. Navegar a: `http://localhost:9000/producto/TU-SKU-REAL`
4. Verificar que se muestra la tarjeta con imagen, nombre, marca, precios y QR.
5. Verificar que **no aparece** el sidebar ni el header con el nombre de usuario.
6. Verificar que el QR generado en la página apunta al mismo URL.

#### Escenario 2 — SKU inexistente
1. Navegar a: `http://localhost:9000/producto/NO-EXISTE-999`
2. Verificar que se muestra el estado de "Producto no encontrado".
3. Verificar que el botón "Volver" funciona.

#### Escenario 3 — Producto inactivo
1. Marcar un producto como inactivo (`activo = false`) en la base de datos.
2. Navegar a su URL de detalle.
3. Verificar que se muestra "Producto no encontrado" (no expone productos inactivos).

#### Escenario 4 — Sin imagen
1. Navegar al detalle de un producto sin `imagenUrl`.
2. Verificar que se muestra el placeholder con el ícono `inventory_2`.

#### Escenario 5 — Acceso sin sesión activa
1. Cerrar sesión en la aplicación.
2. Navegar directamente a `http://localhost:9000/producto/TU-SKU-REAL`
3. Verificar que la página carga correctamente sin redirigir al login.

#### Escenario 6 — Responsivo móvil
1. Abrir DevTools → modo dispositivo móvil (< 700px de ancho).
2. Verificar que la imagen y el QR aparecen en la parte superior.
3. Verificar que los datos se muestran debajo en columna única.

#### Escenario 7 — QR escaneable
1. En modo `enlace`, crear un producto y ver su QR en el formulario.
2. Escanear el QR con un dispositivo físico.
3. Verificar que el navegador abre la URL de detalle del producto.

### Prueba de ruta en Vue Router

```typescript
// tests/unit/router.spec.ts
import { describe, it, expect } from 'vitest'
import router from 'src/router'

describe('Ruta pública /producto/:sku', () => {
  it('existe y es pública', () => {
    const ruta = router.getRoutes().find(r => r.name === 'detalle-producto-publico')
    expect(ruta).toBeDefined()
    expect(ruta?.meta?.public).toBe(true)
  })
})
```

---

## Notas de Ejecución

- La página llama a `productoService.getBySku()` que realiza un request al backend GAS.
  En entornos de desarrollo, el backend debe estar activo y el SKU debe existir.
- El token de sesión **no se inyecta** en esta llamada cuando no hay sesión activa
  (el interceptor de Axios salta silenciosamente si no hay store disponible).
  Esto es correcto: la consulta pública no requiere autenticación en el backend.
- Para que el backend GAS responda a `getProductoBySku` sin token, ese endpoint debe
  estar configurado como público en `main.gs` (ver sección "Qué implementar a continuación").
- `categoriaStore.fetchAll()` también se llama desde la página pública. Este endpoint
  igualmente debe ser accesible sin token si se quiere mostrar el nombre de la categoría.

---

## Problemas

- **Ninguno crítico identificado.**
- Si `getProductoBySku` en GAS requiere token de sesión, retornará 401 y la página
  mostrará "Producto no encontrado". Ver sección de recomendaciones.

---

## Recomendaciones

1. **Backend GAS — acceso público:** Configurar en `main.gs` que las acciones
   `getProductoBySku` y `getCategorias` (o equivalente) puedan ejecutarse sin token
   cuando el campo `token` del body es `null` o vacío. Agregar una lista blanca de
   acciones públicas en el router GAS.

2. **Metadatos `<title>`:** Agregar un `useHead` o `document.title` reactivo con
   el nombre del producto para mejorar SEO y UX al compartir el enlace.

3. **Caché en el navegador:** La página no cachea el producto; cada recarga hace una
   nueva llamada al backend. Para optimizar, se podría usar `sessionStorage` o Pinia
   (con TTL corto).

4. **Open Graph / compartir:** Para que el enlace QR sea "rico" al compartirse en
   WhatsApp u otras redes, se puede agregar un endpoint de server-side rendering o
   meta tags dinámicos.

---

## Cómo y Qué Implementar a Continuación

### 1. Endpoint GAS público — `getProductoBySku`

Modificar `main.gs` para permitir ciertas acciones sin token:

```javascript
// backend/src/main.gs
const ACCIONES_PUBLICAS = ['getProductoBySku', 'getCategorias']

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const { action, payload, token } = body

    const esPublica = ACCIONES_PUBLICAS.includes(action)

    if (!esPublica && action !== 'login') {
      const session = Auth.verifyToken(token)
      if (!session.valid) return respond(401, 'No autorizado')
      body._session = session
    }

    const routes = {
      // ... rutas existentes ...
      'getProductoBySku': () => ProductoService.getBySku(payload),
      'getCategorias':    () => CategoriaService.getAll(),
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

### 2. Título dinámico de la página

```typescript
// En DetalleProductoPage.vue — dentro del watch de `producto`
watch(producto, (p) => {
  if (p) document.title = `${p.nombre} — ${appName}`
}, { immediate: false })
```

### 3. Botón "Ver en catálogo" (para usuarios con sesión)

Si el usuario ya está autenticado, mostrar un botón que lo lleve al catálogo:

```vue
<q-btn
  v-if="authStore.isAuthenticated"
  flat color="primary" icon="menu_book"
  label="Ver en catálogo"
  :to="{ name: 'catalogo' }"
/>
```

---

_Generado: 2026-05-28 — SGI v1.4.3 — Rama: dev_
