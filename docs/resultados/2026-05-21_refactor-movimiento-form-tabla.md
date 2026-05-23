# Refactor: MovimientoFormBase — Panel de ingreso + Tabla de productos

## Resumen

Se refactorizó el componente `MovimientoFormBase.vue` (usado por EntradaForm, SalidaForm y TransferenciaForm) para adoptar el mismo patrón UX de `OrdenCompraForm.vue`:

- **Panel de ingreso fijo** en la parte superior: búsqueda de producto, cantidad, precios y botón redondo de agregar.
- **Tabla `q-table`** con filas editables inline en lugar del antiguo `v-for` de `<div>` con bordes manuales.
- **Validación anti-duplicados** en el panel de ingreso, al duplicar filas y al enviar el formulario.
- Toda la lógica de negocio existente (modos UNITARIO/MASIVO, transferencias, referencias guiadas, `initialData`, `handleSubmit`, guards de permisos) se preservó sin modificaciones.

---

## Rama git

```
rama base : main
rama de trabajo : dev
```

### Comando para hacer el commit (ejecutar manualmente en la terminal):

```bash
cd "E:\Desarrollo\Sistemas-POS\inventario-maxel-appscript\sgi-inventario-gap"

# Asegurarse de estar en dev
git checkout dev

# Staging de los archivos
git add frontend/src/components/inventario/MovimientoFormBase.vue
git add docs/resultados/2026-05-21_refactor-movimiento-form-tabla.md

# Commit con mensaje convencional
git commit -m "feat(inventario): refactor MovimientoFormBase con panel de ingreso + tabla de productos

- Reemplaza el v-for de divs por q-table con slots de cuerpo personalizados
- Agrega panel de ingreso (select producto, cantidad, precios, boton add) equivalente a OrdenCompraForm
- Valida duplicados: en panel de ingreso acumula cantidad con notifyWarning; al duplicar fila idem; en handleSubmit bloquea si quedan duplicados tras edicion inline
- Modo UNITARIO: el panel de ingreso reemplaza la unica fila existente
- Modo MASIVO: el panel de ingreso agrega filas a la tabla; no se puede agregar el mismo producto dos veces
- Preserva: logica de negocio, buildPayload, initialData, permisos canMassive/canEditPrices, transferencias, ruta rapida, plantillas de referencia, notificaciones"

git push origin dev
```

---

## Checklist

### UX / funcional
- [x] Panel de ingreso visible y fijo arriba (no desaparece al hacer scroll en la lista)
- [x] Botón redondo `add` de color según tipo (positive/negative/primary) en el extremo derecho del panel
- [x] Tabla `q-table` con columnas: `#`, Producto, Cantidad, P. ofrecido, P. final, Detalle, Acciones
- [x] Edición inline en la tabla (q-input / q-select borderless dentro de las celdas)
- [x] Validación anti-duplicado al agregar desde panel (acumula cantidad + notifyWarning)
- [x] Validación anti-duplicado al duplicar fila (acumula cantidad + notifyWarning)
- [x] Validación anti-duplicado en `handleSubmit` (bloqueo si hay duplicados tras edición inline)
- [x] Modo UNITARIO: panel reemplaza la única fila; tabla muestra esa fila única
- [x] Modo MASIVO: panel agrega filas; botón "Limpiar todo" visible si hay más de 1 fila
- [x] Botones de duplicar/quitar por fila; duplicar deshabilitado en modo UNITARIO
- [x] Autocomplete de precios al seleccionar producto (panel y tabla)
- [x] `notifyWarning` disponible y usado correctamente (ya existía en `useNotify.ts`)

### Lógica de negocio preservada
- [x] `buildPayload()` sin cambios
- [x] `handleSubmit()`: validación de items vacíos + nueva validación de duplicados
- [x] `fillFromInitialData()` sin cambios
- [x] Modos UNITARIO / MASIVO y `onModoChange`
- [x] Sucursal única (ENTRADA/SALIDA) vs sucursal origen+destino (TRANSFERENCIA)
- [x] Ruta rápida "Casa Matriz → S-T3" para TRANSFERENCIA
- [x] Plantillas de referencia guiada (`opcionesReferencia`, `onReferenciaTipoChange`)
- [x] `canMassive` y `canEditPrices` (guards de permisos)
- [x] Sincronización con `initialData` via `watch` + `fillFromInitialData`
- [x] `inventarioService.updateMovimiento` y `createMovimientoMasivo` sin tocar

