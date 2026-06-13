# Migración de Precios desde Movimientos al Inventario

## Resumen

Implementación de `MigracionPreciosService` para poblar las nuevas columnas de precio
(`precio_ofrecido`, `precio_final`, `precio_usa_base`, `fecha_precio`) en la hoja
`Inventario` a partir de los precios históricos registrados en la hoja `Movimientos`.

La migración es **aditiva y no destructiva**: solo actúa sobre filas cuyas columnas de
precio están completamente vacías (registros previos a la sesión de precios por sucursal).
Incluye modo dry-run para revisar el plan antes de ejecutar, y modo `force` para
reimportar todo desde cero si se necesita.

## Rama Git

`dev`

## Checklist

- [x] `MigracionPreciosService.js` creado con lógica completa
- [x] Método `preview` (dry-run, sin escritura)
- [x] Método `ejecutar` (migración real con log de auditoría)
- [x] Lógica `_construirMapaPreciosMovimientos` — toma precio más reciente por (producto, sucursal)
- [x] Lógica `_sucursalesDeMovimiento` — resuelve sucursal según tipo (ENTRADA/SALIDA/TRANSFERENCIA/AJUSTE)
- [x] Transferencias: aplica precio a ambas sucursales (origen y destino)
- [x] `_filaTienePrecio` — detecta filas ya pobladas para no sobreescribir
- [x] `_procesarFila` — decide ACTUALIZADO / CREADO / OMITIDO por fila
- [x] `main.js` — endpoints `previewMigracionPrecios` y `ejecutarMigracionPrecios`
- [x] `setup.js` — funciones ejecutables desde editor GAS:
  - `previewMigracionPreciosDesdeMovimientos()`
  - `migrarPreciosDesdeMovimientos()`
  - `migrarPreciosDesdeMovimientosForzado()`
- [x] Documento de resultados generado

## Detalles

### Fuente de datos

La hoja `Movimientos` registra en cada línea `precio_ofrecido` y `precio_final`.
Estos precios fueron capturados en cada operación de inventario históricamente.

### Criterio de precio más reciente

Para cada combinación `(producto_id, sucursal_id)`, se toma el movimiento con
`fecha_registro` (o `fecha` como fallback) más reciente que tenga al menos un
precio > 0. Esto representa el último precio conocido del producto en esa sucursal.

### Regla de resolución de sucursal por tipo de movimiento

| Tipo         | Sucursal donde aplica el precio              |
|---|---|
| `ENTRADA`    | `sucursal_destino` (si no vacío) o `sucursal_origen` |
| `SALIDA`     | `sucursal_origen` (si no vacío) o `sucursal_destino` |
| `TRANSFERENCIA` | Ambas — `sucursal_origen` **y** `sucursal_destino`  |
| `AJUSTE` / otros | El campo que no esté vacío                    |

### Política de no-sobreescritura (`force = false`)

Una fila de `Inventario` se considera **ya poblada** si tiene cualquier valor
distinto de vacío (`''`, `null`, `undefined`) en alguna de estas columnas:
`precio_ofrecido`, `precio_final`, `precio_usa_base`.

Si la fila ya está poblada y `force = false` → acción `OMITIDO`.
Si la fila ya está poblada y `force = true` → acción `ACTUALIZADO` (sobreescribe).

### Determinación de `precio_usa_base`

```
precioOfrecidoMovimiento === precioOfrecidoProductoBase
  Y
precioFinalMovimiento    === precioFinalProductoBase
  → precio_usa_base = TRUE

Si alguno difiere → precio_usa_base = FALSE
```

### Estructura de respuesta

```json
{
  "dryRun": false,
  "resumen": {
    "totalMovimientosAnalizados": 320,
    "combinacionesEncontradas": 48,
    "filasActualizadas": 41,
    "filasCreadas": 3,
    "filasOmitidas": 4,
    "warnings": []
  },
  "detalle": [
    {
      "productoId": "uuid-producto",
      "sucursalId": "uuid-sucursal",
      "precioOfrecido": 200.0,
      "precioFinal": 180.0,
      "precioUsaBase": false,
      "fechaMovimiento": "2026-03-15T14:30:00.000Z",
      "tipoMovimiento": "ENTRADA",
      "movimientoId": "uuid-movimiento",
      "accion": "ACTUALIZADO",
      "inventarioId": "uuid-inventario"
    }
  ]
}
```

### Casos borde manejados

