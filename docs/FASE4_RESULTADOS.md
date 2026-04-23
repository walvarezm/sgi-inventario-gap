# 📋 FASE 4 — Resultados de Ejecución
## SGI - Sistema de Gestión de Inventarios

---

## Título
**Fase 4: Consulta de Catálogo por Sucursal — Vista Tabla/Tarjetas, QR, Exportación PDF/Excel**

---

## Resumen

Implementación completa de la Fase 4. Se desarrolló la vista de Catálogo por Sucursal con dos modos de visualización (tabla y tarjetas), selector de sucursal por rol, búsqueda en tiempo real, filtros por categoría y stock, indicadores visuales de stock bajo/agotado, visualización de QR por producto y exportación a PDF (ventana de impresión) y CSV/Excel.

| Ítem | Estado |
|------|--------|
| Rama Git | `feature/fase4-catalogo` → merge a `dev` |
| Fecha de ejecución | 2026-04-16 |
| Versión | SGI v1.1.0 |
| Archivos creados | 4 |
| Archivos modificados | 0 |
| Tests escritos | 1 suite / 8 casos |

---

## Rama Git

```
main
 └── dev
       └── feature/fase4-catalogo  ← rama de trabajo Fase 4
```

**Commit:**
```
feat(fase4): catálogo por sucursal con tabla/tarjetas, QR, exportación PDF y CSV
```

**Merge a dev:**
```bash
git checkout dev
git merge feature/fase4-catalogo --no-ff
git push origin dev
```

---

## Checklist de la Fase 4

### Endpoint Backend
- [x] `getCatalogo` ya implementado en Fase 1 (`CatalogoService.gs`) — no requiere cambios
- [x] Cache de 5 minutos por sucursal en ScriptCache
- [x] Método `invalidarCache` disponible para forzar recarga

### Componentes de Catálogo
- [x] `frontend/src/components/catalogo/CatalogoTabla.vue`
  - Columnas: imagen, SKU+QR icon, Producto (nombre+marca+descripción), Precio Lista, Precio Venta, Stock
  - Indicador visual de stock (verde/naranja/gris según nivel)
  - Botón QR inline en la columna SKU
- [x] `frontend/src/components/catalogo/CatalogoTarjeta.vue`
  - Grid responsive 4 columnas en desktop, 2 en tablet, 1 en móvil
  - Badge de "Stock bajo" / "Sin stock" sobre la imagen
  - Botón QR flotante en la esquina de la imagen
  - Hover con elevación y transición suave
  - Skeleton loader mientras carga
  - Precios con tachado del precio de lista cuando hay diferencia

### Página de Catálogo
- [x] `frontend/src/pages/catalogo/CatalogoPage.vue` — reemplaza stub
- [x] Selector de sucursal habilitado solo para Admin/Supervisor
- [x] Auto-carga la sucursal asignada para roles no globales
- [x] Toggle tabla ↔ tarjetas persistido en composable
- [x] Búsqueda en tiempo real (SKU, marca, nombre, descripción)
- [x] Filtro por categoría con q-select
- [x] Filtros rápidos: "Solo stock bajo" y "Solo agotados"
- [x] KPIs: total productos, stock bajo, agotados
- [x] Botón "Recargar" que invalida el cache y recarga desde GAS
- [x] Dialog de QR con precio y stock del producto
- [x] **Exportar PDF** — genera HTML con tabla de precios y abre ventana de impresión
- [x] **Exportar Excel** — genera CSV con BOM UTF-8 para compatibilidad con Excel

### Tests
- [x] `tests/unit/pages/catalogo.spec.ts` — 8 casos de prueba

---

## Archivos Creados

```
frontend/src/components/catalogo/
  CatalogoTabla.vue      (vista tabla con indicadores visuales)
  CatalogoTarjeta.vue    (vista grid de tarjetas con hover)

frontend/src/pages/catalogo/
  CatalogoPage.vue       (reemplaza stub — página completa)

frontend/tests/unit/pages/
  catalogo.spec.ts       (8 casos de prueba)
```

---

