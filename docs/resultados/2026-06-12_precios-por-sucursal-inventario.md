# Precios por Sucursal en Inventario

## Resumen

Implementación completa del modelo de precios por sucursal en el inventario SGI.
Los precios (`precio_ofrecido`, `precio_final`) ya no dependen exclusivamente del
producto base: cada fila de la hoja `Inventario` tiene sus propios precios, con
soporte para modo **precio base** (sincronizado automáticamente) y modo **precio
independiente** (definido por sucursal). Se agrega `fecha_precio` para auditoría
y `fecha_actualizacion` mantiene su rol de timestamp de fila.

## Rama Git

`dev`

## Checklist

### Fase A — Schema
- [x] `ensureInventarioSchema()` en `setup.js` — agrega 4 columnas nuevas
- [x] `ensureInventarioSchema` integrada en `seedDatosIniciales()`

### Fase B — InventarioService
- [x] `_resolverPrecios(item, prod)` — helper central de resolución de precios
- [x] `_ajustarStock` extendida con parámetro opcional `precios`
- [x] `getStockPorSucursal` — incluye precios resueltos + `fechaPrecio`
- [x] `getStockProducto` — incluye precios resueltos + `fechaPrecio`
- [x] `updatePreciosSucursal` — endpoint público para editar precios por sucursal
- [x] `sincronizarPreciosBase` — propaga precios base a filas con `precio_usa_base = TRUE`

### Fase C — Servicios dependientes
- [x] `MovimientoService._syncProductPrices` — refactorizado: ya no escribe al producto base
- [x] `ProductoService.update` — llama `sincronizarPreciosBase` cuando cambian precios
- [x] `CatalogoService.getBySucursal` — resuelve precios desde inventario vía `_resolverPrecios`
- [x] `AccessService.LEGACY_ROLE_PERMISSIONS` — agrega `inventario.editar_precios` a SUPERVISOR
- [x] `main.js` — registra `updatePreciosSucursal`

### Fase D — Frontend (tipos)
- [x] `InventarioItem` — agrega `precioOfrecido`, `precioFinal`, `precioUsaBase`, `fechaPrecio`
- [x] `ProductoCatalogo` — agrega `precioUsaBase`, `fechaPrecio`
- [x] `PreciosSucursalPayload` y `PreciosSucursalResult` — tipos para el nuevo endpoint

## Detalles

### Modelo de datos: hoja `Inventario` nueva

```
id | producto_id | sucursal_id | stock_actual
 | precio_ofrecido | precio_final | precio_usa_base
 | fecha_precio | fecha_actualizacion
```

| Campo | Tipo | Descripción |
|---|---|---|
| `precio_ofrecido` | número | Precio de catálogo vigente para esta sucursal |
| `precio_final` | número | Precio de venta vigente para esta sucursal |
| `precio_usa_base` | booleano | `TRUE` = sincroniza con producto base; `FALSE` = independiente |
| `fecha_precio` | ISO string | Cuándo se actualizaron los precios de esta fila |
| `fecha_actualizacion` | ISO string | Última modificación de la fila (stock o precio) |

### Lógica de resolución de precios (`_resolverPrecios`)

```
precio_usa_base = TRUE (o vacío/null/undefined)
  → devolver prod.precio_ofrecido, prod.precio_final

precio_usa_base = FALSE
  → devolver item.precio_ofrecido, item.precio_final
```

Las filas existentes (vacías en las nuevas columnas) se tratan como `precio_usa_base = TRUE`
por las condiciones `=== ''` y `=== undefined`, manteniendo retrocompatibilidad total.

### Flujo de sincronización al editar un producto base

```
ProductoService.update(payload)
  ↓ (si cambian precioOfrecido o precioFinal)
InventarioService.sincronizarPreciosBase(productoId, precioOfrecido, precioFinal)
  ↓
Sheets.getAll('Inventario')
  .filter(producto_id === productoId && precio_usa_base === TRUE)
  .forEach → Sheets.update(precio_ofrecido, precio_final, fecha_precio, fecha_actualizacion)
```

### Flujo de movimiento con precio distinto al base

