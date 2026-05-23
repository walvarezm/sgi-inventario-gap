# Ajuste: excepción de duplicado para producto sin código

## Resumen

El producto `f14fe181-7896-4c19-8a92-b87bc8511d09` ("producto sin código") debe poder
registrarse múltiples veces en el mismo comprobante, porque se usa como comodín para
productos sin identificación definitiva que luego se ajustan. Se creó la constante
`PRODUCTOS_SIN_RESTRICCION` y se aplicó la excepción en los 3 puntos de validación.

---

## Rama git

```
rama base : main
rama de trabajo : dev
```

### Commit (ejecutar manualmente):

```bash
cd "E:\Desarrollo\Sistemas-POS\inventario-maxel-appscript\sgi-inventario-gap"
git checkout dev
git add frontend/src/components/inventario/MovimientoFormBase.vue
git add docs/resultados/2026-05-21_ajuste-producto-sin-codigo-excepcion.md
git commit -m "fix(inventario): excluir producto-sin-codigo de validacion de duplicados

- Agrega constante PRODUCTOS_SIN_RESTRICCION con el ID f14fe181-7896-4c19-8a92-b87bc8511d09
- agregarDesdePanel: permite agregar ese producto aunque ya exista en la tabla
- duplicarFila: permite duplicar filas de ese producto
- handleSubmit: excluye ese ID del conteo de duplicados al guardar
- Permite registrar multiples lineas del mismo producto-sin-codigo en un comprobante"
git push origin dev
```

---

## Checklist

- [x] Constante `PRODUCTOS_SIN_RESTRICCION` declarada como `Set<string>` — fácil de extender con más IDs
- [x] `agregarDesdePanel`: condición `if (existente && !PRODUCTOS_SIN_RESTRICCION.has(...))` — pasa si el ID está en la lista blanca
- [x] `duplicarFila`: misma excepción aplicada
- [x] `handleSubmit`: el filtro de duplicados excluye los IDs de la lista blanca antes de comparar
- [x] Variable suelta `productoSinCodigo` eliminada (quedó de un intento anterior, nunca se usó en la condición)

---

## Detalle del cambio

### Constante nueva (declarada una sola vez, usada en 3 lugares)

```typescript
// ── Productos sin restricción de duplicado ───────────────────
// IDs que pueden registrarse múltiples veces en el mismo comprobante
// (ej: "producto sin código" usado como comodín para ajuste posterior)
const PRODUCTOS_SIN_RESTRICCION = new Set<string>([
  'f14fe181-7896-4c19-8a92-b87bc8511d09',
])
```

Para agregar otro producto en el futuro, solo se agrega su ID a este Set.

### agregarDesdePanel

```typescript
// ANTES
if (existente) { notifyError(...); return }

// DESPUÉS
if (existente && !PRODUCTOS_SIN_RESTRICCION.has(nuevaLinea.value.productoId)) {
  notifyError(...); return
}
```

### duplicarFila

```typescript
// ANTES
if (existente) { notifyError(...); return }

// DESPUÉS
if (existente && !PRODUCTOS_SIN_RESTRICCION.has(source.productoId)) {
  notifyError(...); return
}
```

### handleSubmit

```typescript
// ANTES — contaba todos los IDs
const productoIds = items.value.map((i) => i.productoId)
const hasDuplicates = productoIds.length !== new Set(productoIds).size

// DESPUÉS — excluye IDs en lista blanca antes de comparar
const idsRestringidos = items.value
  .map((i) => i.productoId)
  .filter((id) => !PRODUCTOS_SIN_RESTRICCION.has(id))
const hasDuplicates = idsRestringidos.length !== new Set(idsRestringidos).size
```

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `docs/resultados/2026-05-21_ajuste-producto-sin-codigo-excepcion.md` | Este documento |

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/components/inventario/MovimientoFormBase.vue` | +6 líneas (constante) / ~8 líneas ajustadas en 3 funciones |

---

## Pruebas

| Acción | Resultado esperado |
|--------|--------------------|
| Agregar producto-sin-codigo 1 vez | Se agrega normalmente |
| Agregar producto-sin-codigo una 2da vez (mismo comprobante) | Se agrega como nueva fila (sin error) |
| Agregar producto-sin-codigo una 3ra, 4ta vez | Siempre se agrega |
| Duplicar una fila de producto-sin-codigo | Se duplica sin bloqueo |
| Guardar con múltiples filas de producto-sin-codigo | Pasa la validación y guarda correctamente |
| Agregar cualquier otro producto ya existente en la tabla | Sigue bloqueando con notifyError |
| Guardar con otro producto duplicado por edición inline | Sigue bloqueando en handleSubmit |

---

## Nota de extensibilidad

Si en el futuro hay más productos "comodín" que necesiten el mismo comportamiento,
basta con agregar su ID al Set:

```typescript
const PRODUCTOS_SIN_RESTRICCION = new Set<string>([
  'f14fe181-7896-4c19-8a92-b87bc8511d09', // producto sin código
  'otro-uuid-aqui',                         // otro comodín
])
```

---

*Generado: 2026-05-21 — SGI v1.1 — rama dev*
