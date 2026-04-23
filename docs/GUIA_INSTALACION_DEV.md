# 🛠️ Guía de Instalación — Ambiente de Desarrollo
## SGI - Sistema de Gestión de Inventarios v1.1.0

> Documento completo para configurar el entorno de desarrollo desde cero.
> Cubre: herramientas, Google Workspace, base de datos, backend GAS y frontend Vue 3 + TypeScript + Quasar.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Configurar Google Workspace](#3-configurar-google-workspace)
4. [Crear la base de datos en Google Sheets](#4-crear-la-base-de-datos-en-google-sheets)
5. [Configurar el backend (Google Apps Script)](#5-configurar-el-backend-google-apps-script)
6. [Publicar la Web App de GAS](#6-publicar-la-web-app-de-gas)
7. [Configurar el frontend](#7-configurar-el-frontend)
8. [Variables de entorno del frontend](#8-variables-de-entorno-del-frontend)
9. [Ejecutar en modo desarrollo](#9-ejecutar-en-modo-desarrollo)
10. [Verificar TypeScript y ESLint](#10-verificar-typescript-y-eslint)
11. [Ejecutar los tests](#11-ejecutar-los-tests)
12. [Flujo de trabajo Git](#12-flujo-de-trabajo-git)
13. [Solución de problemas comunes](#13-solución-de-problemas-comunes)
14. [Estructura del proyecto](#14-estructura-del-proyecto)
15. [Comandos de referencia rápida](#15-comandos-de-referencia-rápida)

---

## 1. Requisitos previos

### 1.1 Software a instalar en tu máquina

| Herramienta | Versión mínima | Descarga | Verificación |
|-------------|---------------|----------|--------------|
| **Node.js** | 18.x LTS | [nodejs.org](https://nodejs.org) | `node --version` |
| **npm** | 9.x | Incluido con Node.js | `npm --version` |
| **Git** | 2.x | [git-scm.com](https://git-scm.com) | `git --version` |
| **VS Code** (recomendado) | cualquiera | [code.visualstudio.com](https://code.visualstudio.com) | — |

> **Windows:** Se recomienda usar **Git Bash** o **PowerShell** para los comandos.
> **macOS/Linux:** Terminal estándar.

### 1.2 Instalar herramientas globales de Node.js

```bash
# Quasar CLI — framework del frontend
npm install -g @quasar/cli

# Clasp — CLI para Google Apps Script
npm install -g @google/clasp

# Verificar instalaciones
quasar --version     # debe mostrar @quasar/cli vX.X.X
clasp --version      # debe mostrar clasp/X.X.X
```

### 1.3 Cuenta de Google requerida

Necesitas una cuenta de Google con acceso a:
- **Google Sheets** — base de datos del sistema
- **Google Drive** — almacenamiento de imágenes y PDFs
- **Google Apps Script** — backend del sistema

> Una cuenta de Gmail estándar es suficiente para desarrollo.
> Para producción se recomienda una cuenta Google Workspace.

### 1.4 Extensiones recomendadas para VS Code

Instalar desde el Marketplace o con los IDs indicados:

```
Vue.volar                    → Vue Language Features (Volar)
vue.vscode-typescript-vue-plugin → TypeScript Vue Plugin
dbaeumer.vscode-eslint       → ESLint
esbenp.prettier-vscode       → Prettier
bradlc.vscode-tailwindcss    → (opcional, para autocompletado CSS)
```

---

## 2. Clonar el repositorio

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/sgi-inventario-gap.git

# Entrar al directorio
cd sgi-inventario-gap

# Verificar la estructura
ls -la
# Debe mostrar: backend/  base-datos/  docs/  frontend/  README.md
```

### Verificar ramas disponibles

```bash
git branch -a
# Debe mostrar: main, dev (y feature/* si hay trabajo en curso)
```

### Cambiar a la rama de desarrollo

```bash
git checkout dev
git status
# On branch dev — nothing to commit
```

---

## 3. Configurar Google Workspace

### 3.1 Crear carpetas en Google Drive

1. Abre [drive.google.com](https://drive.google.com) con tu cuenta de Google.
2. Crea la siguiente estructura de carpetas:

```
Mi unidad/
└── SGI-Dev/
    ├── sgi-imagenes/      ← imágenes de productos
    └── sgi-facturas/      ← PDFs de facturas
```

3. **Copia el ID de cada carpeta** desde la URL del navegador:
   ```
   https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNo
                                            ↑ esto es el ID
   ```

> Guarda estos IDs — los necesitarás en el Paso 5.

### 3.2 Configurar permisos de las carpetas (para desarrollo)

Para que las imágenes sean accesibles públicamente durante el desarrollo:

1. Clic derecho en la carpeta `sgi-imagenes` → **Compartir**
2. En "Acceso general" → **Cualquier persona con el enlace** → **Visualizador**
3. Repetir para `sgi-facturas`

---

## 4. Crear la base de datos en Google Sheets

### 4.1 Crear el Spreadsheet

1. Abre [sheets.google.com](https://sheets.google.com).
2. Crea un nuevo Spreadsheet.
3. Nómbralo: `SGI - Base de Datos Dev`.
4. **Copia el ID del Spreadsheet** desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNo_xyz/edit
                                           ↑ esto es el SPREADSHEET_ID
   ```

### 4.2 Crear las hojas (pestañas)

Crea **exactamente 12 hojas** con los siguientes nombres (respetar mayúsculas y tildes):

| # | Nombre de la hoja |
|---|-------------------|
| 1 | `Categorias` |
| 2 | `Productos` |
| 3 | `Sucursales` |
| 4 | `Inventario` |
| 5 | `Movimientos` |
| 6 | `Proveedores` |
| 7 | `OrdenesCompra` |
| 8 | `DetalleOrdenCompra` |
| 9 | `Facturas` |
| 10 | `DetalleFactura` |
| 11 | `Usuarios` |
| 12 | `Config` |
| 13 | `LogAcciones` |

### 4.3 Configurar los encabezados de cada hoja

Copia y pega cada fila en la **Fila 1** de la hoja correspondiente.
Los valores están separados por tabulaciones — al pegar en Sheets cada valor irá a una columna.

#### Hoja: `Categorias`
```
id	nombre	descripcion	activo	fecha_creacion
```

#### Hoja: `Productos`
```
id	sku	marca	nombre	descripcion	categoria_id	unidad	precio_compra	precio_ofrecido	precio_final	stock_minimo	imagen_url	qr_code	activo	fecha_creacion
```

#### Hoja: `Sucursales`
```
id	nombre	direccion	ciudad	telefono	email	responsable_id	activo	fecha_creacion
```

#### Hoja: `Inventario`
```
id	producto_id	sucursal_id	stock_actual	fecha_actualizacion
```

#### Hoja: `Movimientos`
```
id	tipo	producto_id	sucursal_origen	sucursal_destino	cantidad	referencia	usuario_id	fecha	notas
```

#### Hoja: `Proveedores`
```
id	nombre	ruc_nit	contacto	telefono	email	direccion	ciudad	notas	activo	fecha_creacion
```

#### Hoja: `OrdenesCompra`
```
id	numero	proveedor_id	sucursal_id	fecha_emision	fecha_estimada	estado	subtotal	total	notas	usuario_id
```

#### Hoja: `DetalleOrdenCompra`
```
id	orden_id	producto_id	cantidad_pedida	cantidad_recibida	precio_unitario	subtotal
```

#### Hoja: `Facturas`
```
id	numero	tipo	cliente	sucursal_id	fecha	subtotal	impuesto	total	estado	usuario_id	notas
```

#### Hoja: `DetalleFactura`
```
id	factura_id	producto_id	cantidad	precio_unitario	subtotal
```

#### Hoja: `Usuarios`
```
id	nombre	email	password_hash	rol	sucursal_id	activo	fecha_creacion
```

#### Hoja: `Config`
```
clave	valor	descripcion
```

#### Hoja: `LogAcciones`
```
id	usuario_id	accion	modulo	sucursal_id	detalle	fecha
```

### 4.4 Cargar datos iniciales manualmente

#### En la hoja `Config` — ingresa estas 4 filas:

| clave | valor | descripcion |
|-------|-------|-------------|
| `app_nombre` | `SGI - Inventarios` | Nombre del sistema |
| `app_version` | `1.1.0` | Versión actual |
| `iva_porcentaje` | `13` | Porcentaje de IVA (Bolivia) |
| `moneda` | `BOB` | Moneda por defecto |

#### En la hoja `Sucursales` — ingresa la primera sucursal:

> Genera un UUID en [uuidgenerator.net](https://www.uuidgenerator.net/) para el campo `id`.

| id | nombre | direccion | ciudad | telefono | email | responsable_id | activo | fecha_creacion |
|----|--------|-----------|--------|----------|-------|----------------|--------|----------------|
| `[UUID-S1]` | `Casa Matriz` | `Av. Principal 123` | `La Paz` | `591-2-0000000` | `admin@sgi.bo` | *(vacío)* | `TRUE` | `2026-01-01T00:00:00.000Z` |

#### En la hoja `Categorias` — ingresa categorías de prueba:

| id | nombre | descripcion | activo | fecha_creacion |
|----|--------|-------------|--------|----------------|
| `[UUID-C1]` | `Calzado` | `Zapatos y sandalias` | `TRUE` | `2026-01-01T00:00:00.000Z` |
| `[UUID-C2]` | `Ropa` | `Prendas de vestir` | `TRUE` | `2026-01-01T00:00:00.000Z` |
| `[UUID-C3]` | `Accesorios` | `Gorras, bolsos, etc.` | `TRUE` | `2026-01-01T00:00:00.000Z` |

---

## 5. Configurar el backend (Google Apps Script)

### 5.1 Autenticarse con Clasp

```bash
# Iniciar sesión con tu cuenta de Google
clasp login

# Esto abrirá el navegador — acepta los permisos solicitados
# Al terminar verás: "Logged in! ✅"
```

### 5.2 Crear el proyecto de Apps Script

```bash
# Entrar al directorio backend
cd backend

# Crear el proyecto GAS y vincularlo
clasp create --title "SGI-Backend-Dev" --type webapp --rootDir ./src

# Esto crea el archivo .clasp.json con el scriptId
cat .clasp.json
# Debe mostrar: { "scriptId": "XXXXXXXXXX", "rootDir": "./src" }
```

> **Guarda el `scriptId`** — lo necesitarás para acceder al editor de GAS.

### 5.3 Subir el código al script

```bash
# Desde el directorio backend/
clasp push

# Debería mostrar:
# └─ backend/src/main.gs
# └─ backend/src/auth.gs
# └─ backend/src/config.gs
# └─ backend/src/db/sheets.gs
# └─ backend/src/services/SucursalService.gs
# ... (12 archivos en total)
# Pushed X files.
```

### 5.4 Abrir el editor de Apps Script

```bash
# Abrir en el navegador el editor GAS
clasp open
```

Esto abre `https://script.google.com/d/TU_SCRIPT_ID/edit` en el navegador.

### 5.5 Configurar Script Properties (variables de entorno del backend)

En el editor de GAS:
1. Menú **Proyecto** (ícono de engranaje ⚙️) → **Propiedades del proyecto**
2. Pestaña **Propiedades del script**
3. Agregar cada propiedad con su valor:

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| `SPREADSHEET_ID` | `ID del paso 4.1` | ID del Google Sheet |
| `JWT_SECRET` | `dev-secret-cambiar-en-produccion-32chars` | Clave para firmar tokens |
| `ADMIN_EMAIL` | `tu-email@gmail.com` | Email para alertas de stock |
| `DRIVE_FOLDER_IMAGENES` | `ID de sgi-imagenes del paso 3.1` | Carpeta de imágenes |
| `DRIVE_FOLDER_FACTURAS` | `ID de sgi-facturas del paso 3.1` | Carpeta de facturas |
| `ENV` | `development` | Ambiente actual |

> **Importante:** El `JWT_SECRET` para desarrollo puede ser cualquier cadena de al menos 32 caracteres.
> Para producción debe ser una cadena aleatoria criptográficamente segura.

### 5.6 Crear el usuario Administrador

En el editor de GAS, abre la consola (Ctrl+Enter o menú **Ver → Registros**).

Crea un nuevo script temporal `setup.gs` con el siguiente contenido y ejecútalo **una sola vez**:

```javascript
function crearAdminInicial() {
  // ⚠️ EJECUTAR UNA SOLA VEZ — luego eliminar este archivo
  const secret = PropertiesService.getScriptProperties().getProperty('JWT_SECRET')
  const password = 'Admin2026!'  // ← cambia esto

  // Calcular hash SHA-256 de la contraseña
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + secret
  )
  const hash = bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('')

  // Obtener el ID de la primera sucursal
  const ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  )
  const hojaSucursales = ss.getSheetByName('Sucursales')
  const sucursalId = hojaSucursales.getRange(2, 1).getValue()

  // Insertar el administrador
  const hojaUsuarios = ss.getSheetByName('Usuarios')
  hojaUsuarios.appendRow([
    Utilities.getUuid(),    // id
    'Administrador SGI',    // nombre
    'admin@sgi.bo',         // email ← cambia por tu email
    hash,                   // password_hash
    'ADMINISTRADOR',        // rol
    'ALL',                  // sucursal_id
    true,                   // activo
    new Date().toISOString() // fecha_creacion
  ])

  Logger.log('✅ Admin creado con éxito')
  Logger.log('Email: admin@sgi.bo')
  Logger.log('Password: Admin2026!')
  Logger.log('⚠️ Elimina este script y cambia la contraseña')
}
```

Ejecuta `crearAdminInicial` desde el menú **Ejecutar**.
Verifica en la hoja `Usuarios` que se creó la fila.
**Elimina el archivo `setup.gs`** después de ejecutarlo.

---

## 6. Publicar la Web App de GAS

### 6.1 Crear el deploy de desarrollo

En el editor de GAS:
1. Menú **Implementar** → **Nueva implementación**
2. Tipo: **Aplicación web**
3. Configurar:
   - Descripción: `SGI Dev v1.1.0`
   - Ejecutar como: `Yo (tu-email@gmail.com)`
   - Quién tiene acceso: `Cualquier persona`
4. Clic en **Implementar**
5. **Copia la URL** generada — tiene el formato:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```

> Esta URL es tu `VITE_GAS_API_URL` para el paso 8.

### 6.2 Probar el backend

Abre la siguiente URL en tu navegador (reemplaza con tu URL real):

```
https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec?action=ping
```

Deberías ver una respuesta JSON:
```json
{
  "success": true,
  "message": "SGI API OK",
  "result": {
    "version": "1.1.0",
    "timestamp": "2026-04-18T...",
    "env": "development"
  }
}
```

Si ves este resultado, ✅ **el backend está funcionando correctamente**.

### 6.3 Probar el login con Postman o curl

```bash
curl -X POST "https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "payload": {
      "email": "admin@sgi.bo",
      "password": "Admin2026!"
    }
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "OK",
  "result": {
    "sesion": {
      "userId": "...",
      "nombre": "Administrador SGI",
      "rol": "ADMINISTRADOR",
      "sucursalId": "ALL",
      "token": "eyJ...",
      "expiresAt": 1234567890
    }
  }
}
```

---

## 7. Configurar el frontend

### 7.1 Instalar dependencias

```bash
# Desde la raíz del repositorio, entrar a frontend/
cd frontend

# Instalar todas las dependencias del proyecto
npm install

# Verificar que no hay errores
# La salida debe terminar con: "added N packages"
```

> Si aparece el error `ERESOLVE` de npm, usa:
> ```bash
> npm install --legacy-peer-deps
> ```

### 7.2 Verificar la instalación

```bash
# Verificar que Quasar funciona
npx quasar info

# Debe mostrar las versiones de:
# - @quasar/app-vite
# - Quasar Framework
# - Vue
# - TypeScript
# - Vite
```

---

## 8. Variables de entorno del frontend

### 8.1 Crear el archivo `.env.local`

```bash
# Dentro de frontend/
cp .env.example .env.local
```

### 8.2 Editar `.env.local`

Abre `frontend/.env.local` con tu editor y completa los valores:

```env
# URL de la Web App de GAS (obtenida en el paso 6.1)
VITE_GAS_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec

# Nombre de la app (puedes dejarlo como está)
VITE_APP_NAME=SGI - Gestión de Inventarios

# Versión (dejar como está)
VITE_APP_VERSION=1.1.0

# URL base para QR en desarrollo (localhost)
VITE_QR_BASE_URL=http://localhost:9000
```

> **Importante:** `.env.local` ya está en `.gitignore` — nunca se sube al repositorio.

### 8.3 Verificar que el archivo existe

```bash
# Verificar contenido
cat .env.local
```

---

## 9. Ejecutar en modo desarrollo

### 9.1 Iniciar el servidor de desarrollo

```bash
# Desde el directorio frontend/
quasar dev

# Salida esperada:
#  App •  READY  •  http://localhost:9000/
#  App •  READY  •  http://[tu-ip]:9000/
```

### 9.2 Acceder a la aplicación

Abre el navegador en: **http://localhost:9000**

Deberías ver la pantalla de login del SGI.

### 9.3 Primer login de prueba

```
Email:     admin@sgi.bo
Password:  Admin2026!
```

> Si el login falla con error de CORS o red, revisa la sección de [problemas comunes](#13-solución-de-problemas-comunes).

### 9.4 Verificar módulos activos

Una vez dentro del sistema, comprueba que los siguientes módulos cargan correctamente:

| Módulo | URL | Estado esperado |
|--------|-----|-----------------|
| Dashboard | `/dashboard` | KPIs con indicadores |
| Sucursales | `/sucursales` | Tabla con Casa Matriz |
| Productos | `/productos` | Tabla vacía (sin productos aún) |
| Catálogo | `/catalogo` | Lista vacía (sin stock) |
| Inventario | `/inventario` | Sin movimientos |
| Proveedores | `/proveedores` | Tabla vacía |
| POS | `/pos` | Carrito vacío |
| Facturación | `/facturacion` | Sin facturas |
| Reportes | `/reportes` | KPIs en cero |

---

## 10. Verificar TypeScript y ESLint

### 10.1 Verificar que TypeScript compila sin errores

```bash
# Desde frontend/
npx tsc --noEmit

# Si no hay salida = ✅ Sin errores TypeScript
# Si hay errores = se muestran con archivo y línea
```

### 10.2 Ejecutar el linter

```bash
# Revisar errores ESLint
npm run lint

# Corregir automáticamente los que se puedan
npx eslint --ext .js,.ts,.vue ./src --fix
```

### 10.3 Verificar el formato con Prettier

```bash
# Revisar archivos sin formatear
npm run format

# Esto formatea automáticamente todos los archivos
```

---

## 11. Ejecutar los tests

### 11.1 Ejecutar todos los tests unitarios

```bash
# Desde frontend/
npx vitest run

# Salida esperada (resumen):
# ✓ tests/unit/utils/validators.spec.ts (10 tests)
# ✓ tests/unit/utils/formatters.spec.ts (6 tests)
# ✓ tests/unit/composables/useCatalogo.spec.ts (12 tests)
# ✓ tests/unit/composables/useInventario.spec.ts (5 tests)
# ✓ tests/unit/composables/usePOS.spec.ts (6 tests)
# ✓ tests/unit/stores/sucursalStore.spec.ts (9 tests)
# ✓ tests/unit/stores/productoStore.spec.ts (9 tests)
# ✓ tests/unit/stores/proveedorStore.spec.ts (8 tests)
# ✓ tests/unit/pages/catalogo.spec.ts (8 tests)
# ✓ tests/unit/pages/reportes.spec.ts (6 tests)
#
# Test Files: 10 passed
# Tests:      79 passed
```

### 11.2 Ejecutar tests en modo watch (durante desarrollo)

```bash
# Los tests se re-ejecutan automáticamente al guardar archivos
npx vitest
```

### 11.3 Ver reporte de cobertura

```bash
npx vitest run --coverage

# Genera: frontend/coverage/index.html
# Abrir en el navegador para ver la cobertura por archivo
```

---

## 12. Flujo de trabajo Git

### 12.1 Ramas del proyecto

| Rama | Propósito |
|------|-----------|
| `main` | Producción (protegida) |
| `dev` | Integración de desarrollo |
| `feature/nombre` | Nuevas funcionalidades |
| `fix/nombre` | Corrección de bugs |

### 12.2 Crear una nueva funcionalidad

```bash
# Asegurarte de estar en dev y actualizado
git checkout dev
git pull origin dev

# Crear rama de feature
git checkout -b feature/mi-nueva-funcionalidad

# ... desarrollar ...

# Commit con Conventional Commits
git add .
git commit -m "feat(modulo): descripción corta de lo que hace"

# Subir al remoto
git push origin feature/mi-nueva-funcionalidad
```

### 12.3 Convención de commits

```
feat(scope):     Nueva funcionalidad
fix(scope):      Corrección de bug
docs(scope):     Cambios en documentación
style(scope):    Formato sin cambio lógico
refactor(scope): Refactorización
test(scope):     Agregar o modificar tests
chore(scope):    Tareas de mantenimiento
types(scope):    Cambios en interfaces TypeScript

Ejemplos:
feat(inventario): agregar transferencia masiva entre sucursales
fix(pos): corregir cálculo de subtotal cuando cantidad es decimal
types(factura): agregar campo descuentoAplicado a DetalleFactura
```

### 12.4 Actualizar el código del backend tras cambios en GAS

```bash
# Cuando modificas archivos .gs en backend/src/
cd backend
clasp push

# Luego en el editor GAS: Implementar → Administrar implementaciones → Nueva versión
# ⚠️ Cada nueva versión genera una URL diferente
# Actualiza VITE_GAS_API_URL en .env.local si la URL cambia
```

---

## 13. Solución de problemas comunes

### ❌ Error: "Cannot find module 'chart.js'"

```bash
cd frontend
npm install chart.js
```

### ❌ Error de CORS al hacer requests al backend GAS

**Causa:** El deploy de GAS no tiene acceso público configurado.

**Solución:**
1. En el editor GAS → **Implementar → Administrar implementaciones**
2. Selecciona el deploy → ✏️ **Editar**
3. Verifica que "Quién tiene acceso" sea **Cualquier persona**
4. Guarda y copia la nueva URL

### ❌ Error: "quasar: command not found"

```bash
# Reinstalar Quasar CLI globalmente
npm install -g @quasar/cli

# Si persiste en Windows, verificar PATH:
npm config get prefix
# Agregar la ruta bin/ al PATH del sistema
```

### ❌ Error de TypeScript: "Cannot find name 'X'"

```bash
# Verificar que los tipos están bien importados
npx tsc --noEmit 2>&1 | head -20

# Si falta un tipo, agregar el import correspondiente:
import type { NombreTipo } from 'src/types'
```

### ❌ Login falla con "Credenciales incorrectas"

**Verificar paso a paso:**
1. Confirma que el usuario existe en la hoja `Usuarios` del Spreadsheet
2. Verifica que `SPREADSHEET_ID` en Script Properties es correcto
3. Verifica que `JWT_SECRET` en Script Properties coincide con el usado al crear el hash
4. Re-ejecuta `crearAdminInicial()` si hay dudas sobre el hash

### ❌ Error: "Script Property no configurada: SPREADSHEET_ID"

El backend no encuentra las Script Properties. Repetir el paso 5.5 y asegurarte de guardar las propiedades en el proyecto correcto (verificar con `clasp open` que estás en el script correcto).

### ❌ Las imágenes no cargan en el catálogo

**Causa:** La carpeta `sgi-imagenes` en Drive no tiene acceso público.

**Solución:** Repetir el paso 3.2 y verificar que el acceso sea "Cualquier persona con el enlace".

### ❌ El QR muestra URL de localhost en producción

Actualiza `VITE_QR_BASE_URL` en `.env.local`:
```env
VITE_QR_BASE_URL=http://localhost:9000    # desarrollo
VITE_QR_BASE_URL=https://sgi.tudominio.com # producción
```

### ❌ Error: "clasp: Not logged in"

```bash
clasp logout
clasp login
# Seguir el flujo de autenticación en el navegador
```

### ❌ Vitest no encuentra los módulos `src/...`

Verificar que `vitest.config.ts` tiene el alias correcto:
```typescript
resolve: {
  alias: {
    src: resolve(__dirname, './src'),
  },
},
```

---

## 14. Estructura del proyecto

```
sgi-inventario-gap/
│
├── 📁 backend/                     ← Google Apps Script
│   ├── appsscript.json             ← Configuración del script (timezone, scopes OAuth)
│   ├── .clasp.json                 ← Vinculación con el proyecto GAS (scriptId)
│   └── src/
│       ├── main.gs                 ← Router principal (doPost / doGet)
│       ├── auth.gs                 ← Autenticación JWT (HMAC-SHA256)
│       ├── config.gs               ← Script Properties y función respond()
│       ├── db/
│       │   └── sheets.gs           ← Capa de acceso a Google Sheets (CRUD genérico)
│       └── services/
│           ├── AlertaService.gs    ← Alertas de stock mínimo por email
│           ├── CatalogoService.gs  ← Catálogo por sucursal con ScriptCache
│           ├── CategoriaService.gs ← CRUD de categorías
│           ├── FacturaService.gs   ← Facturación, anulación, generación HTML
│           ├── InventarioService.gs← Stock por sucursal, ajustar stock
│           ├── LogService.gs       ← Registro de acciones críticas
│           ├── MovimientoService.gs← Entradas, salidas, transferencias
│           ├── OrdenCompraService.gs← Órdenes de compra y recepción
│           ├── ProductoService.gs  ← CRUD productos + subida de imágenes
│           ├── ProveedorService.gs ← CRUD proveedores
│           ├── ReporteService.gs   ← KPIs, ventas, stock, top productos
│           └── SucursalService.gs  ← CRUD sucursales
│
├── 📁 base-datos/                  ← Documentación de la base de datos
│   ├── 01_estructura_sheets.md     ← Encabezados de cada hoja
│   ├── 02_datos_iniciales.gs       ← Script seed ejecutable en GAS
│   └── 03_hojas_fase5.md           ← Hojas adicionales Fase 5
│
├── 📁 docs/                        ← Documentación del proyecto
│   ├── 01_PLANIFICACION_PROYECTO.md
│   ├── 02_GUIDELINES_DESARROLLO.md
│   ├── 03_GUIA_PRODUCCION.md
│   ├── GUIA_INSTALACION_DEV.md     ← Este documento
│   ├── FASE1_RESULTADOS.md
│   ├── FASE2_RESULTADOS.md
│   ├── FASE3_RESULTADOS.md
│   ├── FASE4_RESULTADOS.md
│   ├── FASE5_RESULTADOS.md
│   ├── FASE6_RESULTADOS.md
│   └── FASE7_RESULTADOS.md
│
└── 📁 frontend/                    ← Vue 3 + TypeScript + Quasar
    ├── .env.example                ← Plantilla de variables de entorno
    ├── .env.local                  ← Variables locales (NO commitear)
    ├── .eslintrc.cjs               ← Reglas ESLint TypeScript + Vue
    ├── .prettierrc                 ← Configuración Prettier
    ├── package.json                ← Dependencias del proyecto
    ├── quasar.config.ts            ← Configuración de Quasar Framework
    ├── tsconfig.json               ← TypeScript estricto (strict: true)
    ├── tsconfig.node.json          ← TypeScript para archivos de configuración
    ├── vitest.config.ts            ← Configuración de tests unitarios
    │
    ├── src/
    │   ├── env.d.ts                ← Tipado de variables de entorno Vite
    │   ├── assets/app.scss         ← Estilos globales y variables CSS
    │   ├── boot/                   ← Plugins de inicialización Quasar
    │   │   ├── axios.ts            ← Instancia base de Axios
    │   │   └── pinia.ts            ← Verificación de sesión al arrancar
    │   ├── composables/            ← Lógica reutilizable
    │   │   ├── useCatalogo.ts      ← Filtros y vista del catálogo
    │   │   ├── useInventario.ts    ← Operaciones de stock
    │   │   ├── useNotify.ts        ← Notificaciones Quasar unificadas
    │   │   ├── usePOS.ts           ← Lógica del Punto de Venta
    │   │   ├── useQR.ts            ← Generación de códigos QR
    │   │   └── useSucursal.ts      ← Sucursales visibles por rol
    │   ├── layouts/
    │   │   ├── AuthLayout.vue      ← Layout para login
    │   │   └── MainLayout.vue      ← Layout principal con sidebar
    │   ├── pages/                  ← Páginas de cada módulo
    │   │   ├── auth/               ← Login, SinPermiso, NotFound
    │   │   ├── catalogo/           ← Catálogo por sucursal (tabla/tarjetas)
    │   │   ├── dashboard/          ← Dashboard con KPIs y gráficos
    │   │   ├── facturacion/        ← Historial de facturas
    │   │   ├── inventario/         ← Stock y movimientos
    │   │   ├── pos/                ← Punto de Venta
    │   │   ├── productos/          ← CRUD de productos
    │   │   ├── proveedores/        ← Proveedores y órdenes de compra
    │   │   ├── reportes/           ← Reportes y análisis
    │   │   └── sucursales/         ← CRUD de sucursales
    │   ├── router/
    │   │   ├── index.ts            ← Rutas con lazy loading
    │   │   └── guards.ts           ← Guards de autenticación y rol
    │   ├── services/               ← Llamadas a la API GAS (tipadas)
    │   │   ├── api.ts              ← Instancia Axios base con interceptors
    │   │   ├── authService.ts
    │   │   ├── cataloService.ts
    │   │   ├── categoriaService.ts
    │   │   ├── facturaService.ts
    │   │   ├── inventarioService.ts
    │   │   ├── productoService.ts
    │   │   ├── proveedorService.ts
    │   │   ├── reporteService.ts
    │   │   └── sucursalService.ts
    │   ├── stores/                 ← Estado global con Pinia
    │   │   ├── authStore.ts        ← Sesión y autenticación
    │   │   ├── cataloStore.ts      ← Catálogo con cache TTL
    │   │   ├── categoriaStore.ts   ← Categorías (lazy load)
    │   │   ├── facturaStore.ts     ← Facturas + carrito POS
    │   │   ├── productoStore.ts    ← Productos
    │   │   ├── proveedorStore.ts   ← Proveedores + órdenes
    │   │   └── sucursalStore.ts    ← Sucursales
    │   ├── types/                  ← Interfaces y tipos TypeScript
    │   │   ├── index.ts            ← Re-exports de todos los tipos
    │   │   ├── api.types.ts
    │   │   ├── factura.types.ts
    │   │   ├── inventario.types.ts
    │   │   ├── producto.types.ts
    │   │   ├── proveedor.types.ts
    │   │   ├── reporte.types.ts
    │   │   ├── sucursal.types.ts
    │   │   └── usuario.types.ts
    │   └── utils/                  ← Funciones de utilidad
    │       ├── formatters.ts       ← Formateo de moneda, fechas, números
    │       ├── qrUtils.ts          ← File→Base64, resize imagen, validación
    │       └── validators.ts       ← Validadores de formularios
    │
    └── tests/
        ├── setup.ts                ← Configuración global de tests (mocks)
        └── unit/
            ├── composables/        ← Tests de composables
            ├── pages/              ← Tests de lógica de páginas
            ├── stores/             ← Tests de Pinia stores
            └── utils/              ← Tests de utilidades
```

---

## 15. Comandos de referencia rápida

### Frontend

```bash
# Iniciar servidor de desarrollo
quasar dev

# Verificar TypeScript (sin compilar)
npx tsc --noEmit

# Ejecutar linter
npm run lint

# Formatear código
npm run format

# Ejecutar tests (una vez)
npx vitest run

# Ejecutar tests en modo watch
npx vitest

# Ver cobertura de tests
npx vitest run --coverage

# Build de producción (para verificar que compila)
quasar build

# Verificar info del entorno Quasar
npx quasar info
```

### Backend (Clasp)

```bash
# Subir cambios al script GAS
cd backend
clasp push

# Descargar el estado actual del script desde GAS
clasp pull

# Abrir el editor de GAS en el navegador
clasp open

# Ver el log del script
clasp logs

# Ver el estado del proyecto
clasp status
```

### Git

```bash
# Estado actual
git status

# Ver ramas
git branch -a

# Cambiar a develop
git checkout dev

# Crear rama de feature
git checkout -b feature/nombre-feature

# Commit
git add -A
git commit -m "feat(scope): descripción"

# Push
git push origin nombre-rama

# Merge a dev (desde la rama feature)
git checkout dev
git merge feature/nombre-feature --no-ff
git push origin dev
```

---

## Resumen del flujo completo de instalación

```
1. npm install -g @quasar/cli @google/clasp
2. git clone ... && cd sgi-inventario-gap && git checkout dev
3. Google Drive: crear carpetas sgi-imagenes/ y sgi-facturas/
4. Google Sheets: crear Spreadsheet con 13 hojas + encabezados + datos iniciales
5. cd backend && clasp login && clasp create → clasp push
6. Editor GAS: configurar Script Properties (5 variables)
7. Editor GAS: ejecutar crearAdminInicial() → eliminar el script
8. Editor GAS: Implementar como Web App → copiar URL
9. cd ../frontend && npm install
10. cp .env.example .env.local → completar VITE_GAS_API_URL
11. quasar dev → abrir http://localhost:9000
12. Login: admin@sgi.bo / Admin2026!
13. npx tsc --noEmit && npx vitest run → ✅ todo en verde
```

---

*Documento generado: 2026-04-18 · SGI v1.1.0*
*Válido para ambiente de desarrollo local con Google Apps Script y Quasar Framework*
