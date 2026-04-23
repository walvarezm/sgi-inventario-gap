# 📋 FASE 2 — Resultados de Ejecución
## SGI - Sistema de Gestión de Inventarios

---

## Título
**Fase 2: Productos con QR, Imagen y Gestión de Categorías**

---

## Resumen

Implementación completa de la Fase 2 del proyecto SGI. Se desarrolló el CRUD completo de Productos incluyendo subida de imágenes a Google Drive, generación de códigos QR en el frontend, gestión de Categorías y la página de listado con filtros avanzados. El módulo de Productos reemplaza el stub de la Fase 1.

| Ítem | Estado |
|------|--------|
| Rama Git | `feature/fase2-productos` → merge a `dev` |
| Fecha de ejecución | 2026-04-15 |
| Versión | SGI v1.1.0 |
| Archivos creados | 12 |
| Archivos modificados | 1 (main.gs) |
| Tests escritos | 1 suite / 9 casos |

---

## Rama Git

```
main
 └── dev
       └── feature/fase2-productos  ← rama de trabajo Fase 2
```

**Commit:**
```
feat(fase2): CRUD productos con imagen Drive, generación QR, gestión de categorías
```

**Merge a dev:**
```bash
git checkout dev
git merge feature/fase2-productos --no-ff
git push origin dev
```

---

## Checklist de la Fase 2

### CRUD de Productos
- [x] `backend/src/services/ProductoService.gs` — getAll, getById, getBySku, create, update, remove
- [x] Validación de SKU único en create/update
- [x] Soft-delete (activo=false) en remove
- [x] Invalidación de caches de catálogo al modificar productos
- [x] `frontend/src/services/productoService.ts` — actualizado con subirImagen
- [x] `frontend/src/stores/productoStore.ts` — CRUD + bySku map
- [x] `frontend/src/pages/productos/ProductosPage.vue` — reemplaza stub

### Subida de Imágenes a Google Drive
- [x] `backend/src/services/ProductoService.gs#subirImagen` — upload a Drive
- [x] `frontend/src/components/productos/ProductoImagen.vue` — upload con resize 800×800
- [x] `frontend/src/utils/qrUtils.ts` — fileToBase64, resizeImage, validateImageFile
- [x] Imágenes accesibles con URL pública Drive

### Generación de Código QR
- [x] `frontend/src/components/productos/ProductoQR.vue` — genera + descarga QR
- [x] `frontend/src/composables/useQR.ts` — generarDataUrl, buildQrContent, descargarQR
- [x] QR se genera en el cliente con la librería `qrcode`
- [x] Contenido QR configurable (SKU por defecto, URL personalizable)
- [x] Descarga como PNG desde el diálogo QR

### Gestión de Categorías
- [x] `backend/src/services/CategoriaService.gs` — getAll (con cache 10min), create, update
- [x] `frontend/src/services/categoriaService.ts`
- [x] `frontend/src/stores/categoriaStore.ts` — con lazy load (carga una sola vez)

### Actualización del Router Backend
- [x] `backend/src/main.gs` — rutas Fase 2 activas (categorías + productos)
- [x] Stubs Fase 1 eliminados, stubs Fase 3+ mantenidos

### Tests
- [x] `tests/unit/stores/productoStore.spec.ts` — 9 casos de prueba

---

## Archivos Creados

```
backend/src/services/
  CategoriaService.gs
  ProductoService.gs

frontend/src/services/
  categoriaService.ts

frontend/src/stores/
  categoriaStore.ts

frontend/src/components/productos/
  ProductoImagen.vue     (upload + resize)
  ProductoQR.vue         (generación + descarga)
  ProductoForm.vue       (formulario completo)

frontend/src/pages/productos/
  ProductosPage.vue      (reemplaza stub Fase 1)

frontend/tests/unit/stores/
  productoStore.spec.ts
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/main.gs` | Rutas getCategorias, getProductos, subirImagenProducto activadas |

---

## Pruebas de Test

### Suite — `productoStore.spec.ts`
| Test | Estado |
|------|--------|
| Estado inicial vacío | ✅ |
| fetchAll carga productos | ✅ |
| activos filtra correctamente | ✅ |
| bySku permite acceso por SKU | ✅ |
| getById retorna producto correcto | ✅ |
| findBySku retorna producto correcto | ✅ |
| create agrega al array | ✅ |
| select / deselect | ✅ |
| remove elimina del array | ✅ |

**Ejecutar tests:**
```bash
cd frontend
npx vitest run
```

---

## Notas de Ejecución

### Hoja `Categorias` en Google Sheets
Para que el módulo funcione, crear la hoja `Categorias` con encabezados:
```
id  nombre  descripcion  activo  fecha_creacion
```
Datos iniciales sugeridos:
```
[UUID]  Calzado     Zapatos y sandalias   TRUE  2026-01-01
[UUID]  Ropa        Prendas de vestir     TRUE  2026-01-01
[UUID]  Accesorios  Gorras, bolsos, etc.  TRUE  2026-01-01
[UUID]  Deportes    Equipamiento sport    TRUE  2026-01-01
```

### Requisitos para subida de imágenes
- `DRIVE_FOLDER_IMAGENES` debe estar configurado en Script Properties
- La carpeta Drive debe tener acceso público con enlace (visualizador)
- Imágenes se redimensionan en el cliente a máximo 800×800px antes de subir

### Generación de QR
- La librería `qrcode` ya está en `package.json` desde la Fase 1
- El contenido por defecto del QR es el SKU del producto
- La URL del QR usa `VITE_QR_BASE_URL` del `.env.local`

---

## Problemas Conocidos

| # | Problema | Impacto | Solución |
|---|----------|---------|----------|
| 1 | La hoja `Categorias` debe crearse manualmente | Bajo | Agregar al script `02_datos_iniciales.gs` |
| 2 | Sin `DRIVE_FOLDER_IMAGENES`, la subida falla con mensaje claro | Bajo | Configurar en Script Properties antes del deploy |
| 3 | `qrcode` requiere `npm install` para los tests | Bajo | Ejecutar `npm install` antes de `npx vitest run` |

---

## Recomendaciones

1. Crear la hoja `Categorias` y cargar datos iniciales antes de probar el módulo.
2. Verificar `DRIVE_FOLDER_IMAGENES` en Script Properties del GAS.
3. Probar la subida de imágenes con archivos < 5MB en formato JPG/PNG/WebP.
4. El campo QR en el formulario puede dejarse vacío — se auto-completa con el SKU.

---

## Cómo continuar — Fase 3

La **Fase 3** implementa el Control de Inventario Multi-sucursal:
- Entradas y salidas de stock por sucursal
- Transferencias entre sucursales
- Historial de movimientos con filtros
- Sistema de alertas de stock mínimo (trigger Apps Script)

**Archivos a crear en Fase 3:**
```
backend/src/services/InventarioService.gs
backend/src/services/MovimientoService.gs
backend/src/services/AlertaService.gs
frontend/src/pages/inventario/InventarioPage.vue  (reemplaza stub)
frontend/src/components/inventario/EntradaForm.vue
frontend/src/components/inventario/SalidaForm.vue
frontend/src/components/inventario/TransferenciaForm.vue
frontend/src/components/inventario/MovimientosTable.vue
```

**Comando Git para Fase 3:**
```bash
git checkout dev
git checkout -b feature/fase3-inventario
```

---

*SGI v1.1.0 — Fase 2 completada — 2026-04-15*
