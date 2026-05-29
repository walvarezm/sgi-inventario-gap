# Persistencia de Borrador en MovimientoFormBase

## Resumen

Se implementó un sistema de auto-guardado de borrador (draft) para el formulario `MovimientoFormBase.vue`. Al refrescar la página o cuando la sesión caduca, los productos ya agregados a la lista del movimiento (entradas, salidas, transferencias) se restauran automáticamente desde `localStorage`. El borrador se limpia automáticamente al guardar el movimiento con éxito, al descartarlo manualmente o tras 24 horas de inactividad.

---

## Rama Git

```
dev  (derivada de main)
```

Commits sugeridos:
```bash
git checkout dev
git add frontend/src/composables/useMovimientoDraft.ts
git add frontend/src/components/inventario/MovimientoFormBase.vue
git add docs/resultados/2026-05-25_movimiento-draft-persistence.md
git commit -m "feat(inventario): persistencia de borrador de movimiento en localStorage"
git push origin dev
```

---

## Checklist

- [x] Composable `useMovimientoDraft.ts` creado en `src/composables/`
- [x] Clave `localStorage` única por tipo de movimiento (`ENTRADA`, `SALIDA`, `TRANSFERENCIA`)
- [x] Auto-guardado reactivo al cambiar items o campos de cabecera
- [x] Restauración automática al montar el formulario (solo en modo creación, no edición)
- [x] TTL de 24 horas: drafts expirados se descartan automáticamente
- [x] Banner de aviso al usuario cuando se restaura un borrador
- [x] Botón "descartar borrador" en el banner
- [x] `draft.discardDraft()` llamado tras submit exitoso
- [x] No interfiere con la edición de movimientos existentes (`initialData` presente)
- [x] Sin dependencias nuevas (usa `localStorage` nativo del navegador)
- [x] TypeScript estricto, sin uso de `any` en la lógica interna del composable
- [x] Archivo de resultados `.md` generado

---

## Detalles Técnicos

### Estrategia de persistencia

Se eligió **`localStorage` nativo** (no la abstracción `LocalStorage` de Quasar) para garantizar que el dato sobreviva incluso si la sesión de Quasar se limpia. El composable encapsula toda la lógica de serialización/deserialización.

### Clave de storage por tipo

```
sgi_movimiento_draft_entrada
sgi_movimiento_draft_salida
sgi_movimiento_draft_transferencia
sgi_movimiento_draft_ajuste
```

Cada tipo de movimiento tiene su propio espacio en `localStorage`, lo que permite tener borradores independientes sin colisión.

### TTL y expiración

Cada draft incluye un campo `savedAt: number` (timestamp Unix). Al leer el draft se compara con `Date.now()`. Si han pasado más de 24 horas (`DRAFT_TTL_MS = 24 * 60 * 60 * 1000`) el draft se descarta y elimina automáticamente.

### Cuándo se guarda

El watcher profundo sobre `items` y los watchers sobre los campos de cabecera (`modo`, `fechaRegistro`, `sucursalId`, etc.) disparan `persist()` de forma reactiva. La función `persist()` solo graba si hay al menos un `productoId` real para evitar guardar borradores vacíos.

### Cuándo se restaura

En `onMounted`, **después** de cargar las dependencias (stores de sucursales y productos) y **solo si `props.initialData` está vacío** (modo creación). Esto garantiza que la edición de movimientos existentes no sea sobreescrita por un draft.

### Cuándo se descarta

- Al llamar `handleSubmit()` con éxito → `draft.discardDraft()`
- Al hacer clic en "descartar borrador" en el banner de aviso
- Automáticamente si el TTL de 24h se supera en la próxima carga

### Banner de aviso

Se agregó un `q-banner` de Quasar con fondo `warning` que aparece cuando se detecta y restaura un draft. Informa al usuario cuántos productos se restauraron y ofrece la opción de descartarlos.

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/composables/useMovimientoDraft.ts` | Composable nuevo: lógica de guardado, restauración, TTL y autosave de borrador |
| `docs/resultados/2026-05-25_movimiento-draft-persistence.md` | Este archivo de resultados |

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/components/inventario/MovimientoFormBase.vue` | 5 modificaciones: import `nextTick`, import composable, estado `draftRestoredBanner`, inicialización de `draft`, integración en `onMounted`, `discardDraft` en submit, banner en template |

### Resumen de cambios en `MovimientoFormBase.vue`