---

## Detalles del cambio

### Antes (problemática)

```
[Separador]
[N] Productos del Comprobante          [Agregar fila] [Limpiar]   <- boton lejano al inicio
  div fila 1: select producto | cantidad | p.ofrecido | p.final | detalle | [dup][del]
  div fila 2: ... (idem)
  ... (al crecer, el boton "Agregar fila" queda fuera de la vista)
```

Problemas identificados:
- El botón "Agregar fila" queda en el encabezado de la sección; al desplazarse hacia abajo, el usuario lo pierde de vista.
- El layout de cada fila usaba `col-md-1` para campos de texto anchos, causando truncamiento.
- No había validación de productos duplicados (a diferencia de OrdenCompraForm).
- Las filas en `<div>` con bordes CSS manuales eran inconsistentes con el resto de tablas del sistema.

### Después (solución)

```
[Agregar producto al comprobante]
+-----------------+------+----------+----------+--------+----+
| Buscar producto | Qty  | P.ofrec  | P.final  | Detall | +  |  <- panel fijo, siempre visible
+-----------------+------+----------+----------+--------+----+

[2] productos en el comprobante                   [Limpiar todo]
+--+----------------------+-------+----------+----------+--------+-------+
| # | Producto            | Cant. | P.ofrec. | P.final  |Detalle | Acc.  |
+--+----------------------+-------+----------+----------+--------+-------+
| 1 | [MARCA][SKU] Nombre |   5   | Bs. 10   | Bs. 12   |   -    | [c][x]|
| 2 | [MARCA][SKU] Nombre2|   2   | Bs. 50   | Bs. 55   |   -    | [c][x]|
+--+----------------------+-------+----------+----------+--------+-------+
```

### Flujo de validación anti-duplicados

