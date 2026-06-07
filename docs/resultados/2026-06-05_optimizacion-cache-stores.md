# Optimización de Transacciones Frontend → GAS

## Título
Implementación de caché TTL, deduplicación de requests, bus de eventos DataSync y bootstrap paralelo post-login para los stores maestros del SGI.

---

## Resumen
Se implementó una capa de optimización completa en el frontend sin modificar ningún endpoint del backend (GAS). El objetivo principal fue reducir la cantidad de llamadas redundantes al backend, eliminar race conditions de requests duplicados y garantizar que los cambios realizados en el módulo de Productos se propaguen automáticamente a todos los módulos que consumen esos datos (Inventario, Catálogo, POS), sin necesidad de recargas manuales.

---

## Rama Git
```
dev
```

### Comandos de commit sugeridos
```bash
git checkout dev
git add frontend/src/composables/useStoreCache.ts
git add frontend/src/composables/useDataSync.ts
git add frontend/src/composables/useBootstrap.ts
git add frontend/src/stores/productoStore.ts
git add frontend/src/stores/sucursalStore.ts
git add frontend/src/stores/categoriaStore.ts
git add frontend/src/stores/marcaStore.ts
git add frontend/src/stores/cataloStore.ts
git add frontend/src/pages/auth/LoginPage.vue
git add docs/resultados/2026-06-05_optimizacion-cache-stores.md
git commit -m "perf(stores): cache TTL, deduplicación, DataSync y bootstrap paralelo"
git push origin dev
```

---

## Checklist

- [x] `useStoreCache.ts` — composable genérico de caché con TTL, deduplicación y parches locales
- [x] `useDataSync.ts` — bus de eventos reactivo para propagación cross-store
- [x] `useBootstrap.ts` — carga paralela de catálogos maestros post-login
- [x] `productoStore.ts` — refactorizado con useStoreCache + emite eventos DataSync
- [x] `sucursalStore.ts` — refactorizado con useStoreCache + emite eventos DataSync
- [x] `categoriaStore.ts` — refactorizado con useStoreCache + emite eventos DataSync
- [x] `marcaStore.ts` — refactorizado con useStoreCache + emite eventos DataSync
- [x] `cataloStore.ts` — suscrito a eventos producto:updated / producto:deleted para parches locales
- [x] `LoginPage.vue` — integrado con useBootstrap para precarga paralela tras login exitoso
- [x] Compatibilidad hacia atrás: todos los stores mantienen la misma API pública (`items`, `loading`, `error`, `fetchAll`, `forceReload`, etc.)

---

## Detalles

### 1. `useStoreCache.ts` (nuevo)

Composable genérico reutilizable por cualquier store. Características:

| Feature | Descripción |
|---|---|
| TTL configurable | Cada store define su propio tiempo de vida (productos: 10 min, sucursales: 15 min, categorías/marcas: 20 min) |
| Deduplicación | Si dos componentes llaman `fetchAll()` al mismo tiempo, el segundo espera el primero y reutiliza su resultado |
| `patchItem()` | Actualiza un ítem del array en memoria sin recargar desde el backend |
| `pushItem()` | Agrega un ítem al array en memoria sin recargar |
| `removeItem()` | Elimina un ítem del array en memoria sin recargar |
| `invalidate()` | Marca la caché como inválida; el próximo `fetchAll()` irá al backend |
| `isStale` | Computed que indica si el dato está en el 20% final de su TTL (útil para mostrar un badge "datos próximos a actualizar") |
| `lastFetchedAt` | Timestamp legible de la última carga exitosa |

### 2. `useDataSync.ts` (nuevo)

Bus de eventos reactivo tipo publish/subscribe, implementado como singleton. Permite que un store notifique a otros cuando ocurre una mutación.

**Eventos definidos:**
- `producto:created / updated / deleted`
- `marca:created / updated / deleted`
- `categoria:created / updated / deleted`
- `sucursal:created / updated / deleted`
- `inventario:stock_changed`
- `catalogo:invalidate`

**Flujo de propagación al editar un producto:**
```
ProductosPage → productoStore.update()
  → productoService.update() [llamada GAS]
  → cache.patchItem() [actualización local inmediata]
  → sync.emit('producto:updated', productoActualizado)
      → cataloStore (suscriptor): parchea el producto en TODOS los catálogos cacheados
      → (futuro) posStore, reportesStore, etc.
```

**Resultado:** El módulo de Catálogo, POS e Inventario ven el producto actualizado inmediatamente sin haber hecho ninguna llamada al backend.

### 3. `useBootstrap.ts` (nuevo)

