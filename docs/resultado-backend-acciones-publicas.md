# Resultado de Ejecución — Backend GAS: Acciones públicas sin token

## Resumen

Se modificó `backend/src/main.js` para que las acciones `getProductoBySku` y `getCategorias`
puedan ejecutarse **sin token de sesión**, permitiendo que la página pública
`/producto/:sku` (frontend) consulte el backend sin que el usuario esté autenticado.

El cambio es mínimo y quirúrgico: se introduce un array `ACCIONES_PUBLICAS` que actúa como
lista blanca; las acciones en esa lista omiten `Auth.verifyToken()`. El resto del
sistema funciona exactamente igual que antes.

Para `getProductoBySku` en modo público se usa un handler dedicado
`_getProductoBySkuPublico()` que aplica un filtro adicional de campos: excluye
`precioCompra` y no devuelve stock (dato que requiere sucursal y autenticación).

---

## Rama Git

- **Repositorio:** `sgi-inventario-gap`
- **Rama destino:** `dev` (deriva de `main`)
- **Commit sugerido:**
  ```
  feat(backend): acciones públicas sin token para página de detalle de producto
  ```

---

## Checklist

- [x] Array `ACCIONES_PUBLICAS` definido al inicio de `main.js`
- [x] Verificación de token omitida para acciones de la lista blanca (`esPublica`)
- [x] `session` se inicializa en `null` para acciones públicas (en lugar de fallar)
- [x] `getProductoBySku` enrutado a `_getProductoBySkuPublico()` (filtro de campos sensibles)
- [x] `_getProductoBySkuPublico()` verifica que el producto exista y esté **activo**
- [x] `_getProductoBySkuPublico()` excluye `precioCompra` y `stock` de la respuesta
- [x] `getCategorias` sigue usando `CategoriaService.getAll()` sin cambios (ya no recibía session)
- [x] Todas las demás acciones autenticadas no se ven afectadas
- [x] Flujo de `login` (sin token) no se ve afectado
- [x] Comentarios explicativos en el código

---

## Detalles de la Implementación

### Flujo antes del cambio

```
doPost(e)
  │
  ├── action === 'login'  → Auth.login()
  │
  └── cualquier otra acción
        │
        ▼
        Auth.verifyToken(token)   ← lanza Error si token es null/vacío
        │
        ▼
        routes[action]()
```

### Flujo después del cambio

```
doPost(e)
  │
  ├── action === 'login'         → Auth.login()
  │
  ├── ACCIONES_PUBLICAS.includes(action)
  │     │
  │     └── session = null       ← sin verificación de token
  │
  └── resto de acciones
        │
        ▼
        Auth.verifyToken(token)   ← lanza Error si token es null/vacío
        │
        ▼
        routes[action]()
```

### Lista blanca de acciones públicas

```javascript
var ACCIONES_PUBLICAS = [
  'getProductoBySku',   // Detalle público de producto (página QR enlace)
  'getCategorias',      // Listado de categorías (nombres para mostrar en detalle)
]
```

Para **añadir nuevas acciones públicas** en el futuro, basta con agregar el nombre
de la acción a este array. No se necesita modificar ningún otro bloque de código.

### Campos devueltos por `_getProductoBySkuPublico`

| Campo           | Incluido | Motivo                                  |
|-----------------|----------|-----------------------------------------|
| `id`            | ✅        | Necesario para referencias              |
| `sku`           | ✅        | Identificador público                   |
| `marcaId`       | ✅        | Para resolución de nombre en frontend   |
| `marca`         | ✅        | Nombre público                          |
| `nombre`        | ✅        | Nombre público                          |
| `descripcion`   | ✅        | Descripción pública                     |
| `categoriaId`   | ✅        | Para resolución de nombre               |
| `unidad`        | ✅        | Dato público                            |
| `precioOfrecido`| ✅        | Precio de catálogo (público)            |
| `precioFinal`   | ✅        | Precio de venta (público)               |
| `stockMinimo`   | ✅        | Requerido por `ProductoCatalogo` en TS  |
| `imagenUrl`     | ✅        | Para mostrar la imagen del producto     |
| `imagenLocation`| ✅        | Para resolver URL en frontend           |
| `qrCode`        | ✅        | Contenido del QR                        |
| `activo`        | ✅        | Para validar visibilidad                |
| `fechaCreacion` | ✅        | Metadato público                        |
| `precioCompra`  | ❌        | Dato interno de costos                  |
| `stock`         | ❌        | Requiere sucursal + autenticación       |

---

## Archivos Creados

_Ninguno._

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/main.js` | Array `ACCIONES_PUBLICAS`, lógica condicional de token, handler `_getProductoBySkuPublico()` |

---

## Pruebas de Test

### Prueba 1 — Consulta pública exitosa (sin token)

Con Postman o cURL:

```bash
curl -X POST "https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec" \
  -H "Content-Type: text/plain" \
  -d '{"action":"getProductoBySku","payload":{"sku":"TU-SKU-REAL"}}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "OK",
  "result": {
    "id": "...",
    "sku": "TU-SKU-REAL",
    "marca": "MARCA",
    "nombre": "Nombre del producto",
    "precioFinal": 150,
    "precioOfrecido": 160,
    ...
  }
}
```

Verificar que **no** aparecen los campos `precioCompra` ni `stock`.

### Prueba 2 — SKU inexistente

```bash
curl -X POST "..." \
  -d '{"action":"getProductoBySku","payload":{"sku":"NO-EXISTE-999"}}'