| Caso | Comportamiento |
|---|---|
| Movimiento con precio = 0 en ambos campos | Ignorado — no aporta información |
| Múltiples movimientos para la misma (producto, sucursal) | Se toma el más reciente |
| Producto no encontrado en hoja Productos | Warning + acción OMITIDO |
| Sucursal no existente en la hoja Sucursales | Se migra igual (la fila de Inventario referencia el ID) |
| Fila de Inventario no existe aún | Se crea con `stock_actual = 0` |
| Fila de Inventario ya tiene precio y `force = false` | OMITIDO con razon |
| Fila de Inventario ya tiene precio y `force = true` | ACTUALIZADO |
| Transferencia con origen = destino (inválida) | La deduplicación en `_sucursalesDeMovimiento` lo maneja |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `backend/src/services/MigracionPreciosService.js` | Servicio completo de migración |
| `docs/resultados/2026-06-13_migracion-precios-movimientos.md` | Este documento |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/main.js` | Endpoints `previewMigracionPrecios` y `ejecutarMigracionPrecios` |
| `backend/src/setup.js` | 3 funciones ejecutables desde el editor GAS |

## Pruebas de Test

### 1. Preview desde el editor GAS (antes de ejecutar nada)

```
Editor GAS → Ejecutar → previewMigracionPreciosDesdeMovimientos
```

Verificar en el log:
- Número de movimientos analizados coherente con los datos en la hoja.
- Número de combinaciones halladas razonable.
- Sin warnings inesperados.
- El detalle de los primeros 20 ítems tiene precios correctos.

### 2. Ejecución real en modo conservador (`force = false`)

```
Editor GAS → Ejecutar → migrarPreciosDesdeMovimientos
```

Verificar en Sheets:
- Filas de Inventario que antes tenían `precio_ofrecido` vacío ahora tienen valor.
- El campo `precio_usa_base` es coherente (TRUE si igual al producto base, FALSE si distinto).
- El campo `fecha_precio` contiene la fecha del movimiento de origen, no la fecha actual.
- Las filas que ya tenían precio no fueron tocadas.

### 3. Verificar transferencias

Buscar en Movimientos un registro de tipo TRANSFERENCIA con precio.
Verificar que TANTO la sucursal origen como la destino tienen el precio en Inventario.

### 4. Preview filtrado por sucursal

Via API:
```json
POST { "action": "previewMigracionPrecios", "payload": { "sucursalId": "uuid-sucursal-x" } }
```

Verificar que el resultado solo contiene combinaciones de esa sucursal.

### 5. Modo forzado (`force = true`) — solo en entorno de prueba

```
Editor GAS → Ejecutar → migrarPreciosDesdeMovimientosForzado
```

Verificar que filas previamente pobladas también fueron actualizadas.
Verificar que la auditoría en LogAcciones registra la operación.

### 6. Fila sin movimiento con precio

Un producto que solo tiene movimientos con precio = 0 no debe aparecer en el
detalle del preview ni generar ninguna entrada en Inventario.

### 7. Producto sin fila de inventario en esa sucursal

Si la migración encuentra un movimiento de una combinación (producto, sucursal)
que no tiene fila en Inventario, debe crear la fila con `stock_actual = 0`.
Verificar que el stock no cambia y solo se registra el precio.

## Notas de Ejecución

1. La migración lee toda la hoja `Movimientos` en una sola llamada (`Sheets.getAll`),
   sin paginación. Si hay >50,000 movimientos puede acercarse al límite de 6 min de GAS.
   En ese caso, usar el filtro por `sucursalId` para migrar de a una sucursal a la vez.

2. La migración NO afecta el campo `stock_actual` bajo ninguna circunstancia.
   Solo escribe en las columnas de precio e información de fechas.

3. El campo `fecha_precio` se popula con `fecha_registro` del movimiento origen,
   no con la fecha de ejecución de la migración. Esto preserva la trazabilidad histórica.

4. El log de auditoría en `LogAcciones` solo se escribe cuando se llama por la API
   (`ejecutarMigracionPrecios`). Las funciones de GAS usan el Logger de GAS.

5. Ejecutar `clasp push` antes de probar. Si se ejecuta desde el editor GAS directamente
   sobre el código fuente del proyecto, asegurarse que GAS tiene acceso al archivo nuevo.

## Problemas Conocidos

Ninguno crítico.

- Si un movimiento antiguo tiene `sucursal_origen` y `sucursal_destino` ambos vacíos,
  `_sucursalesDeMovimiento` retornará `[]` y el movimiento será ignorado. Es el
  comportamiento correcto: no se puede saber a qué sucursal aplicar el precio.

## Recomendaciones

1. **Orden de ejecución obligatorio:**
   ```
   1. ensureInventarioSchema()                     ← agrega columnas (sesión anterior)
   2. previewMigracionPreciosDesdeMovimientos()    ← revisar plan en el log
   3. migrarPreciosDesdeMovimientos()              ← ejecutar si el preview es correcto
   4. Revisar log de resultados
   5. Si hay inconsistencias: migrarPreciosDesdeMovimientosForzado()  ← reimportar todo
   ```

2. **Después de la migración**, revisar manualmente una muestra de filas en la hoja
   `Inventario` para validar que los precios son coherentes con el historial de compras.

3. **Para bases de datos con muchos movimientos** (>10,000), ejecutar filtrado por
   sucursal de a una:
   ```json
   { "action": "ejecutarMigracionPrecios", "payload": { "sucursalId": "uuid-x" } }
   ```

## Cómo y Qué Implementar

### Deploy

```bash
# 1. Commit y push
git add backend/src/services/MigracionPreciosService.js \
        backend/src/main.js \
        backend/src/setup.js \
        docs/resultados/2026-06-13_migracion-precios-movimientos.md

git commit -m "feat(inventario): migración de precios históricos desde movimientos al inventario"
git push origin dev

# 2. Push a GAS
cd backend
clasp push

# 3. Desde el editor GAS — secuencia de ejecución:
#    a. previewMigracionPreciosDesdeMovimientos   → revisar log
#    b. migrarPreciosDesdeMovimientos              → ejecutar migración real
```

### Endpoints disponibles via API (para herramientas externas o UI futura)

| Acción | Payload | Descripción |
|---|---|---|
| `previewMigracionPrecios` | `{ force?, sucursalId?, productoId? }` | Dry-run, solo lee |
| `ejecutarMigracionPrecios` | `{ force?, sucursalId?, productoId? }` | Migración real |
