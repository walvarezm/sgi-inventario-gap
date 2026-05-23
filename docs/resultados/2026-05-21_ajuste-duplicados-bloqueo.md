# Ajuste: validación anti-duplicados — bloqueo en lugar de acumulación

## Resumen

Ajuste puntual sobre `MovimientoFormBase.vue`. En la sesión anterior se implementó validación
anti-duplicados que acumulaba la cantidad cuando un producto ya existía en la tabla. El
requerimiento es que la validación **bloquee** la adición (sin modificar nada en la tabla) y
muestre un mensaje de error claro indicando que el usuario debe editar la cantidad directamente
en la fila existente.

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
git add docs/resultados/2026-05-21_ajuste-duplicados-bloqueo.md
git commit -m "fix(inventario): bloquear adicion de productos duplicados en MovimientoFormBase

- agregarDesdePanel: cambia acumulacion de cantidad por notifyError + return sin modificar tabla
- duplicarFila: cambia acumulacion de cantidad por notifyError + return sin agregar fila
- El usuario debe editar la cantidad directamente en la fila existente de la tabla"
git push origin dev
```

---

## Checklist

- [x] `agregarDesdePanel` — duplicado bloquea con `notifyError`, no modifica la tabla, no resetea el panel (el usuario puede corregir)
- [x] `duplicarFila` — duplicado bloquea con `notifyError`, no agrega fila, no acumula cantidad
- [x] `handleSubmit` — validación final de duplicados intacta (línea de defensa ante edición inline)
- [x] `notifyWarning` eliminado de ambas rutas (ya no se usa para este caso)
- [x] Resto del componente sin cambios

---

## Detalles del cambio

### `agregarDesdePanel` — antes vs después

```typescript
// ANTES: acumulaba la cantidad en la fila existente
if (existente) {
  existente.cantidad += nuevaLinea.value.cantidad
  notifyWarning('El producto ya estaba en la lista. Se acumuló la cantidad.')
  resetNuevaLinea()
  return
}

// DESPUÉS: bloquea sin modificar nada
if (existente) {
  notifyError('El producto ya está en la lista. Elimínalo primero o edita su cantidad directamente en la tabla.')
  return
}
```

Diferencias clave:
- Ya no se toca `existente.cantidad`.
- Ya no se llama a `resetNuevaLinea()` — el panel conserva los datos para que el usuario corrija o elija otro producto.
- `notifyWarning` → `notifyError` (tono correcto: es un impedimento, no una advertencia).

### `duplicarFila` — antes vs después

```typescript
// ANTES: acumulaba la cantidad en la fila destino
if (existente) {
  existente.cantidad += source.cantidad
  notifyWarning('Producto ya en la lista. Se acumuló la cantidad.')
  return
}

// DESPUÉS: bloquea sin modificar nada
if (existente) {
  notifyError('El producto ya está en la lista. No se puede duplicar.')
  return
}
```

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `docs/resultados/2026-05-21_ajuste-duplicados-bloqueo.md` | Este documento |

## Archivos modificados

| Archivo | Líneas cambiadas |
|---------|-----------------|
| `frontend/src/components/inventario/MovimientoFormBase.vue` | 6 líneas en `agregarDesdePanel` + 3 líneas en `duplicarFila` |

---

## Pruebas

| Acción | Resultado esperado |
|--------|--------------------|
| Agregar producto A (ya en tabla) desde el panel | `notifyError` visible, tabla sin cambios, panel mantiene los datos |
| Duplicar fila con producto que ya existe en otra fila | `notifyError` visible, no se agrega nueva fila |
| Agregar producto B (no en tabla) | Se agrega normalmente |
| Guardar con duplicados generados por edición inline | `notifyError` bloquea el envío (validación en `handleSubmit` intacta) |

---

*Generado: 2026-05-21 — SGI v1.1 — rama dev*
