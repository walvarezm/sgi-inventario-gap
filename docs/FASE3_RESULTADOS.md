# 📋 FASE 3 — Resultados de Ejecución
## SGI - Sistema de Gestión de Inventarios

---

## Título
**Fase 3: Control de Inventario Multi-sucursal — Entradas, Salidas, Transferencias y Alertas**

---

## Resumen

Implementación completa de la Fase 3. Se desarrolló el control de stock por sucursal con registro de entradas, salidas y transferencias, historial de movimientos, alertas automáticas de stock mínimo (trigger diario GAS), y la página de inventario completa con visualización de stock y movimientos por sucursal.

| Ítem | Estado |
|------|--------|
| Rama Git | `feature/fase3-inventario` → merge a `dev` |
| Fecha de ejecución | 2026-04-16 |
| Versión | SGI v1.1.0 |
| Archivos creados | 10 |
| Archivos modificados | 1 (main.gs) |
| Tests escritos | 1 suite / 5 casos |

---

## Rama Git

```
main
 └── dev
       └── feature/fase3-inventario  ← rama de trabajo Fase 3
```

**Commit:**
```
feat(fase3): inventario multi-sucursal, entradas/salidas/transferencias, alertas stock
```

**Merge a dev:**
```bash
git checkout dev
git merge feature/fase3-inventario --no-ff
git push origin dev
```

---

## Checklist de la Fase 3

### Control de Stock por Sucursal
- [x] `backend/src/services/InventarioService.gs` — getStockPorSucursal, getStockProducto, getAlertasStock, _ajustarStock
- [x] Stock enriquecido con datos del producto (sku, nombre, marca, unidad, imagenUrl)
- [x] Creación automática de fila en `Inventario` si no existe para el par (producto, sucursal)

### Movimientos (Entradas, Salidas, Transferencias)
- [x] `backend/src/services/MovimientoService.gs` — getMovimientos, entrada, salida, transferir
- [x] Validación de stock suficiente antes de registrar salida
- [x] Validación de stock en origen antes de transferencia
- [x] Solo Admin/Supervisor pueden hacer transferencias entre sucursales
- [x] Referencia automática generada para transferencias (`TRANS-timestamp`)
- [x] Invalidación de cache del catálogo tras cada movimiento

### Alertas Automáticas de Stock
- [x] `backend/src/services/AlertaService.gs` — verificarStockMinimo, revisarTodoElInventario
- [x] Email automático al Admin cuando un producto cae por debajo del mínimo
- [x] Trigger diario: `instalarTriggerAlertas()` a las 8am
- [x] Función `revisarInventarioDiario()` revisa todo el inventario una vez al día

### Frontend — Componentes de Inventario
- [x] `frontend/src/components/inventario/EntradaForm.vue` — formulario con búsqueda de producto, stock actual informativo
- [x] `frontend/src/components/inventario/SalidaForm.vue` — validación de stock disponible en tiempo real
- [x] `frontend/src/components/inventario/TransferenciaForm.vue` — selección origen→destino con verificación de stock
- [x] `frontend/src/components/inventario/MovimientosTable.vue` — historial con filtro por tipo y badges de color

### Frontend — Página de Inventario
- [x] `frontend/src/pages/inventario/InventarioPage.vue` — reemplaza stub
- [x] Selector de sucursal (habilitado para Admin/Supervisor)
- [x] KPIs: total productos, alertas activas, total unidades
- [x] Banner de alertas de stock bajo con SKUs afectados
- [x] Tabs: Stock Actual | Movimientos
- [x] Stock con indicador visual (verde/rojo según umbral mínimo)

### Router Backend
- [x] `backend/src/main.gs` — rutas Fase 3 activas (inventario + movimientos)

### Tests
- [x] `tests/unit/composables/useInventario.spec.ts` — 5 casos de prueba

---

## Archivos Creados

```
backend/src/services/
  InventarioService.gs
  MovimientoService.gs
  AlertaService.gs

frontend/src/components/inventario/
  EntradaForm.vue
  SalidaForm.vue
  TransferenciaForm.vue
  MovimientosTable.vue

frontend/src/pages/inventario/
  InventarioPage.vue        (reemplaza stub)

frontend/tests/unit/composables/
  useInventario.spec.ts
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/main.gs` | Rutas getStockPorSucursal, registrarEntrada, registrarSalida, transferir activas |

---

## Pruebas de Test

### Suite — `useInventario.spec.ts`
| Test | Estado |
|------|--------|
| Estado inicial vacío | ✅ |
| cargarStock popula el array | ✅ |
| registrarEntrada llama al servicio | ✅ |
| registrarSalida llama al servicio | ✅ |
| transferir llama al servicio | ✅ |

---

## Notas de Ejecución

### Instalación del Trigger de Alertas
Ejecutar **una sola vez** desde el editor GAS:
```javascript
instalarTriggerAlertas()
```
Esto instala un trigger que ejecuta `revisarInventarioDiario()` cada día a las 8am.

### Prerrequisitos de la hoja `Inventario`
Para que el sistema funcione correctamente en producción, la hoja `Inventario` debe tener al menos una fila por cada par `(producto_id, sucursal_id)` activo. Si no existe, `_ajustarStock` la crea automáticamente en la primera entrada.

### Acceso a Transferencias
Solo usuarios con rol `ADMINISTRADOR` o `SUPERVISOR` pueden realizar transferencias entre sucursales. El botón está deshabilitado para otros roles en la UI.

---

## Problemas Conocidos

| # | Problema | Impacto | Solución |
|---|----------|---------|----------|
| 1 | Sin trigger instalado, las alertas no se envían automáticamente | Medio | Ejecutar `instalarTriggerAlertas()` una vez en GAS |
| 2 | `MailApp.sendEmail` tiene cuota diaria de 100 emails en cuentas gratuitas | Bajo | Usar cuenta Workspace o agrupar alertas en un solo email diario (ya implementado) |
| 3 | La página de inventario hace 2 llamadas paralelas al backend al cargar | Bajo | `Promise.all` ya implementado para minimizar tiempo total |

---

## Recomendaciones

1. Instalar el trigger de alertas inmediatamente después del deploy.
2. Configurar `ADMIN_EMAIL` en Script Properties para recibir alertas.
3. Verificar que la hoja `Inventario` tenga las columnas exactas definidas en `01_estructura_sheets.md`.
4. Agregar datos iniciales de inventario con `stock_actual = 0` para todos los productos activos antes del lanzamiento.

---

## Cómo continuar — Fase 4

La **Fase 4** implementa la **Consulta de Catálogo por Sucursal**:
- Vista de catálogo con tabla + tarjetas toggle
- Selector de sucursal para Admin/Supervisor
- Búsqueda en tiempo real por código, marca o descripción
- Filtro por categoría
- Indicadores visuales de stock bajo
- Exportación a PDF/Excel
- Ícono QR clickeable para ampliar el QR

**Archivos a crear en Fase 4:**
```
frontend/src/components/catalogo/CatalogoTabla.vue
frontend/src/components/catalogo/CatalogoTarjeta.vue
frontend/src/pages/catalogo/CatalogoPage.vue  (reemplaza stub)
```

---

*SGI v1.1.0 — Fase 3 completada — 2026-04-16*
