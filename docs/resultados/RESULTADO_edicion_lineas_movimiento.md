# Edición Individual de Líneas en Módulo de Movimientos

## Resumen

Se implementó la capacidad de **editar, eliminar y guardar cada línea (detalle) de un
movimiento de inventario de forma independiente**, sin necesidad de guardar todas las
líneas en conjunto. Los cambios se aplican fila a fila desde la misma tabla de
comprobantes, con reversión automática de stock en cada operación.

---

## Rama Git

```
Repositorio : sgi-inventario-gap
Rama base   : dev  (deriva de main)
Rama trabajo: dev
Commit sugerido:
  feat(inventario): edición y eliminación individual de líneas en comprobantes de movimiento
```

---

## Checklist

### Frontend
- [x] Crear componente `MovimientoDetalleRow.vue` — fila editable individual
- [x] Modificar `MovimientosTable.vue` — agregar expand row con panel de líneas
- [x] Modificar `inventarioService.ts` — agregar `updateMovimientoDetalle` y `deleteMovimientoDetalle`

### Backend
- [x] Agregar método `updateMovimientoDetalle` en `MovimientoService.js`
- [x] Agregar método `deleteMovimientoDetalle` en `MovimientoService.js`
- [x] Registrar rutas `updateMovimientoDetalle` y `deleteMovimientoDetalle` en `main.js`

### Documentación
- [x] Generar archivo `.md` de resultados (este archivo)

---

## Detalles de Implementación

### Flujo de usuario

```
Tabla de Movimientos (MovimientosTable)
  │
  ├── Botón "expand_more" por cada fila de cabecera
  │     → Llama a getMovimientoById para cargar las líneas
  │     → Muestra panel inline con tabla de MovimientoDetalleRow
  │
  └── Por cada fila de detalle (MovimientoDetalleRow):
        ├── Modo VISTA  → botones [editar] [eliminar]
        ├── Modo EDICIÓN → campos editables inline + [guardar] [cancelar]
        └── Eliminación → confirmación inline con banner antes de ejecutar
```

### Reglas de negocio implementadas

| Regla | Descripción |
|-------|-------------|
| No eliminar última línea | El backend rechaza eliminar si el comprobante tiene solo 1 línea |
| Reversión de stock al editar | Se revierte la cantidad anterior y se aplica la nueva |
| Reversión de stock al eliminar | Se revierte la cantidad de la línea eliminada |
| Validación de stock en SALIDA | Si la nueva cantidad > stock disponible, error |
| Validación de stock en TRANSFERENCIA | Verifica stock en sucursal origen |
| Permiso requerido | `inventario.editar_movimientos` o rol ADMINISTRADOR/SUPERVISOR |
| Permiso de precios | `inventario.editar_precios_movimiento` para editar P.Venta y P.Final |
| Log de auditoría | Cada operación se registra en `LogAcciones` |
| Invalidación de caché | Se invalida el caché de catálogo de las sucursales afectadas |
| Sincronización de precios | Al editar, si hay cambio de precios, se actualiza el producto |

### Comportamiento del botón de guardado

- **Deshabilitado** si no hay cambios (`isDirty = false`)
- **Deshabilitado** si el formulario no es válido (producto vacío o cantidad ≤ 0)
- **Spinner** mientras se guarda
- **Notificación** de éxito o error

### Comportamiento del botón de eliminación

- **Deshabilitado** si es la única línea del comprobante (tooltip explicativo)
- Muestra confirmación inline (banner rojo) antes de ejecutar
- Revierte el stock de esa línea en el backend
- La fila se oculta visualmente (tachada + opacidad) tras confirmar

---

## Archivos Creados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `frontend/src/components/inventario/MovimientoDetalleRow.vue` | Vue 3 + TypeScript | Componente de fila editable individual con estado propio (vista/edición/eliminado) |

---

