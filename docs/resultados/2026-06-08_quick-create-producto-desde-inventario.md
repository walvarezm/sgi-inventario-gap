# Creación Rápida de Producto desde el Módulo de Inventario

## Resumen

Se implementó la funcionalidad para crear un nuevo producto directamente desde el formulario de
registro de movimientos (entrada, salida, transferencia), sin perder el enfoque del modal ni
interrumpir el flujo de trabajo del usuario.

El nuevo producto queda disponible inmediatamente en el selector de productos del panel de ingreso
y se selecciona automáticamente, con sus precios precargados, listo para definir cantidad y
agregar la línea al movimiento.

---

## Rama Git

```
Base:    dev
Feature: dev  (cambio directo, sin rama feature adicional)
```

### Comandos de commit recomendados

```bash
cd E:\Desarrollo\Sistemas-POS\inventario-maxel-appscript\sgi-inventario-gap

git add frontend/src/components/productos/ProductoQuickCreateDialog.vue
git add frontend/src/components/inventario/MovimientoFormBase.vue
git add docs/resultados/2026-06-08_quick-create-producto-desde-inventario.md

git commit -m "feat(inventario): creación rápida de producto desde modal de movimiento

- Nuevo componente ProductoQuickCreateDialog.vue con campos mínimos
- Botón add_box junto al selector de producto en MovimientoFormBase
- Al crear, el nuevo producto se selecciona automáticamente en el panel
- El store productoStore se actualiza (pushItem + sync evento)
- El modal de movimiento permanece abierto durante todo el flujo"

git push origin dev
```

---

## Checklist

- [x] Nuevo componente `ProductoQuickCreateDialog.vue` creado
- [x] Import y registro en `MovimientoFormBase.vue`
- [x] Botón `add_box` añadido junto al `q-select` de producto
- [x] `dialogCrearProducto` ref y función `onProductoCreado` implementadas
- [x] Al crear: opciones del select actualizadas sin refetch completo
- [x] Al crear: producto auto-seleccionado con precios precargados
- [x] Modal de movimiento NO se cierra durante el flujo de creación
- [x] Validaciones estándar del formulario (SKU, nombre, marca, unidad)
- [x] `productoStore.create()` usado → cache local actualizado + evento `producto:created` emitido
- [x] Archivo de resultados `.md` generado

---

## Detalles de Implementación

### Arquitectura de la solución

```
InventarioPage.vue
  └─ q-dialog → EntradaForm / SalidaForm / TransferenciaForm
       └─ MovimientoFormBase.vue                  [MODIFICADO]
            ├─ Panel ingreso: q-select + q-btn(add_box)
            └─ ProductoQuickCreateDialog.vue       [NUEVO] (anidado, sin backdrop)
                 └─ productoStore.create()
                      ├─ cache.pushItem(nuevo)
                      └─ sync.emit('producto:created', nuevo)
```

### Flujo de usuario

1. Usuario abre "Registrar Entrada" (o Salida / Transferencia).
2. En el panel "Agregar producto", junto al selector aparece el botón **+** (`add_box`).
3. Al hacer clic, se abre `ProductoQuickCreateDialog` sobre el modal de movimiento.
4. El usuario completa los campos mínimos (SKU, Marca, Nombre, Unidad, Precios).
5. Al guardar:
   - `productoStore.create()` persiste el producto en el backend.
   - El nuevo producto se inserta al inicio de `opcionesProducto`.
   - Se selecciona automáticamente en `nuevaLinea.productoId`.
   - Los precios se precargan en `nuevaLinea.precioOfrecido/precioFinal`.
   - `ProductoQuickCreateDialog` se cierra.
   - El modal de movimiento permanece abierto.
6. El usuario solo define la cantidad y presiona **+** para agregar la línea.

### Decisiones de diseño

| Decisión | Razón |
|----------|-------|
| Componente separado `ProductoQuickCreateDialog` | Reutilizable desde cualquier otro modal futuro (POS, Órdenes de compra) |
| Sin imagen ni QR en el formulario rápido | Simplificar el flujo; ambos se pueden completar en el módulo Productos |
| `no-backdrop-dismiss` en el diálogo | Evitar cierre accidental al hacer clic fuera |
| Inserción en `opcionesProducto` sin refetch | Evita llamada a GAS; el `productoStore` ya actualizó su caché local vía `pushItem` |
| Producto insertado al inicio del array de opciones | Aparece primero en el listado para fácil localización inmediata |
| QR por defecto = SKU | Valor mínimo válido; editable después desde Productos |
| `persistent` en el diálogo interno | Impide que el usuario cierre accidentalmente con ESC |

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/components/productos/ProductoQuickCreateDialog.vue` | Formulario rápido de creación de producto. Props: `modelValue`. Emits: `update:modelValue`, `created(Producto)` |
| `docs/resultados/2026-06-08_quick-create-producto-desde-inventario.md` | Este documento |

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/components/inventario/MovimientoFormBase.vue` | 3 cambios: (1) import de `ProductoQuickCreateDialog`, (2) botón `add_box` junto al selector de producto, (3) `dialogCrearProducto` ref + `onProductoCreado` + instancia del diálogo al final del template |

### Detalle de cambios en `MovimientoFormBase.vue`

**Cambio 1 — Import:**
```typescript
import ProductoQuickCreateDialog from 'src/components/productos/ProductoQuickCreateDialog.vue'
```