```
MovimientoService.createMovimientoMasivo / createMovimientoUnitario
  ↓
_applyStockChanges → InventarioService._ajustarStock(productoId, sucursalId, delta, NO precios)
  [solo afecta stock_actual y fecha_actualizacion]
  ↓
_syncProductPrices (REFACTORIZADO)
  → Si el movimiento trae precio explícito:
      Compara con precio_ofrecido / precio_final del producto base
      Si son distintos → _ajustarStock(delta=0, { ..., precioUsaBase: false })
      Si son iguales  → _ajustarStock(delta=0, { ..., precioUsaBase: true  })
  → Ya NO escribe de vuelta al producto base
```

### Endpoint nuevo: `updatePreciosSucursal`

**Acción:** `updatePreciosSucursal`  
**Permiso:** `inventario.editar_precios` (ADMINISTRADOR y SUPERVISOR)

**Payload:**
```json
{
  "productoId": "uuid",
  "sucursalId": "uuid",
  "precioOfrecido": 150.00,
  "precioFinal": 135.00,
  "precioUsaBase": false
}
```

**Respuesta:**
```json
{
  "productoId": "uuid",
  "sucursalId": "uuid",
  "precioOfrecido": 150.00,
  "precioFinal": 135.00,
  "precioUsaBase": false,
  "fechaPrecio": "2026-06-12T10:30:00.000Z"
}
```

Si `precioUsaBase = true`, ignora los precios del payload y usa los del producto base.
Si la fila de inventario no existe aún, la crea con `stock_actual = 0`.

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `docs/resultados/2026-06-12_precios-por-sucursal-inventario.md` | Este documento |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `backend/src/setup.js` | `ensureInventarioSchema()` nueva; integrada en seed |
| `backend/src/services/InventarioService.js` | Reescrito completo con precios por sucursal |
| `backend/src/services/MovimientoService.js` | `_syncProductPrices` refactorizado |
| `backend/src/services/ProductoService.js` | `update` llama `sincronizarPreciosBase` |
| `backend/src/services/CatalogoService.js` | `getBySucursal` resuelve precios desde inventario |
| `backend/src/services/AccessService.js` | Agrega `inventario.editar_precios` a SUPERVISOR |
| `backend/src/main.js` | Registra `updatePreciosSucursal` |
| `frontend/src/types/inventario.types.ts` | Extiende `InventarioItem`; agrega payloads nuevos |
| `frontend/src/types/producto.types.ts` | Extiende `ProductoCatalogo` |

## Pruebas de Test

### 1. Ejecutar `ensureInventarioSchema` en GAS
- Editor GAS → Ejecutar → `ensureInventarioSchema`
- Verificar que la hoja `Inventario` tiene las 4 columnas nuevas al final.
- Filas existentes deben tener celdas vacías en las nuevas columnas (OK por diseño).

### 2. Movimiento de ENTRADA con precio igual al base
- Registrar entrada para un producto donde precioFinal = precioFinal del producto.
- Verificar en Sheets que `precio_usa_base = TRUE` en la fila de inventario.

### 3. Movimiento de ENTRADA con precio distinto al base
- Registrar entrada con precioFinal distinto al del producto.
- Verificar en Sheets que `precio_usa_base = FALSE` y los precios son los del movimiento.
- Verificar que el producto base NO cambió.

### 4. Editar precios del producto base
- Editar `precioFinal` del producto desde el módulo de Productos.
- Verificar que las filas de inventario con `precio_usa_base = TRUE` actualizaron sus precios.
- Verificar que las filas con `precio_usa_base = FALSE` no cambiaron.

### 5. `updatePreciosSucursal` con precio independiente
- Payload: `{ productoId, sucursalId, precioFinal: 999, precioUsaBase: false }`
- Verificar en Sheets que la fila queda con `precio_usa_base = FALSE` y `precio_final = 999`.
- Verificar `fecha_precio` actualizado.

### 6. `updatePreciosSucursal` volviendo a precio base
- Payload: `{ productoId, sucursalId, precioUsaBase: true }`
- Verificar que los precios de la fila se actualizan a los del producto base.
- Verificar `precio_usa_base = TRUE`.