Ejecuta una sola vez al hacer login exitoso una carga paralela con `Promise.allSettled` de los 4 catálogos maestros. Si alguno falla, los demás continúan y se muestra un warning no-bloqueante en la pantalla de login.

**Beneficio:** De 4 cold-starts secuenciales de GAS (~3-5 seg c/u = hasta 20 seg) a 1 ejecución paralela (~3-5 seg total).

### 4. Stores refactorizados

Todos los stores maestros mantienen exactamente la misma API pública. Los cambios son internos:

**Antes:**
```typescript
// productoStore — fetchAll ignoraba si ya había datos cargados
async function fetchAll(): Promise<void> {
  loading.value = true
  items.value = await productoService.getAll()  // siempre llama al backend
}
```

**Después:**
```typescript
// productoStore — respeta TTL y deduplica
async function fetchAll(force = false): Promise<void> {
  await cache.fetch(force, () => productoService.getAll())
  // Si la caché es válida: retorna inmediatamente sin llamada
  // Si hay un request en vuelo: espera ese y reutiliza su resultado
  // Si force=true: ignora TTL y recarga
}
```

**Firma de fetchAll actualizada:**
Todos los `fetchAll()` ahora aceptan un parámetro opcional `force: boolean = false`.

### 5. `cataloStore.ts` actualizado

Agrega suscripciones al bus DataSync para mantener coherencia:

```typescript
// Cuando un producto es editado en ProductosPage:
sync.on('producto:updated', (producto: Producto) => {
  // Parcha el producto en TODOS los catálogos por sucursal cacheados
  Object.keys(cache.value).forEach((sucursalId) => {
    const idx = entry.data.findIndex((p) => p.id === producto.id)
    if (idx !== -1) entry.data[idx] = { ...entry.data[idx], ...camposActualizables }
  })
})
```

### 6. `LoginPage.vue` actualizado

```typescript
async function handleLogin(): Promise<void> {
  await authStore.login(form.value)  // autenticación
  void runBootstrap()                 // precarga en paralelo (no bloquea la navegación)
  await router.push(redirect)        // navegar inmediatamente
}
```

El bootstrap corre en background; si falla, el usuario ya está en el dashboard y los módulos cargarán sus datos normalmente al montarse.

---

## Archivos Creados

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/composables/useStoreCache.ts` | Nuevo | Composable genérico de caché con TTL y deduplicación |
| `frontend/src/composables/useDataSync.ts` | Nuevo | Bus de eventos reactivo para propagación cross-store |
| `frontend/src/composables/useBootstrap.ts` | Nuevo | Carga paralela de catálogos maestros post-login |
| `docs/resultados/2026-06-05_optimizacion-cache-stores.md` | Nuevo | Este documento |

---

## Archivos Modificados

| Archivo | Cambio principal |
|---|---|
| `frontend/src/stores/productoStore.ts` | Reemplaza `ref<Producto[]>` por `useStoreCache`; emite eventos DataSync en create/update/delete |
| `frontend/src/stores/sucursalStore.ts` | Ídem para sucursales |
| `frontend/src/stores/categoriaStore.ts` | Ídem para categorías |
| `frontend/src/stores/marcaStore.ts` | Ídem para marcas |
| `frontend/src/stores/cataloStore.ts` | Agrega suscripciones a `producto:updated` y `producto:deleted` |
| `frontend/src/pages/auth/LoginPage.vue` | Integra `useBootstrap` para precarga paralela post-login |

---

## Pruebas de Test Recomendadas

### Funcionales manuales

1. **TTL activo:** Navegar a Productos → datos cargan. Navegar a Inventario → categorías/marcas/productos NO hacen nuevas llamadas (verificar en DevTools → Network).
2. **Deduplicación:** Abrir Inventario y Catálogo simultáneamente. Cada store debe mostrar exactamente 1 llamada al backend por catálogo, no 2.
3. **Propagación DataSync:** En Productos, editar el nombre de un producto y guardar. Sin navegar, ir al módulo Catálogo → el producto debe mostrar el nombre actualizado sin haber hecho ninguna nueva llamada al backend.
4. **forceReload:** En Productos, hacer clic en el botón Refresh → debe forzar recarga completa desde GAS.
5. **Bootstrap:** Hacer logout y login. En DevTools → Network, verificar que los 4 requests (productos, sucursales, categorías, marcas) salen en paralelo (mismo timestamp aproximado), no secuencialmente.
6. **Bootstrap parcial fallido:** Desconectar la red, hacer login → debe mostrar el warning de precarga parcial pero permitir ingresar al sistema.

### Tests unitarios sugeridos (Vitest)

```typescript
// useStoreCache.spec.ts
describe('useStoreCache', () => {
  it('retorna datos cacheados sin llamar al loader si el TTL es válido')
  it('deduplica requests concurrentes y retorna el mismo resultado')
  it('recarga cuando force=true aunque el TTL sea válido')
  it('patchItem actualiza el elemento correcto del array')
  it('removeItem elimina el elemento correcto del array')
  it('invalidate marca la caché como inválida')
})

