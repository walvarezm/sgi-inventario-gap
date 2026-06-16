# Fix: Warning "app instance already mounted" al renderizar imágenes

## Resumen

Corrección de dos bugs en `ProductoImagenIFrame.vue` que causaban el warning de Vue
`There is already an app instance mounted on the host container` al mostrar imágenes
de productos, además de limpieza del código de debug que quedó activo en producción.

## Rama Git

`dev`

## Checklist

- [x] `imagenUrl` convertida de `const` simple a `computed` (reactiva)
- [x] Bloque de debug `v-if="true"` con logs de props eliminado
- [x] `v-if` / `v-else` en el fallback de imagen corregido (eliminado `v-if` duplicado)
- [x] Computeds intermedios muertos (`widthComputed`, `heightComputed`, `width`, `height`,
      `widthError`, `heightError`, `styleImg`) eliminados
- [x] Computeds consolidados: `widthPx`, `heightPx`, `maxWidthImg`, `maxHeightImg`,
      `imgStyle`, `sizeStyleError`
- [x] JSDoc explicando por qué `imagenUrl` DEBE ser `computed`
- [x] Documento de resultados generado

## Detalles

### Causa raíz del warning

El warning de Vue `There is already an app instance mounted` ocurre cuando Vue detecta
que un componente intenta actualizarse sobre un nodo DOM que ya está siendo controlado
por otra instancia del árbol reactivo. En este caso la causa era una combinación de:

**Bug 1 — `imagenUrl` no reactiva (causa principal)**

```typescript
// ❌ ANTES: const simple, evaluada UNA VEZ al crear el componente
const imagenUrl =
  props.imagenLocation === 'local'
    ? URL_BASE_LOCAL + props.imagenUrl + '.jpg'
    : props.imagenLocation === 'drive'
      ? drivePreviewUrl(props.imagenUrl)
      : null
```

Al ser una `const` simple (no `ref` ni `computed`), su valor se fija en el
momento de creación del componente. Cuando Vue intenta re-renderizar el componente
con nuevas props (ej: al abrir un dialog con otra imagen, o en HMR de Vite), detecta
que el valor de `imagenUrl` en el template ya no corresponde al estado del sistema
reactivo, generando inconsistencias que se manifiestan como el warning de double-mount.

```typescript
// ✅ DESPUÉS: computed reactivo
const imagenUrl = computed(() => {
  if (!props.imagenUrl) return null
  if (props.imagenLocation === 'local') return URL_BASE_LOCAL + props.imagenUrl + '.jpg'
  if (props.imagenLocation === 'drive') return drivePreviewUrl(props.imagenUrl)
  return null
})
```

**Bug 2 — Bloque de debug activo en producción**

```html
<!-- ❌ ANTES: bloque de debug con v-if="true" siempre visible -->
<div v-if="true">
  type: {{ props.type }}
  props: {{ props.width }} - {{ props.height }}
  imagenUrl: {{ props.imagenUrl }} - {{ imagenUrl }}
  ...
</div>
```

Este bloque causaba evaluaciones adicionales del template en momentos inesperados,
amplificando las inconsistencias de reactividad.

**Bug 3 — `v-if` duplicado en el fallback**

```html
<!-- ❌ ANTES: dos condiciones podían ser true simultáneamente -->
<q-img v-if="(location === 'drive' || ...) && props.imagenUrl" ... />
<div v-if="!props.imagenUrl || !imagenUrl" ...>Sin imagen</div>

<!-- ✅ DESPUÉS: v-if / v-else mutuamente excluyentes -->
<q-img v-if="imagenUrl && ..." ... />
<div v-else ...>Sin imagen</div>
```

Tener dos condiciones `v-if` independientes que podían evaluarse simultáneamente
(ej: cuando `imagenUrl` computed era `null` pero `props.imagenUrl` tenía valor)
generaba dos nodos en el DOM para el mismo slot visual.

### Computeds eliminados (código muerto)

