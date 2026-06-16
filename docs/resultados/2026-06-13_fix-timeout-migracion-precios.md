# Fix: Migración de Precios — Timeout de Ejecución GAS

## Resumen

Refactorización completa de `MigracionPreciosService` para resolver el error
`Exceeded maximum execution time` (límite de 6 minutos de Google Apps Script).

El cuello de botella era `Sheets.update()`, que por cada fila a actualizar:
1. Re-leía **toda la hoja** `Inventario` con `getDataRange().getValues()`.
2. Escribía **cada campo** con `setValue()` en un loop individual.

Con N filas a actualizar × M campos = N×M llamadas a la API de Sheets, cada
una con su propio round-trip de red → timeout inevitable.

La solución reemplaza ese patrón por **3 lecturas únicas + 2 escrituras bulk**,
reduciendo las llamadas a la API de O(N×M) a O(N).

## Rama Git

`dev`

## Checklist

- [x] Diagnóstico del cuello de botella confirmado (`Sheets.update` re-lee la hoja completa)
- [x] `MigracionPreciosService.js` reescrito completamente
- [x] Lectura única de `rawData` como array 2D crudo (`getDataRange().getValues()`)
- [x] Índice `inventarioIndex` en memoria: `'productoId::sucursalId'` → `{ rowIdx, row[] }`
- [x] Loop de clasificación sin ninguna llamada a Sheets
- [x] `_aplicarActualizacionesBulk`: `setValues([1×5])` por fila (columnas contiguas)
- [x] `insertMany` en bloque para filas nuevas
- [x] Verificación de columnas faltantes con mensaje de error claro
- [x] Documento de resultados generado

## Detalles

### Diagnóstico del problema

```
Sheets.update(nombre, id, cambios)          ← llamado N veces en el loop
  → sheet.getDataRange().getValues()        ← re-lee TODA la hoja (O(filas×cols))
  → headers.forEach → sheet.getRange().setValue()   ← M llamadas a la API
```

Con 200 movimientos únicos y 5 campos → 200 × (1 lectura + 5 writes) = **1.200 llamadas**
a la API de Sheets. Cada una tiene ~100-300ms de latencia de red → 2-6 minutos solo en I/O.

### Solución: patrón Read-Once / Write-Bulk

```
ANTES (por cada fila a actualizar):
  Sheets.update() → getDataRange() → setValue() × 5

DESPUÉS:
  Paso 1: getDataRange().getValues()   [1 lectura, toda la hoja en memoria]
  Paso 2: loop en memoria puro         [0 llamadas a Sheets]
  Paso 3: setValues([1×5]) × N_filas  [N llamadas, 1 por fila actualizada]
  Paso 4: insertMany(filas_nuevas)     [1 llamada para todas las inserciones]
```

**Total de llamadas a la API: 3 (lecturas) + N (updates) + 1 (inserts)**
vs. el anterior **3 + N×(1+M)**.

### Detalle de `_aplicarActualizacionesBulk`

Las 5 columnas de precio (`precio_ofrecido`, `precio_final`, `precio_usa_base`,
`fecha_precio`, `fecha_actualizacion`) son **contiguas** en la hoja tras ejecutar
`ensureInventarioSchema()`, por lo que se pueden escribir en un solo rango:

```javascript
sheet.getRange(sheetRow, minCol + 1, 1, 5).setValues([[v1, v2, v3, v4, v5]])
```

Una llamada por fila, sin re-leer nada.

Si por alguna razón las columnas no son contiguas (migración manual de la hoja),
el código detecta este caso y escribe celda por celda, pero siempre sin re-leer
la hoja entre iteraciones.

### Índice de inventario en memoria

```javascript
// Construido UNA VEZ al inicio, O(filas de Inventario)
inventarioIndex['productoId::sucursalId'] = { rowIdx: r, row: rawData[r] }

// Lookup durante el loop: O(1)
var invEntry = inventarioIndex[clave] || null
```