```
Usuario agrega producto X desde el panel
        |
        +-- Modo UNITARIO?
        |       -> Reemplaza la unica fila -> resetNuevaLinea()
        |
        +-- Modo MASIVO?
                +-- productoId ya existe en items[]?
                |       -> Acumula cantidad + notifyWarning + resetNuevaLinea()
                +-- No existe -> push nuevo item + resetNuevaLinea()

Usuario duplica fila (modo MASIVO)
        +-- productoId del duplicado ya existe en otra fila?
        |       -> Acumula cantidad + notifyWarning
        +-- No existe -> agregarFila(source)

handleSubmit()
        +-- Set(productoIds).size !== productoIds.length?
                -> notifyError + return (bloquea envio)
```

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `docs/resultados/2026-05-21_refactor-movimiento-form-tabla.md` | Este documento de resultados |

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/components/inventario/MovimientoFormBase.vue` | Refactor completo del template (panel ingreso + q-table); ajuste de script para `nuevaLinea`, `agregarDesdePanel`, `productoLabel`, `columnasDetalle`, tipo `NuevaLinea`; estilos `.movimiento-form-card`, `.sgi-table :deep(td)`, `.ellipsis` |

**No se modificaron:**
- `EntradaForm.vue`
- `SalidaForm.vue`
- `TransferenciaForm.vue`
- `OrdenCompraForm.vue`
- `useNotify.ts`
- Ningún servicio, store ni tipo

---

## Pruebas de test (manuales recomendadas)

### Escenario 1 — Entrada, modo UNITARIO
1. Abrir el diálogo "Registrar Entrada".
2. Seleccionar un producto en el panel de ingreso → verificar autocompletado de precios.
3. Presionar botón `+` → el producto aparece en la tabla (única fila).
4. Seleccionar el mismo u otro producto en el panel → presionar `+` → la fila se reemplaza.
5. Guardar → se registra correctamente el movimiento.

### Escenario 2 — Salida, modo MASIVO
1. Cambiar a modo "Masivo".
2. Agregar 3 productos distintos desde el panel → aparecen como 3 filas en la tabla.
3. Intentar agregar un producto ya presente → debe aparecer `notifyWarning` y acumular cantidad.
4. Editar inline la cantidad de una fila → el valor se envía correctamente en el payload.
5. Duplicar una fila cuyo producto ya está en otra fila → acumula cantidad con `notifyWarning`.
6. Duplicar una fila única → crea nueva fila con los mismos datos.
7. Guardar → se registra con todas las líneas.

### Escenario 3 — Transferencia
1. Abrir "Transferencia entre Sucursales".
2. Seleccionar sucursal origen y destino.
3. Agregar productos → tabla se comporta igual que Escenario 2.
4. Usar ruta rápida "Casa Matriz → S-T3" → se autoseleccionan las sucursales.
5. Guardar → movimiento registrado correctamente.

### Escenario 4 — Edición de movimiento existente (initialData)
1. Abrir un movimiento ya registrado para editar.
2. Los items deben cargarse en la tabla.
3. Modificar cantidad de una fila → el botón "Guardar cambios" debe persistir el cambio.
4. Intentar agregar un producto duplicado → validación activa.

### Escenario 5 — Duplicados tras edición inline
1. Modo MASIVO con 2 productos distintos en la tabla.
2. Editar inline el `productoId` de la segunda fila eligiendo el mismo producto que la primera.
3. Presionar "Guardar movimiento" → debe aparecer `notifyError` bloqueando el envío.

---

## Notas de ejecución

- La herramienta Filesystem MCP no expone terminal/shell, por lo que el commit Git debe ejecutarse manualmente con los comandos de la sección **Rama git**.
- El archivo fue sobreescrito directamente en el sistema de archivos del usuario.
- Se verificó que `useNotify.ts` ya exportaba `notifyWarning` antes de usarlo en el componente.

---

## Problemas identificados y resueltos

| Problema | Solución aplicada |
|----------|-------------------|
| Botón "Agregar fila" perdido al hacer scroll | Panel de ingreso fijo arriba de la tabla |
| Filas en `<div>` con bordes manuales inconsistentes | `q-table` con `body-cell` slots personalizados |
| Sin validación de duplicados | Validación en 3 puntos: `agregarDesdePanel`, `duplicarFila`, `handleSubmit` |
| `col-md-1` insuficiente para selects de producto | Slots de tabla con `min-width` CSS por celda |
| `notifyWarning` no importado (riesgo) | Ya existía en `useNotify.ts`; se agregó al destructuring del composable |

---

## Recomendaciones

1. **Móvil / tablet**: el ancho mínimo del modal es `940px`; si el sistema se usa en tablets, evaluar reducir a `860px` o agregar scroll horizontal.
2. **Virtualización**: si el catálogo supera 200 items, agregar `:virtual-scroll-item-size="32"` al `q-select` de producto en el panel.
3. **Tecla Enter para agregar**: agregar `@keydown.enter.prevent="agregarDesdePanel"` en el campo `cantidad` del panel para acelerar la carga masiva.
4. **Test unitario**: crear `tests/unit/movimientoFormBase.spec.ts` que valide la lógica de `agregarDesdePanel` (acumulación de duplicados) usando Vitest + Vue Test Utils.

---

## Que y como implementar a continuación

### Opción A — Tecla Enter en el panel de ingreso (quick win)
En el campo `cantidad` del panel agregar:
```vue
@keydown.enter.prevent="agregarDesdePanel"
```

### Opción B — Test unitario del composable de duplicados
```typescript
// tests/unit/movimientoFormBase.spec.ts
import { describe, it, expect } from 'vitest'
// mock del store + montar componente + llamar agregarDesdePanel dos veces con el mismo productoId
```

### Opción C — Scroll virtual en q-select de producto
Si el catálogo supera 200 productos, agregar `:virtual-scroll-item-size="32"` al `q-select` de búsqueda.

---

*Generado: 2026-05-21 — SGI v1.1 — rama dev*