**Cambio 2 — Template: selector envuelto en row con botón +:**
```html
<div class="row no-wrap items-center q-gutter-xs">
  <div class="col">
    <q-select ref="nuevaLineaProductoIdRef" ... />
  </div>
  <div class="col-auto">
    <q-btn round dense flat color="primary" icon="add_box" size="sm"
           @click="dialogCrearProducto = true">
      <q-tooltip>Crear nuevo producto</q-tooltip>
    </q-btn>
  </div>
</div>
```

**Cambio 3 — Script: estado + callback:**
```typescript
const dialogCrearProducto = ref(false)

function onProductoCreado(nuevoProducto): void {
  // Añade al inicio de opcionesProducto si no existe
  // Auto-selecciona en nuevaLinea con precios
}
```

**Cambio 4 — Template final: instancia del diálogo:**
```html
<ProductoQuickCreateDialog
  v-model="dialogCrearProducto"
  @created="onProductoCreado"
/>
```

---

## Pruebas Recomendadas

### Escenario 1 — Creación exitosa y selección automática
1. Ir a **Inventario → Entrada**.
2. En el panel "Agregar producto", hacer clic en el botón `+` (azul, junto al selector).
3. Completar: SKU único, Marca, Nombre, Unidad, Precio Venta/Final.
4. Clic en **Crear y seleccionar**.
5. **Verificar:**
   - El diálogo de creación se cierra.
   - El modal de movimiento permanece abierto.
   - El selector muestra el nuevo producto seleccionado.
   - Los campos Precio Venta y Precio Final del panel están precargados.

### Escenario 2 — Validaciones del formulario rápido
1. Intentar guardar con SKU vacío → debe mostrar error.
2. Intentar con SKU inválido (con espacios) → error de formato.
3. Intentar sin Marca → error requerido.
4. Intentar con Nombre < 3 caracteres → error longitud mínima.

### Escenario 3 — Producto disponible en movimiento posterior
1. Crear producto rápido "TEST-001".
2. Agregar la línea al movimiento.
3. Guardar el movimiento.
4. Abrir un nuevo movimiento.
5. **Verificar:** "TEST-001" aparece en el selector de producto (desde el store actualizado).

### Escenario 4 — Flujo completo sin pérdida de datos del movimiento
1. Registrar una entrada con 3 productos ya en la lista.
2. Hacer clic en `+` para crear un 4to producto.
3. Crear el producto.
4. **Verificar:** Los 3 productos anteriores siguen en la tabla del movimiento.

### Escenario 5 — Cancelar sin perder contexto
1. Abrir el diálogo de creación rápida.
2. Escribir datos parciales.
3. Hacer clic en **Cancelar** (o cerrar con X).
4. **Verificar:** El modal de movimiento sigue abierto, el panel de ingreso no cambió.

---

## Notas de Ejecución

- El componente `ProductoQuickCreateDialog` es **completamente independiente** del contexto en que
  se abre. Puede ser reutilizado desde POS (`ProductoBuscador.vue`) u Órdenes de Compra con
  mínimos ajustes (solo cambia cómo se maneja el emit `created`).

- La actualización de `opcionesProducto` es **local e inmediata**: se inserta el ítem sin esperar
  un refetch. El `productoStore` ya actualizó su caché interna mediante `pushItem()`, por lo que
  la próxima vez que se abra `useProduct()` en cualquier otra instancia, el producto estará
  disponible.

- El botón `add_box` usa `flat` (sin fondo) para no competir visualmente con el botón `+`
  (redondeado, color del tipo de movimiento) que agrega la línea a la tabla.

---

## Problemas Conocidos

Ninguno en la implementación actual. Posibles edge cases a vigilar:

- **SKU duplicado**: el backend rechazará la creación con error; el `notifyError` lo mostrará.
- **Marca no cargada**: si el `marcaStore` tarda en cargar, el select de marca podría aparecer
  vacío momentáneamente. El `:loading="marcaStore.loading"` lo indica visualmente.

---

## Recomendaciones

1. **Extender a Salidas y Transferencias**: ya está integrado en `MovimientoFormBase`, que es la
   base de los tres tipos. No requiere cambios adicionales.

2. **Reutilizar en POS**: agregar `ProductoQuickCreateDialog` a `ProductoBuscador.vue` siguiendo
   el mismo patrón (`v-model` + `@created`).

3. **Reutilizar en Órdenes de Compra**: mismo patrón en `OrdenCompraForm.vue`.

4. **Test unitario sugerido** (`ProductoQuickCreateDialog.spec.ts`):
   - Emite `created` con el producto correcto al enviar formulario válido.
   - Emite `update:modelValue` con `false` al cancelar.
   - No emite `created` si el formulario tiene errores de validación.

---

## Qué Implementar a Continuación

- **Phase B GAS optimization**: endpoint `bootstrapData` consolidado para reemplazar múltiples
  llamadas paralelas al login (pendiente, documentado en roadmap Phase B).
- **Reutilización en POS**: `ProductoBuscador.vue` puede incorporar el mismo botón `+` para
  crear productos al vuelo durante una venta.
- **Reutilización en Órdenes de Compra**: `OrdenCompraForm.vue` tiene un flujo similar al de
  movimientos y puede beneficiarse del mismo patrón.
