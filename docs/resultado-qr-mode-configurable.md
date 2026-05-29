# Resultado de Ejecución — QR Mode Configurable (texto / enlace)

## Resumen

Se implementó la funcionalidad para que el modo de generación del código QR de productos
sea configurable mediante la variable de entorno `VITE_QR_MODE` en el archivo `.env`.

El sistema ahora soporta dos modos:
- **`texto`** _(existente, ahora explícito)_: el QR codifica los datos del producto en texto
  plano (SKU, marca, nombre, precio catálogo, precio venta).
- **`enlace`** _(nuevo)_: el QR codifica la URL de detalle del producto con el formato
  `{VITE_QR_BASE_URL}/producto/{sku}`.

El cambio de modo no requiere modificar ningún archivo de código; basta con editar
`VITE_QR_MODE` en `.env.local` o `.env.production` y recompilar.

---

## Rama Git

- **Repositorio:** `sgi-inventario-gap`
- **Rama destino:** `dev` (deriva de `main`)
- **Commit sugerido:**
  ```
  feat(productos): modo QR configurable via VITE_QR_MODE (texto | enlace)
  ```

---

## Checklist

- [x] Variable `VITE_QR_MODE` agregada a `.env.local` y `.env.example`
- [x] Tipado de `VITE_QR_MODE` declarado en `env.d.ts`
- [x] `useQR.ts` refactorizado con funciones `buildQrEnlace`, `buildQrTexto`, `buildQrContent` y
      helper exportable `getQrMode()`
- [x] `ProductoQR.vue` actualizado: muestra chip indicador del modo activo y preview del enlace
- [x] `ProductoForm.vue` actualizado:
  - Pasa prop `:datos` al componente `ProductoQR` para modo texto
  - En modo enlace: oculta el campo "Contenido del QR" y muestra el banner con preview del enlace
  - En modo enlace: guarda la URL construida como `qrCode` al hacer submit
  - En modo texto: mantiene el comportamiento original con auto-generación de texto
- [x] Tipos auxiliares `QrMode` y `QrProductoDatos` exportados desde `useQR.ts`
- [x] Documentación inline (JSDoc) en todas las funciones modificadas

---

## Detalles de la Implementación

### Variable de entorno `VITE_QR_MODE`

```env
# Valores aceptados: 'texto' | 'enlace'
# Default si no se define: 'texto'
VITE_QR_MODE=texto
```

El helper `getQrMode()` aplica un fallback seguro: si la variable no está definida o tiene
un valor no reconocido, retorna `'texto'` para preservar compatibilidad con el comportamiento
existente.

### Lógica de construcción del contenido QR

| Modo     | Función principal    | Contenido generado                                          |
|----------|---------------------|-------------------------------------------------------------|
| `texto`  | `buildQrTexto()`    | `Código: A001 \| Marca: Nike \| Producto: Zapato \| ...`   |
| `enlace` | `buildQrEnlace()`   | `http://localhost:9000/producto/A001`                       |

La función `buildQrContent()` es el punto de entrada unificado que delega internamente
según el modo configurado.

### Flujo en `ProductoForm.vue` según modo

**Modo `texto` (comportamiento anterior, ahora explícito):**
1. El campo "Contenido del QR" es visible y editable.
2. El watcher auto-genera el texto del QR cuando cambian SKU, marca, nombre o precios.
3. Al guardar: se limpian saltos de línea y se almacena el texto en `qrCode`.

**Modo `enlace` (nuevo):**
1. El campo "Contenido del QR" queda oculto.
2. Un banner informativo muestra el enlace que se generará (`{VITE_QR_BASE_URL}/producto/{sku}`).
3. Al guardar: `qrCode` almacena la URL construida con `buildQrEnlace(sku)`.
4. El componente `ProductoQR` genera el QR directamente desde el SKU, sin depender del campo `qrCode`.

### Chip indicador en `ProductoQR.vue`

Se añadió un `q-chip` que muestra el modo activo (`QR Texto` o `QR Enlace`) con ícono
y tooltip descriptivo para facilitar la verificación visual durante el uso del sistema.

---

## Archivos Creados

_Ninguno. Solo se modificaron archivos existentes._

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/env.d.ts` | Agregado tipo `VITE_QR_MODE: 'texto' \| 'enlace'` en `ImportMetaEnv` |
| `frontend/src/composables/useQR.ts` | Refactorizado: nuevas funciones `buildQrEnlace`, `buildQrTexto`, `buildQrContent`; helper `getQrMode()` exportado; tipos `QrMode` y `QrProductoDatos` exportados |
| `frontend/src/components/productos/ProductoQR.vue` | Chip indicador de modo, prop `:datos` recibida, lógica de generación separada por modo |
| `frontend/src/components/productos/ProductoForm.vue` | Pasa `:datos` a `ProductoQR`; campo QR oculto en modo enlace; banner preview enlace; submit adaptado por modo |
| `frontend/.env.local` | Agregada variable `VITE_QR_MODE=texto` con comentario explicativo |
| `frontend/.env.example` | Agregada variable `VITE_QR_MODE=texto` con comentario explicativo |

---

## Pruebas de Test

### Pruebas manuales recomendadas

#### Escenario 1 — Modo `texto` (valor por defecto)
1. Configurar `.env.local`: `VITE_QR_MODE=texto`
2. Reiniciar el servidor de desarrollo (`quasar dev`).
3. Abrir la ficha de un producto existente.
4. Verificar que el chip del QR muestra **"QR Texto"** (color azul-gris).
5. Verificar que el campo "Contenido del QR" es visible y contiene los datos del producto.
6. Cambiar el nombre del producto y verificar que el campo QR se actualiza automáticamente.
7. Guardar y comprobar que el campo `qrCode` en Sheets contiene el texto plano (sin saltos de línea).
8. Escanear el QR generado y verificar que el contenido es texto legible con los datos del producto.

#### Escenario 2 — Modo `enlace`
1. Configurar `.env.local`: `VITE_QR_MODE=enlace`
2. Reiniciar el servidor de desarrollo.
3. Abrir la ficha de un producto con SKU, p. ej. `ZAPT-001`.
4. Verificar que el chip del QR muestra **"QR Enlace"** (color teal).
5. Verificar que el banner muestra: `http://localhost:9000/producto/ZAPT-001`.
6. Verificar que el campo "Contenido del QR" **no es visible**.
7. Guardar y comprobar que el campo `qrCode` en Sheets contiene la URL completa.
8. Escanear el QR y verificar que el escáner abre/muestra la URL del producto.