## Archivos Modificados

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `frontend/src/components/inventario/MovimientosTable.vue` | Vue 3 + TypeScript | Agregado slot `#body` con expand row, carga lazy de detalles, integración de `MovimientoDetalleRow`, callbacks `onDetalleSaved` / `onDetalleDeleted` |
| `frontend/src/services/inventarioService.ts` | TypeScript | Agregados tipos `MovimientoDetalleUpdatePayload`, `MovimientoDetalleDeletePayload` y métodos `updateMovimientoDetalle`, `deleteMovimientoDetalle` |
| `backend/src/services/MovimientoService.js` | Google Apps Script | Agregados métodos `updateMovimientoDetalle` y `deleteMovimientoDetalle` con lógica completa de stock, validaciones y log |
| `backend/src/main.js` | Google Apps Script | Registradas las rutas `updateMovimientoDetalle` y `deleteMovimientoDetalle` en el router `doPost` |

---

## Pruebas de Test

### Casos a probar manualmente

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | Expandir un comprobante con varias líneas | Se muestran todas las líneas en panel inline |
| 2 | Editar cantidad de una línea ENTRADA | Stock se ajusta: revierte anterior, aplica nueva |
| 3 | Editar cantidad de una línea SALIDA con stock suficiente | Stock corregido correctamente |
| 4 | Editar cantidad de una línea SALIDA sin stock suficiente | Error de stock insuficiente, sin cambio |
| 5 | Editar cantidad de una línea TRANSFERENCIA | Stock origen decrementado, destino incrementado correctamente |
| 6 | Cambiar producto en una línea | Stock del producto anterior revertido, nuevo aplicado |
| 7 | Eliminar una línea en comprobante con 2+ líneas | Línea eliminada, stock revertido |
| 8 | Intentar eliminar la única línea | Botón deshabilitado + error de backend |
| 9 | Cancelar edición | Valores vuelven al estado original, sin llamada al backend |
| 10 | Guardar sin cambios | Botón deshabilitado (isDirty = false) |
| 11 | Usuario sin permiso `inventario.editar_movimientos` | Botones de editar/eliminar no visibles |
| 12 | Usuario sin permiso `inventario.editar_precios_movimiento` | Campos de precio deshabilitados |

---

## Notas de Ejecución

### Deploy backend (Google Apps Script)

```bash
cd backend
clasp push
# En editor GAS → Implementar → Nueva implementación
# Actualizar VITE_GAS_API_URL si la URL cambia
```

### Build frontend

```bash
cd frontend
npx tsc --noEmit   # Verificar tipos
quasar build       # Build producción
```

---

## Problemas Conocidos / Limitaciones

| Problema | Detalle | Solución |
|----------|---------|---------|
| Expand recarga siempre | Cada vez que se expande, se llama a `getMovimientoById` | Aceptable; botón "recargar" también disponible. Se puede agregar TTL de caché si el rendimiento lo requiere |
| Totales de cabecera | `cantidadTotal` y `totalLineas` se actualizan localmente en el frontend; si otro usuario edita simultáneamente, puede haber desincronía | Recargar con botón "refresh" de la tabla para sincronizar |
| No se actualiza el `estado` de cabecera | Al editar líneas individuales, el campo `estado` de la cabecera no cambia a `EDITADO` | Considerar agregar en futuro si se requiere trazabilidad del estado |

---

## Recomendaciones

1. **Pruebas de integración** en entorno de staging antes de producción, especialmente los escenarios de stock en SALIDA y TRANSFERENCIA.
2. **Agregar permisos granulares** (`inventario.eliminar_linea_movimiento`) separados de `inventario.editar_movimientos` si se quiere control más fino.
3. **Agregar columna `estado`** en la vista de la línea para mostrar si fue editada o está activa.
4. **Limitar edición** de comprobantes con más de N días (política de cierre contable); esto se puede hacer en el backend comparando `fecha_registro` con la fecha actual.

---

## Cómo Implementar en Producción

```bash
# 1. Asegurar estar en la rama dev
git checkout dev
git pull origin dev

# 2. Verificar TypeScript sin errores
cd frontend
npx tsc --noEmit

# 3. Build de producción
quasar build

# 4. Subir backend actualizado
cd ../backend
clasp push

# 5. Nueva implementación en GAS (editor web)
#    Implementar → Administrar → Nueva versión
#    Copiar la URL si cambió y actualizar .env.production

# 6. Subir dist/spa/ al servidor de hosting
# 7. Commit y push
git add .
git commit -m "feat(inventario): edición y eliminación individual de líneas en comprobantes de movimiento"
git push origin dev
```

---

*Generado: 2026 — SGI v1.1 — Módulo Inventario / Movimientos*
