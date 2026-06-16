# Analisis del Proyecto SGI Inventario GAP

## Resumen ejecutivo

`sgi-inventario-gap` es un sistema fullstack para gestion de inventario, catalogo, punto de venta, documentos de venta/facturacion y reportes en un entorno multi-sucursal. El proyecto esta orientado a comercios que administran productos, stock, precios por sucursal, ventas, proveedores y movimientos de inventario usando servicios de Google como backend operativo.

La arquitectura combina:

- Frontend SPA con Vue 3, TypeScript, Quasar, Pinia y Vue Router.
- Backend serverless con Google Apps Script desplegado como Web App.
- Persistencia principal en Google Sheets.
- Almacenamiento auxiliar en Google Drive para imagenes, facturas y backups.
- Autenticacion propia basada en tokens firmados tipo JWT.

El proyecto activo se encuentra en `sgi-inventario-gap/`. En la raiz del workspace tambien existen respaldos, versiones experimentales `qwen` y archivos auxiliares, pero el codigo principal y mas completo esta en esa carpeta.

## Estructura principal

```text
sgi-inventario-gap/
├── backend/        # Google Apps Script: router, auth, acceso a Sheets y servicios de dominio
├── base-datos/     # Documentacion y scripts para estructura inicial de Google Sheets
├── docs/           # Documentacion funcional, tecnica y resultados de cambios
├── frontend/       # SPA Vue 3 + TypeScript + Quasar
├── public/         # Build/hosting publico usado por Firebase Hosting
├── firebase.json   # Configuracion de hosting SPA
└── install.sh      # Script auxiliar de instalacion
```

## Stack tecnico

### Frontend

- Vue 3 con Composition API.
- TypeScript en modo estricto.
- Quasar Framework como sistema UI y build tool.
- Pinia para estado global.
- Vue Router con lazy loading y guards por autenticacion/permisos.
- Axios para comunicacion con Apps Script.
- Chart.js para graficos.
- `qrcode` y `vue-qrcode-reader` para generacion/lectura de QR.
- `xlsx` para importaciones/exportaciones.