```

**Resultado esperado:** `{ "success": false, "message": "Producto no encontrado con SKU: NO-EXISTE-999" }`

### Prueba 3 — Producto inactivo

Marcar un producto como `activo = false` y consultar su SKU.

**Resultado esperado:** `{ "success": false, "message": "Producto no encontrado con SKU: SKU-INACTIVO" }`
_(el producto inactivo no se expone públicamente)_

### Prueba 4 — Acción protegida sigue requiriendo token

```bash
curl -X POST "..." \
  -d '{"action":"getProductos","payload":{}}'
```

**Resultado esperado:** `{ "success": false, "message": "Token requerido" }` (o similar 401)

### Prueba 5 — getCategorias sin token

```bash
curl -X POST "..." \
  -d '{"action":"getCategorias","payload":{}}'
```

**Resultado esperado:** Array de categorías activas.

### Prueba 6 — Página pública completa (integración frontend + backend)

1. Configurar `VITE_QR_MODE=enlace` en `.env.local`
2. Levantar `quasar dev`
3. Navegar a `http://localhost:9000/producto/TU-SKU-REAL` **sin sesión activa**
4. Verificar que la página carga correctamente con imagen, nombre, precios y QR
5. Verificar que no hay errores 401 en la consola del navegador

---

## Notas de Ejecución

- El cambio en `main.js` requiere **nueva implementación en GAS** (`clasp push` +
  nueva versión en el editor de Apps Script). La URL del endpoint no cambia si se
  usa "actualizar" sobre la misma implementación.
- `ACCIONES_PUBLICAS` usa `var` (en lugar de `const`) para máxima compatibilidad con
  el motor V8 de Apps Script, que a veces tiene restricciones con `const` en el scope
  global entre archivos `.gs`.
- Si el proyecto GAS usa múltiples archivos `.gs`, asegurarse de que `main.gs` se
  cargue después de todos los servicios (el orden de archivos en clasp es alfabético
  por defecto; si es necesario, renombrar el archivo para que quede al final).

---

## Problemas

- **Ninguno identificado.**
- Si en el futuro se necesita que `getProductoBySku` devuelva stock para usuarios
  autenticados, se puede detectar el token en el handler y bifurcar la respuesta:
  si hay token válido → respuesta completa; si no hay token → respuesta pública.

---

## Recomendaciones

1. **Mantener la lista blanca corta:** Solo agregar a `ACCIONES_PUBLICAS` acciones que
   genuinamente no requieran autenticación. Cualquier dato sensible (stock, precios de
   compra, clientes, movimientos) debe mantenerse en acciones protegidas.

2. **Deploy en GAS:** Después de `clasp push`, crear una **nueva versión** en el editor
   GAS para que la URL de producción apunte al código actualizado:
   ```
   GAS Editor → Implementar → Administrar implementaciones → Nueva versión
   ```

3. **Rate limiting opcional:** Si la página pública recibe tráfico elevado, considerar
   usar `ScriptCache` en `_getProductoBySkuPublico` para cachear la respuesta por SKU
   durante 5-10 minutos y evitar lecturas repetidas a Sheets.

---

## Cómo y Qué Implementar a Continuación

### Deploy del backend actualizado

```bash
cd backend
clasp push
```

Luego en el editor GAS:
- **Implementar → Administrar implementaciones → editar la implementación activa → Nueva versión**
- Descripción: `v1.x — Acciones públicas sin token`

Si la URL de la Web App cambia (nueva implementación vs actualizar la existente),
actualizar `VITE_GAS_API_URL` en `.env.local` y `.env.production` y recompilar el frontend.

### Caché opcional en `_getProductoBySkuPublico`

Para reducir lecturas a Sheets en consultas públicas repetidas:

```javascript
function _getProductoBySkuPublico(payload) {
  if (!payload || !payload.sku) throw new Error('SKU requerido')

  const cacheKey = 'pub_producto_' + String(payload.sku).toUpperCase()
  const cache = CacheService.getScriptCache()
  const cached = cache.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const producto = ProductoService.getBySku(payload)
  if (!producto.activo) throw new Error('Producto no encontrado con SKU: ' + payload.sku)

  const publico = {
    id: producto.id, sku: producto.sku, marcaId: producto.marcaId,
    marca: producto.marca, nombre: producto.nombre, descripcion: producto.descripcion,
    categoriaId: producto.categoriaId, unidad: producto.unidad,
    precioOfrecido: producto.precioOfrecido, precioFinal: producto.precioFinal,
    stockMinimo: producto.stockMinimo, imagenUrl: producto.imagenUrl,
    imagenLocation: producto.imagenLocation, qrCode: producto.qrCode,
    activo: producto.activo, fechaCreacion: producto.fechaCreacion,
  }

  cache.put(cacheKey, JSON.stringify(publico), 600) // 10 minutos
  return publico
}
```

_Nota:_ Si se actualiza un producto, se debe invalidar la caché correspondiente en
`ProductoService.update()`:
```javascript
CacheService.getScriptCache().remove('pub_producto_' + sku)
```

---

_Generado: 2026-05-28 — SGI v1.4.3 — Rama: dev_