El `rowIdx` (índice en el array rawData, base 0, donde 0 = encabezado) se
convierte directamente a número de fila de Sheets con `rowIdx + 1`.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/services/MigracionPreciosService.js` | Reescrito completamente |
| `docs/resultados/2026-06-13_fix-timeout-migracion-precios.md` | Este documento |

## Comparativa de rendimiento estimado

| Escenario | Llamadas API (antes) | Llamadas API (ahora) |
|---|---|---|
| 50 filas a actualizar | 50×6 = 300 | 3+50+1 = 54 |
| 200 filas a actualizar | 200×6 = 1.200 | 3+200+1 = 204 |
| 500 filas a actualizar | 500×6 = 3.000 | 3+500+1 = 504 |
| 1.000 filas a actualizar | 1.000×6 = 6.000 | 3+1.000+1 = 1.004 |

A ~150ms por llamada, 200 filas: antes ~180s (timeout), ahora ~30s.

## Pruebas de Test

### 1. Preview sin timeout

```
Editor GAS → previewMigracionPreciosDesdeMovimientos()
```

Debe completar en segundos y mostrar el resumen en el log sin error de timeout.

### 2. Ejecución real

```
Editor GAS → migrarPreciosDesdeMovimientos()
```

Verificar en Sheets que las filas de `Inventario` tienen las columnas de precio
pobladas correctamente, con `fecha_precio` igual a la fecha del movimiento fuente.

### 3. Verificar `precio_usa_base`

Seleccionar una fila de Inventario recién migrada y comparar su `precio_ofrecido`
con el `precio_ofrecido` del producto correspondiente en la hoja `Productos`:
- Si son iguales → `precio_usa_base` debe ser `TRUE`.
- Si son distintos → `precio_usa_base` debe ser `FALSE`.

### 4. Sin `ensureInventarioSchema`

Modificar temporalmente el nombre de la columna `precio_ofrecido` en una copia
de prueba y verificar que el error es:
```
Faltan columnas en hoja Inventario: precio_ofrecido. Ejecutar ensureInventarioSchema() primero.
```

### 5. Modo force

```
Editor GAS → migrarPreciosDesdeMovimientosForzado()
```

Verificar que filas que ya tenían precio también se actualizan y el log reporta
`filasActualizadas` > 0 (no `filasOmitidas`).

## Notas de Ejecución

1. Ejecutar `ensureInventarioSchema()` antes de la migración si aún no se hizo.
2. Siempre ejecutar el **preview primero** para validar el plan sin riesgo.
3. La migración es idempotente con `force = false`: ejecutarla dos veces produce
   el mismo resultado (la segunda ejecución omite todo lo ya migrado).
4. El timeout anterior fue a los 6:14 a.m. (6 minutos exactos). Con la nueva
   implementación, 200 filas deben completar en menos de 60 segundos.

## Recomendaciones

1. Si la base de datos tiene >2.000 filas en `Movimientos` y el proceso aún es
   lento (improbable con la nueva implementación), filtrar por sucursal:
   ```javascript
   MigracionPreciosService.ejecutar({ sucursalId: 'uuid-sucursal-x' }, session)
   ```

2. **No ejecutar `migrarPreciosDesdeMovimientosForzado` en producción** sin revisar
   el preview primero — sobreescribirá precios que pudieron haber sido editados
   manualmente con `updatePreciosSucursal`.

## Cómo Implementar

```bash
# 1. El archivo ya fue reescrito en esta sesión
git add backend/src/services/MigracionPreciosService.js \
        docs/resultados/2026-06-13_fix-timeout-migracion-precios.md

git commit -m "fix(inventario): resolver timeout en migración de precios con escrituras bulk"
git push origin dev

# 2. Push a GAS
cd backend
clasp push

# 3. En el editor GAS, ejecutar en orden:
#    1. ensureInventarioSchema()                      ← si no se ejecutó antes
#    2. previewMigracionPreciosDesdeMovimientos()     ← revisar el log
#    3. migrarPreciosDesdeMovimientos()               ← ejecutar si el preview es correcto
```