### 7. Catálogo por sucursal
- Consultar `getCatalogo` para una sucursal.
- Verificar que productos con `precio_usa_base = FALSE` devuelven sus precios propios.
- Verificar que el campo `precioUsaBase` está presente en la respuesta.

### 8. Retrocompatibilidad
- Filas antiguas sin las nuevas columnas deben devolver `precioUsaBase = true`
  y los precios del producto base (sin errores).

## Notas de Ejecución

1. **Migración de datos:** Ejecutar `ensureInventarioSchema()` una vez desde el editor GAS
   antes de hacer `clasp push`. Esto agrega las columnas sin borrar datos.

2. **Filas existentes:** Al ejecutar `ensureInventarioSchema`, las filas existentes quedarán
   con `precio_usa_base` vacío, lo que la lógica interpreta como `TRUE` (precio del producto base).
   No se requiere migración de datos adicional.

3. **`seedRelacionesSeguridad`:** Si se ejecuta `seedDatosIniciales` en un ambiente limpio,
   el permiso `inventario.editar_precios` se registrará automáticamente para el rol SUPERVISOR.
   En ambientes existentes, ejecutar `seedSeguridadBase()` y `seedRolPermisos()` por separado.

4. **Orden de deploy GAS:** `clasp push` → publicar nueva versión de la Web App.

## Problemas Conocidos

Ninguno crítico. Puntos a observar:

- Si un movimiento no incluye `precioOfrecido` ni `precioFinal` (ambos 0), `_syncProductPrices`
  omite la actualización de precios en inventario (`if (!precioOfrecido && !precioFinal) return`).
  Esto es correcto: movimientos sin precio explícito no deben alterar los precios del inventario.

- `updatePreciosSucursal` con `precioUsaBase = true` ignora los precios del payload
  y toma los del producto base en ese instante. Si el producto base cambia después,
  la siguiente sincronización automática propagará el nuevo precio.

## Recomendaciones

1. **Fase E (UI — próxima sesión):**
   - Indicador visual en catálogo e inventario: badge "Base" (azul) / "Sucursal" (naranja).
   - Modal de edición de precios por sucursal desde el listado de inventario.
   - Botón "Sincronizar precios a todas las sucursales" en la ficha del producto base.
   - Columnas `precioOfrecido`, `precioFinal`, `precioUsaBase`, `fechaPrecio` en la tabla de inventario.

2. **Importación masiva de stock (`importarStockInicial`):** considerar agregar columnas
   opcionales `precioOfrecido` y `precioFinal` en el Excel de importación para poder
   definir precios por sucursal desde el inicio.

3. **`seedRelacionesSeguridad`:** ejecutar en producción después del deploy para que
   el nuevo permiso `inventario.editar_precios` quede registrado en las hojas de seguridad.

## Cómo y Qué Implementar

### Deploy backend

```bash
# 1. Push al repositorio
git add backend/src/setup.js \
        backend/src/services/InventarioService.js \
        backend/src/services/MovimientoService.js \
        backend/src/services/ProductoService.js \
        backend/src/services/CatalogoService.js \
        backend/src/services/AccessService.js \
        backend/src/main.js

git commit -m "feat(inventario): precios independientes por sucursal con sincronización de precio base"
git push origin dev

# 2. Subir a GAS
cd backend
clasp push

# 3. En el editor GAS: ejecutar una vez
#    → ensureInventarioSchema()       (agrega columnas a la hoja Inventario)
#    → seedSeguridadBase()            (registra el permiso nuevo en hojas de seguridad)
#    → seedRolPermisos()              (asigna el permiso al rol SUPERVISOR)

# 4. Publicar nueva versión de la Web App en GAS
```

### Deploy frontend

```bash
# Verificar que TypeScript compila sin errores
cd frontend
npx tsc --noEmit

# Build
quasar build
```

### Próxima sesión — Fase E (UI)

Los componentes que consumir el nuevo campo `precioUsaBase` son:
- `src/pages/inventario/` — tabla de stock por sucursal
- `src/pages/catalogo/` — vista de catálogo
- `src/pages/productos/` — ficha de producto (botón sincronizar)
- Nuevo componente: `src/components/inventario/PrecioSucursalDialog.vue`