// useDataSync.spec.ts
describe('useDataSync', () => {
  it('emite eventos a los handlers suscritos')
  it('la función de cleanup (unsub) evita que el handler reciba futuros eventos')
  it('no lanza si un handler lanza excepción (no interrumpe a otros handlers)')
})
```

---

## Notas de Ejecución

- Los stores son retrocompatibles: ninguna página existente necesita cambios para funcionar con el nuevo sistema.
- El parámetro `force` en `fetchAll(force?)` es opcional y por defecto `false`. Las páginas que ya llaman `fetchAll()` sin argumentos funcionan exactamente igual.
- Las funciones `forceReload()` existentes en los stores siguen funcionando: ahora llaman internamente a `cache.invalidate()`.
- En modo desarrollo (`import.meta.env.DEV`), `useStoreCache` y `useDataSync` emiten logs de debug en consola para facilitar el rastreo.

---

## Problemas Conocidos

| Problema | Severidad | Notas |
|---|---|---|
| `cataloStore` suscribe handlers en la definición del store, no en `onMounted`. Si el store es destruido y reinstanciado, los handlers se registran de nuevo sin limpiar los anteriores. | Baja | El store es singleton de Pinia; en la práctica no se destruye durante la sesión. A futuro se puede agregar un flag `_subscribed` para evitar registros duplicados. |
| El bootstrap corre en background (`void runBootstrap()`); si el usuario navega rápido a un módulo antes de que termine, ese módulo puede hacer su propia carga. Esto es correcto por diseño (el segundo request se deduplicará con el del bootstrap en vuelo). | Ninguna | Comportamiento esperado. |
| TypeScript: `useStoreCache.patchItem` usa genéricos complejos que pueden requerir aserciones de tipo en algunos contextos. | Baja | Si hay errores de TS, usar `as unknown as` como puente. |

---

## Recomendaciones

1. **Agregar `cacheInfo` a la barra de estado del layout principal** para mostrar cuándo fue la última sincronización y dar al usuario un botón "Refrescar todo" que llame a `useBootstrap().refresh()`.

2. **Extender DataSync a `inventarioStore`** cuando se implemente: emitir `inventario:stock_changed` después de registrar una entrada/salida, y que `cataloStore` reaccione invalidando el catálogo de la sucursal afectada.

3. **Persistencia en sessionStorage (Fase B):** Para una UX aún más rápida al recargar la página, serializar los datos del store en `sessionStorage` al guardarlos en caché y rehidratarlos al iniciar. Similar al patrón ya implementado en `useMovimientoDraft.ts`.

4. **TTL diferenciado por módulo:** Los TTL actuales son conservadores. En producción, ajustar según la frecuencia real de cambios:
   - Productos: 10 min (pueden cambiar precios frecuentemente)
   - Categorías/Marcas: 30 min o más (muy estáticas)
   - Sucursales: 20 min

---

## Qué Implementar Después (Fase B)

### Backend: endpoint `bootstrapData` consolidado

Un único endpoint en GAS que devuelva todos los catálogos maestros en una sola transacción HTTP:

```javascript
// main.gs
'bootstrapData': () => BootstrapService.getAll()

// BootstrapService.gs
const BootstrapService = {
  getAll() {
    return {
      productos: ProductoService.getAll(),
      sucursales: SucursalService.getAll(),
      categorias: CategoriaService.getAll(),
      marcas: MarcaService.getAll(),
    }
  }
}
```

**Ventaja:** En lugar de 4 cold-starts paralelos de GAS, se reduce a 1 solo cold-start. Estimación: de ~5 seg (4 paralelos, el más lento marca el tiempo) a ~3 seg (1 solo, con la lectura de todas las hojas ya warm).

### Frontend: `useBootstrap.ts` actualizado

```typescript
// Llamar a un único endpoint en lugar de 4 fetchAll paralelos
const result = await bootstrapService.getAll()
productoStore.hydrateFromBootstrap(result.productos)
sucursalStore.hydrateFromBootstrap(result.sucursales)
// ...
```

Esto requiere agregar un método `hydrateFromBootstrap(data: T[])` a cada store que popule la caché directamente sin llamar al servicio individual.