| Computed eliminado | Motivo |
|---|---|
| `widthComputed` | `props.type === 'table' ? props.width : props.width` — siempre `props.width` |
| `heightComputed` | Ídem — siempre `props.height` |
| `width` | Alias de `widthError` sin uso diferenciado real |
| `height` | Alias de `heightError` sin uso diferenciado real |
| `widthError` | Renombrado a `widthPx` con lógica equivalente simplificada |
| `heightError` | Renombrado a `heightPx` |
| `styleImg` | `const` simple nunca usada en el template |

### Computeds resultantes (limpios)

| Computed | Descripción |
|---|---|
| `imagenUrl` | URL efectiva reactiva (computed) |
| `widthPx` | Ancho del placeholder de error según tipo |
| `heightPx` | Alto del placeholder de error según tipo |
| `maxWidthImg` | Ancho máximo del `q-img` según tipo |
| `maxHeightImg` | Alto máximo del `q-img` según tipo |
| `imgStyle` | String de estilo del `q-img` (derivado de los dos anteriores) |
| `sizeStyleError` | String de estilo del div de error/placeholder |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/components/productos/ProductoImagenIFrame.vue` | Refactorizado completo |
| `docs/resultados/2026-06-14_fix-imagen-double-mount.md` | Este documento |

## Pruebas de Test

### 1. Warning eliminado
Abrir la consola del navegador y navegar a cualquier página que muestre imágenes
de productos (Catálogo, Inventario, Productos). No debe aparecer el warning
`There is already an app instance mounted`.

### 2. Imagen de Drive renderiza correctamente
- Producto con `imagenLocation = 'drive'`: la imagen debe cargar desde la URL de Drive.
- Cambiar a otro producto en la misma vista: la imagen debe actualizarse reactivamente.

### 3. Imagen local renderiza correctamente
- Producto con `imagenLocation = 'local'`: la imagen debe cargar desde `images/products/`.

### 4. Fallback sin imagen
- Producto sin imagen (`imagenUrl = ''`): debe mostrar el placeholder gris con
  ícono `broken_image` y tooltip "Producto Sin imagen".
- Solo UNO de los dos bloques (`q-img` o `div` fallback) debe estar presente en
  el DOM en cada caso.

### 5. Error de carga de imagen
- Imagen con URL inválida: debe mostrarse el slot `#error` con "Sin imagen"
  y tooltip "Error al cargar imagen" (diferente al placeholder de sin-url).

### 6. Dialog `ProductoViewImage` (type='view')
- Abrir el dialog de vista de imagen desde el listado de productos.
- La imagen debe renderizar sin warnings y con dimensiones correctas para `type='view'`.

### 7. Modo tabla (type='table') y tarjeta (type='card')
- Verificar que las dimensiones son coherentes en la tabla de inventario y en
  las tarjetas del catálogo.

### 8. HMR (Hot Module Replacement) en desarrollo
- Editar cualquier componente padre mientras la página está abierta.
- No debe aparecer el warning de double-mount al recargar el módulo.

## Notas de Ejecución

1. El fix es solo de frontend — no requiere cambios en GAS ni `clasp push`.
2. El servidor de desarrollo (`quasar dev`) recargará el componente automáticamente
   al guardar el archivo.
3. Si el warning persiste tras el fix, limpiar la caché del navegador con
   `Ctrl+Shift+R` (hard reload) para descartar versiones en caché del bundle.

## Problemas Conocidos

Ninguno posterior al fix.

## Recomendaciones

1. **Regla de equipo:** en componentes Vue, todas las derivaciones de props que se
   usen en el template DEBEN ser `computed`. Una `const` que lee `props.x` no es
   reactiva y solo funciona al crear el componente.

2. **Quitar código de debug antes de commit:** revisar que no haya `v-if="true"`,
   `console.log` activos ni bloques de debug en los componentes antes de pushear.

3. Si en el futuro se necesita debug temporal de props en un componente, usar
   las Vue DevTools del navegador en lugar de interpolaciones en el template.

## Cómo Implementar

```bash
git add frontend/src/components/productos/ProductoImagenIFrame.vue \
        docs/resultados/2026-06-14_fix-imagen-double-mount.md

git commit -m "fix(imagen): corregir warning double-mount convirtiendo imagenUrl a computed y limpiando debug"
git push origin dev
```