1. **Import**: `nextTick` desde Vue, `useMovimientoDraft` desde composables.
2. **Estado**: `draftRestoredBanner` (controla visibilidad del banner).
3. **Instancia del composable**: `const draft = useMovimientoDraft({...})` con todos los refs del formulario.
4. **`onMounted`**: Restaura draft si no hay `initialData`; luego activa autosave.
5. **`handleSubmit`**: Llama `draft.discardDraft()` antes de emitir `saved`.
6. **Template**: Banner `q-banner` con información de restauración y botón de descarte.
7. **Eliminado**: `console.log` del watcher de debug sobre `items.value`.

---

## Pruebas de Test

### Manual — Escenario principal

1. Abrir el formulario de Entrada / Salida / Transferencia.
2. Agregar 3-5 productos a la lista.
3. **Refrescar la página** (F5).
4. Re-autenticarse si la sesión caducó.
5. Abrir el mismo formulario.
6. ✅ Debe aparecer el banner amarillo con el conteo de productos.
7. ✅ La tabla debe mostrar los mismos productos agregados antes del refresco.

### Manual — Descarte

1. Con el banner visible, hacer clic en **"descartar borrador"**.
2. ✅ La tabla queda vacía.
3. ✅ El banner desaparece.
4. Refrescar la página.
5. ✅ No aparece el banner (el draft fue eliminado).

### Manual — Submit exitoso

1. Completar el formulario y guardar.
2. ✅ El movimiento se guarda correctamente.
3. Abrir el formulario nuevamente.
4. ✅ No aparece el banner (el draft fue descartado al guardar).

### Manual — Edición de movimiento existente

1. Abrir un movimiento existente para editar (`initialData` presente).
2. ✅ No debe aparecer el banner ni restaurarse ningún draft.
3. ✅ Los datos se cargan desde `initialData` normalmente.

### Manual — TTL expirado

1. Modificar `DRAFT_TTL_HOURS = 0` temporalmente en el composable.
2. Agregar productos y refrescar.
3. ✅ El draft no se restaura (expiró).

---

## Notas de Ejecución

- El composable usa `localStorage` nativo del navegador para mayor compatibilidad, evitando depender de la sesión de Quasar.
- El autosave es reactivo (no por intervalo de tiempo), lo que garantiza que cada cambio se persiste inmediatamente.
- El draft de cada tipo de movimiento es independiente; se pueden tener borradores simultáneos de ENTRADA y SALIDA sin colisión.

---

## Problemas Conocidos / Limitaciones

| Problema | Severidad | Descripción |
|----------|-----------|-------------|
| Modo privado del navegador | Bajo | En algunos navegadores en modo incógnito, `localStorage` puede estar deshabilitado. El composable captura el error silenciosamente y no falla. |
| Cuota de localStorage | Muy bajo | Si el catálogo de productos es muy extenso y se agregan muchas líneas, el tamaño del JSON podría acercarse al límite (5 MB por dominio). Se almacenan solo IDs, no objetos completos, minimizando el riesgo. |
| Multi-tab | Bajo | Si se abren dos pestañas con el mismo formulario, el último en guardar gana (`last-write-wins`). No hay sincronización entre pestañas. |

---

## Recomendaciones

1. **Pruebas en dispositivos móviles**: verificar que el banner sea visible y usable en pantallas pequeñas.
2. **Extensión futura**: si se requiere sincronización multi-tab, considerar `BroadcastChannel` API o un evento `storage` listener.
3. **Extensión futura**: aplicar el mismo patrón al formulario de Órdenes de Compra (`OrdenCompraForm.vue`) si existe.
4. **Monitoreo**: si se reportan problemas de datos corruptos en localStorage, agregar validación con Zod sobre el JSON deserializado en `loadDraft()`.

---

## Cómo y Qué Implementar a Continuación

### Inmediato (este sprint)

- Verificar que `EntradaForm.vue`, `SalidaForm.vue` y `TransferenciaForm.vue` pasan el `tipo` correcto como prop a `MovimientoFormBase`. El composable depende de `props.tipo` para generar la clave de storage correcta.

### Próximo sprint

- Aplicar el mismo composable a `OrdenCompraForm.vue` si existe en el proyecto.
- Considerar mostrar en el menú lateral un indicador (badge) cuando hay drafts activos.

### Código de integración (sin cambios necesarios en forms hijos)

Los formularios `EntradaForm.vue`, `SalidaForm.vue` y `TransferenciaForm.vue` ya pasan `tipo="ENTRADA"`, `tipo="SALIDA"` y `tipo="TRANSFERENCIA"` respectivamente a `MovimientoFormBase`. No requieren modificaciones.

---

*Generado: 2026-05-25 — SGI v1.1 — rama dev*