Scripts relevantes en `frontend/package.json`:

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm run format
```

### Backend

El backend esta escrito en JavaScript compatible con Google Apps Script. Sus piezas principales son:

- `backend/src/main.js`: router central de acciones HTTP.
- `backend/src/auth.js`: login, firma y verificacion de tokens.
- `backend/src/config.js`: lectura de Script Properties y respuesta estandar.
- `backend/src/db/sheets.js`: capa generica CRUD sobre Google Sheets.
- `backend/src/setup.js`: seeds, verificacion de estructura, migraciones auxiliares y trigger de backup.
- `backend/src/services/*.js`: servicios de dominio.

### Persistencia

La base de datos es Google Sheets. La capa `Sheets` lee encabezados de la fila 1 y transforma filas en objetos. Las operaciones principales son `getAll`, `getBy`, `insert`, `insertMany`, `update`, `delete` y `generateId`.

## Arquitectura de comunicacion

El frontend no consume endpoints REST separados. Envia peticiones `POST` a la URL de la Web App de Apps Script con un cuerpo JSON que contiene:

```json
{
  "action": "nombreAccion",
  "payload": {},
  "token": "inyectado-por-interceptor"
}
```

Apps Script recibe todas las operaciones en `doPost`, busca `action` en un mapa de rutas y ejecuta el servicio correspondiente. La respuesta estandar tiene la forma:

```json
{
  "success": true,
  "message": "OK",
  "result": {}
}
```

Para evitar problemas de CORS con Google Apps Script, Axios usa `Content-Type: text/plain`, aunque el cuerpo enviado es JSON serializado. En desarrollo, Quasar configura un proxy `/api/gas` hacia `https://script.google.com/macros/s`.

## Modulos funcionales

### Autenticacion y seguridad

El login se resuelve con la accion `login`. El backend valida usuario y password contra la hoja `Usuarios`, genera un token firmado con HMAC-SHA256 y devuelve una sesion con permisos, roles, sucursales accesibles y fecha de expiracion.

Caracteristicas relevantes:

- Duracion de token: 8 horas.
- Persistencia de sesion en `LocalStorage` bajo la clave `sgi_session`.
- Guards frontend por autenticacion y permisos.
- Permisos granulares como `productos.ver`, `inventario.entrada`, `pos.vender`, `reportes.exportar`.
- Soporte legacy para `Usuarios.rol`.
- Soporte extendido con hojas `Roles`, `Permisos`, `RolPermisos`, `UsuarioRoles` y `UsuarioPermisos`.
- Alcances por sucursal: global, sucursal propia, sucursal especifica o multiples sucursales.

### Productos, categorias y marcas

El modulo de productos permite CRUD, busqueda por ID/SKU, subida de imagen, importacion masiva e importacion de stock inicial. Tambien existe una ruta publica `/producto/:sku` usada por QR de enlace, que llama a `getProductoBySku` sin token y expone solo campos publicos.

Campos sensibles como precio de compra, stock y movimientos no se devuelven en la variante publica.

### Inventario

El inventario se gestiona por combinacion producto-sucursal. Cada fila representa stock y precios efectivos para una sucursal.

Reglas relevantes:

- El stock se resuelve por `producto_id` y `sucursal_id`.
- El sistema detecta stock bajo comparando `stock_actual` contra `stock_minimo`.
- Los precios por sucursal pueden usar el precio base del producto o precios propios.
- Si se actualiza el precio base de un producto, se sincronizan sucursales que usan `precio_usa_base = TRUE`.
- Si una fila de inventario no existe, algunos flujos la crean automaticamente con stock 0 o con el delta inicial.

### Movimientos

El sistema soporta entradas, salidas, transferencias, movimientos masivos, cabeceras de movimiento, edicion de movimiento y edicion/eliminacion de detalle. El esquema actual incluye `MovimientoCabecera` y una hoja `Movimientos` enriquecida con referencia, precios, accion de detalle, editabilidad y relacion con movimiento origen.

### Catalogo

El catalogo presenta productos por sucursal con datos de producto, stock/precios efectivos y vistas de tabla/tarjetas. El frontend tiene componentes especificos para edicion, tarjetas, tabla y exportacion.

### Proveedores y ordenes de compra

Incluye CRUD de proveedores, historial de proveedor, ordenes de compra, recepcion de mercancia y cancelacion. Estos flujos alimentan inventario y trazabilidad de movimientos.

### POS y documentos de venta

El POS permite carrito, busqueda/escaneo de productos, venta con factura, venta sin factura, proformas, cotizaciones, pagos y conversion de documentos. El servicio `facturaService.ts` funciona como wrapper legacy sobre `documentoVentaService`, forzando `tipo: FACTURA` cuando corresponde.

El backend conserva acciones historicas de `FacturaService` y agrega `DocumentoVentaService`, con soporte para:

- Facturas.
- Documentos de venta.
- Anulacion.
- Conversion.
- Generacion de HTML imprimible.
- Pagos en `PagosDocumento`.

### Reportes

El modulo de reportes expone acciones para:

- KPIs.
- Reporte de ventas.
- Top productos.
- Reporte de stock.
- Reporte de movimientos.

El frontend usa componentes de tabla y graficos para mostrar indicadores y resultados.

### Backups

`setup.js` incluye un trigger diario `hacerBackupDiario`, instalable con `instalarTriggerBackup`. Crea una copia del spreadsheet y la mueve a la carpeta configurada en `DRIVE_FOLDER_BACKUPS`; si no existe configuracion valida, deja el backup en Drive root y registra advertencia.

## Modelo de datos observado

La documentacion base define hojas iniciales como:

- `Categorias`
- `Productos`
- `Sucursales`
- `Inventario`
- `Movimientos`
- `Proveedores`
- `Facturas`
- `DetalleFactura`
- `Usuarios`
- `Config`
- `LogAcciones`

El codigo actual extiende ese modelo con:

- `Marcas`
- `MovimientoCabecera`
- `PagosDocumento`
- `Roles`
- `Permisos`
- `RolPermisos`
- `UsuarioRoles`
- `UsuarioPermisos`

Tambien se observan columnas nuevas en hojas existentes, especialmente en `Inventario`, `Movimientos`, `Facturas` y `DetalleFactura`, para soportar precios por sucursal, documentos no fiscales, pagos, descuentos, conversiones y edicion granular.

## Rutas frontend

Rutas principales protegidas:

- `/dashboard`
- `/seguridad`
- `/sucursales`
- `/productos`
- `/inventario`
- `/catalogo`
- `/proveedores`
- `/pos`
- `/facturacion`
- `/reportes`

Rutas especiales:

- `/login`: acceso invitado.
- `/producto/:sku`: detalle publico de producto para QR.
- `/sin-permiso`: rechazo por permisos insuficientes.
- `/:pathMatch(.*)*`: pagina 404.

## Configuracion requerida

### Frontend

Variable principal:

```text
VITE_GAS_API_URL=<url-de-la-web-app-de-google-apps-script>
```

La configuracion de Quasar usa router en modo `history`, por lo que el hosting debe reescribir cualquier ruta hacia `index.html`.

### Backend Apps Script

Script Properties esperadas:

```text
SPREADSHEET_ID
JWT_SECRET
ADMIN_EMAIL
DRIVE_FOLDER_IMAGENES
DRIVE_FOLDER_FACTURAS
DRIVE_FOLDER_BACKUPS
ENV
```

Obligatorias segun `CONFIG`: `SPREADSHEET_ID` y `JWT_SECRET`.

## Despliegue

El frontend esta preparado para build SPA y hosting estatico. `firebase.json` apunta a `public/` y define rewrite global a `/index.html`, adecuado para Vue Router en modo history.

El backend se despliega como Google Apps Script Web App. El frontend debe apuntar a esa URL mediante `VITE_GAS_API_URL`.

## Pruebas y calidad

El frontend contiene pruebas unitarias con Vitest para utils, stores, composables y paginas. Tambien hay scripts de type-check y lint. No se observa un runner de pruebas equivalente para Apps Script; la validacion backend depende principalmente de ejecuciones manuales, logs y scripts de setup/migracion.

Puntos positivos:

- Tipado fuerte en frontend.
- Separacion clara por services, stores, composables, pages y components.
- Guards centralizados de autenticacion y permisos.
- Servicios backend separados por dominio.
- Capa comun para Google Sheets.
- Documentacion amplia por fases y resultados.

## Riesgos y observaciones tecnicas

1. Google Sheets como base de datos impone limites de rendimiento y concurrencia. El propio documento de base de datos recomienda mantener hojas bajo 50.000 filas y archivar movimientos antiguos.

2. Algunas operaciones leen hojas completas con `Sheets.getAll`. Esto simplifica el desarrollo, pero puede degradarse con catalogos, movimientos o facturas grandes.

3. La autenticacion usa SHA-256 con secreto para password hash. Es funcional para un entorno controlado, pero no equivale a un algoritmo especializado para contrasenas como bcrypt/argon2.

4. El backend centraliza todas las acciones en un router por string. Es simple y compatible con Apps Script, pero requiere disciplina para mantener nombres, permisos y contratos sincronizados con el frontend.

5. Existe convivencia entre modelo legacy de roles (`Usuarios.rol`) y modelo granular de seguridad. El codigo lo soporta, pero la administracion de datos debe evitar configuraciones ambiguas.

6. La documentacion de estructura base esta parcialmente desactualizada frente al esquema real que asegura `setup.js`. Para operacion actual conviene tratar `setup.js` como fuente tecnica mas cercana al estado real.

7. El timeout de Axios esta configurado en 30 minutos, lo que sugiere operaciones largas de importacion/migracion. Es util para cargas masivas, pero puede ocultar problemas de performance si no se monitorean logs y tiempos.

## Estado general

El proyecto esta avanzado y funcionalmente amplio. La arquitectura es pragmatica para un sistema de inventario apoyado en Google Workspace: reduce infraestructura propia, facilita despliegue y permite operar con herramientas conocidas como Sheets y Drive.

La principal deuda tecnica potencial no esta en la organizacion del frontend, que se ve modular, sino en la escalabilidad del backend sobre Sheets y en la necesidad de mantener sincronizados esquema, permisos, acciones y documentacion conforme crecen los modulos.