## Archivos Modificados

Ninguno. La Fase 4 usa exclusivamente el endpoint `getCatalogo` implementado en la Fase 1.

---

## Pruebas de Test

### Suite — `catalogo.spec.ts`
| Test | Estado |
|------|--------|
| Filtra solo productos con stock bajo | ✅ |
| Detecta productos agotados (stock = 0) | ✅ |
| Filtra por categoría correctamente | ✅ |
| Búsqueda por descripción | ✅ |
| Filtros combinados categoría + búsqueda | ✅ |
| Toggle de vista tabla/tarjetas | ✅ |
| limpiarFiltros restablece todos los filtros | ✅ |
| totalProductos independiente de filtros | ✅ |

---

## Notas de Ejecución

### Acceso por rol
| Rol | Comportamiento en catálogo |
|-----|--------------------------|
| Administrador / Supervisor | Selector de sucursal habilitado, puede ver cualquier sucursal |
| Bodeguero / Vendedor / Contador | Sucursal fija (la asignada), selector deshabilitado |

### Exportación PDF
La exportación PDF utiliza la API nativa del navegador (`window.print()`). Genera una ventana emergente con una tabla HTML estilizada lista para imprimir. No requiere librerías externas.

### Exportación CSV/Excel
El archivo CSV incluye BOM UTF-8 (`\uFEFF`) para garantizar que Excel lo abra con acentos correctamente. El nombre del archivo incluye el nombre de la sucursal y la fecha.

### Cache del Catálogo
El catálogo usa cache en dos capas:
1. **ScriptCache (GAS)**: 5 minutos — evita lecturas repetidas de Sheets
2. **Pinia cataloStore**: 5 minutos por sucursal — evita llamadas repetidas al backend

El botón "Recargar" invalida ambas capas y fuerza la recarga completa.

---

## Problemas Conocidos

| # | Problema | Impacto | Solución |
|---|----------|---------|----------|
| 1 | Exportación PDF usa ventana emergente del navegador | Bajo | Algunos bloqueadores de popups pueden interferir. Alternativa futura: librería jsPDF |
| 2 | Las imágenes de Drive no se incluyen en el PDF impreso | Bajo | Limitación del navegador con imágenes cross-origin en print. Las URLs de Drive requieren autenticación |

---

## Recomendaciones

1. Probar la exportación PDF en los navegadores objetivo (Chrome, Edge, Firefox).
2. Verificar que los productos tienen imágenes cargadas en Drive para la vista tarjetas.
3. Configurar correctamente `VITE_QR_BASE_URL` para que el QR apunte al dominio de producción.

---

## Estado del Proyecto — Fases completadas

| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 1 | ✅ | Fundamentos, TypeScript, Auth, CRUD Sucursales |
| Fase 2 | ✅ | Productos con imagen Drive y QR |
| Fase 3 | ✅ | Inventario multi-sucursal, movimientos, alertas |
| Fase 4 | ✅ | Catálogo por sucursal — tabla/tarjetas, exportación |
| Fase 5 | ⏳ | Proveedores y Órdenes de Compra |
| Fase 6 | ⏳ | POS y Facturación |
| Fase 7 | ⏳ | Reportes y Dashboard |
| Fase 8 | ⏳ | Deploy y Pruebas |

---

## Cómo continuar — Fase 5

La **Fase 5** implementa la gestión de Proveedores y Órdenes de Compra:
- CRUD de proveedores (nombre, RUC/NIT, contacto, historial)
- Registro de órdenes de compra con detalle de productos
- Recepción de mercancía → entrada automática al inventario
- Historial de compras por proveedor

**Archivos a crear en Fase 5:**
```
backend/src/services/ProveedorService.gs
backend/src/services/OrdenCompraService.gs
frontend/src/services/proveedorService.ts
frontend/src/stores/proveedorStore.ts
frontend/src/components/proveedores/ProveedorForm.vue
frontend/src/pages/proveedores/ProveedoresPage.vue  (reemplaza stub)
```

---

*SGI v1.1.0 — Fase 4 completada — 2026-04-16*