#### Escenario 3 — Variable no definida (fallback)
1. Eliminar `VITE_QR_MODE` del `.env.local`.
2. Reiniciar el servidor de desarrollo.
3. Verificar que el sistema se comporta como modo `texto` sin errores.

### Prueba unitaria sugerida

```typescript
// tests/unit/useQR.spec.ts
import { describe, it, expect, vi } from 'vitest'

describe('useQR — buildQrEnlace', () => {
  it('construye la URL correcta con el SKU', async () => {
    vi.stubEnv('VITE_QR_BASE_URL', 'https://sgi.tudominio.com')
    const { useQR } = await import('src/composables/useQR')
    const { buildQrEnlace } = useQR()
    expect(buildQrEnlace('ZAPT-001')).toBe('https://sgi.tudominio.com/producto/ZAPT-001')
  })
})

describe('useQR — getQrMode fallback', () => {
  it('retorna texto si VITE_QR_MODE no está definido', async () => {
    vi.stubEnv('VITE_QR_MODE', undefined)
    const { getQrMode } = await import('src/composables/useQR')
    expect(getQrMode()).toBe('texto')
  })
})
```

---

## Notas de Ejecución

- El modo QR se evalúa en **tiempo de build** mediante `import.meta.env`. No es un valor
  reactivo en runtime; para cambiarlo se debe editar el `.env` y recompilar.
- En modo `enlace`, la URL generada depende de `VITE_QR_BASE_URL`. En desarrollo local
  será `http://localhost:9000/producto/{sku}`. En producción debe apuntar al dominio real.
- La página `/producto/{sku}` referenciada por el enlace QR **no está implementada aún**
  (ver sección "Cómo y qué implementar").

---

## Problemas

- Ningún problema crítico identificado.
- El import de `positiveNumber` en `ProductoForm.vue` fue eliminado (no se usaba);
  si se necesita en otro contexto, está disponible en `src/utils/validators.ts`.

---

## Recomendaciones

1. **Producción:** Configurar `VITE_QR_MODE=enlace` y `VITE_QR_BASE_URL=https://sgi.tudominio.com`
   en `.env.production` para aprovechar la navegabilidad del QR.
2. **Migración de datos existentes:** Los productos creados anteriormente en modo `texto`
   tendrán su `qrCode` con texto plano. Si se cambia a modo `enlace`, al editar y guardar
   cualquier producto se sobrescribirá con la URL. Considerar un script de migración masiva
   en GAS si se quiere actualizar todos los registros de una vez.
3. **Página de detalle:** Implementar la ruta `/producto/:sku` para que los QR en modo
   enlace sean funcionales (ver sección siguiente).
4. **Tests:** Agregar las pruebas unitarias sugeridas en `tests/unit/useQR.spec.ts`.

---

## Cómo y Qué Implementar a Continuación

### 1. Página pública de detalle de producto (`/producto/:sku`)

Para que el modo `enlace` sea completamente funcional, se debe crear la vista que se abre
al escanear el QR. Esta página debe ser de **acceso público** (sin autenticación).

**Archivos a crear:**
- `src/pages/productos/detalle-producto.vue` — Vista pública con los datos del producto.

**Ruta a agregar en `src/router/index.ts`:**
```typescript
{
  path: '/producto/:sku',
  component: () => import('pages/productos/detalle-producto.vue'),
  meta: { public: true }
}
```

**Datos a mostrar en la vista pública:**
- Imagen del producto
- SKU, marca, nombre, descripción
- Precio ofrecido y precio final
- Stock disponible (opcional, según política del negocio)
- Código QR del producto

**Guard a actualizar (`src/router/guards.ts`):**
Asegurarse de que las rutas con `meta.public = true` no requieran autenticación.

### 2. Script de migración de `qrCode` en GAS (opcional)

Si se decide cambiar a modo `enlace` en producción con datos existentes:

```javascript
// backend: MigracionQrMode.gs
function migrarQrCodeAEnlace() {
  const baseUrl = 'https://sgi.tudominio.com'
  const sheet = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  ).getSheetByName('Productos')
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const skuIdx = headers.indexOf('sku')
  const qrIdx = headers.indexOf('qr_code')

  for (let i = 1; i < data.length; i++) {
    const sku = data[i][skuIdx]
    if (sku) {
      sheet.getRange(i + 1, qrIdx + 1).setValue(`${baseUrl}/producto/${sku}`)
    }
  }
  Logger.log('Migración completada')
}
```

### 3. Variables en `.env.production`

```env
VITE_QR_BASE_URL=https://sgi.tudominio.com
VITE_QR_MODE=enlace
```

---

_Generado: 2026-05-28 — SGI v1.4.3 — Rama: dev_
