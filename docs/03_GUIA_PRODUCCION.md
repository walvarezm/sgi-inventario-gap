# 🚀 Guía de Puesta en Producción — SGI
## Deploy, Hosting y Publicación en la Red

> **v1.1** — Actualizado con: nuevas variables de entorno (QR, Drive), columnas de productos, build TypeScript, checklist multi-sucursal.

---

## 1. Visión General del Deploy

El sistema SGI tiene **dos componentes independientes** que se despliegan por separado:

```
┌─────────────────────────────────────────────────────────┐
│  COMPONENTE 1: Frontend (Vue 3 + TypeScript + Quasar)   │
│  → Archivos estáticos compilados (HTML + JS + CSS)      │
│  → Se publica en servidor de hosting web                │
│  → URL: https://sgi.tudominio.com                       │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS / JSON
┌─────────────────────────────────────────────────────────┐
│  COMPONENTE 2: Backend (Google Apps Script)             │
│  → Web App publicada desde Google                       │
│  → URL: https://script.google.com/macros/s/.../exec     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Publicar el Backend (Google Apps Script)

### Paso 1: Preparar Google Drive

Antes de subir el código, crear las carpetas de almacenamiento en Google Drive:

1. Abrir [drive.google.com](https://drive.google.com).
2. Crear la carpeta: **`sgi-imagenes`** — para imágenes de productos.
3. Crear la carpeta: **`sgi-facturas`** — para PDFs de facturas.
4. Copiar el **ID de cada carpeta** desde la URL:
   ```
   https://drive.google.com/drive/folders/ →→→ 1aBcDeFgHiJ ←←←
   ```

### Paso 2: Preparar el Google Sheet

1. Crear un nuevo spreadsheet en [sheets.google.com](https://sheets.google.com).
2. Nombrarlo: **SGI - Base de Datos Producción**.
3. Crear las siguientes hojas con sus encabezados exactos en la Fila 1:

| Hoja | Encabezados (separados por `|`) |
|------|---------------------------------|
| `Productos` | `id \| sku \| marca \| nombre \| descripcion \| categoria_id \| unidad \| precio_compra \| precio_ofrecido \| precio_final \| stock_minimo \| imagen_url \| qr_code \| activo \| fecha_creacion` |
| `Sucursales` | `id \| nombre \| direccion \| ciudad \| telefono \| email \| responsable_id \| activo \| fecha_creacion` |
| `Inventario` | `id \| producto_id \| sucursal_id \| stock_actual \| fecha_actualizacion` |
| `Movimientos` | `id \| tipo \| producto_id \| sucursal_origen \| sucursal_destino \| cantidad \| referencia \| usuario_id \| fecha \| notas` |
| `Proveedores` | `id \| nombre \| ruc_nit \| contacto \| telefono \| email \| direccion \| activo` |
| `Facturas` | `id \| numero \| tipo \| cliente \| sucursal_id \| fecha \| subtotal \| impuesto \| total \| estado \| usuario_id` |
| `DetalleFactura` | `id \| factura_id \| producto_id \| cantidad \| precio_unitario \| subtotal` |
| `Usuarios` | `id \| nombre \| email \| rol \| sucursal_id \| activo \| fecha_creacion` |
| `Config` | `clave \| valor \| descripcion` |
| `LogAcciones` | `id \| usuario_id \| accion \| modulo \| sucursal_id \| detalle \| fecha` |

4. Copiar el **ID del Spreadsheet** desde la URL.

### Paso 3: Crear datos iniciales

En la hoja `Usuarios`, agregar el primer administrador:
```
[uuid] | Nombre Admin | admin@tudominio.com | ADMINISTRADOR | ALL | TRUE | 2026-01-01
```

En la hoja `Config`, agregar:
```
app_nombre       | SGI - Inventarios        | Nombre del sistema
app_version      | 1.1.0                    | Versión actual
iva_porcentaje   | 13                       | Porcentaje de IVA por defecto
moneda           | BOB                      | Moneda por defecto
```

### Paso 4: Subir el código con Clasp

```bash
cd backend
clasp login
clasp create --title "SGI-Backend-Produccion" --type webapp
clasp push
```

### Paso 5: Configurar Script Properties

En el editor de Apps Script → **Configuración del proyecto** → **Propiedades del script**:

| Propiedad | Valor |
|-----------|-------|
| `SPREADSHEET_ID` | ID del Spreadsheet (Paso 2) |
| `JWT_SECRET` | Cadena aleatoria ≥ 32 caracteres |
| `ADMIN_EMAIL` | Email del administrador |
| `STOCK_ALERT_EMAIL` | Email para alertas de stock |
| `DRIVE_FOLDER_IMAGENES` | ID de la carpeta `sgi-imagenes` (Paso 1) |
| `DRIVE_FOLDER_FACTURAS` | ID de la carpeta `sgi-facturas` (Paso 1) |
| `ENV` | `production` |

### Paso 6: Publicar como Web App

1. En el editor GAS → **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configurar:
   - Descripción: `SGI v1.1.0 - Producción`
   - Ejecutar como: `Yo (tu cuenta Google)`
   - Quién tiene acceso: `Cualquier persona`
4. Clic en **Implementar** → copiar la URL generada.

> ⚠️ Cada cambio en el código GAS requiere **nueva implementación**. La URL cambia con cada versión.

---

## 3. Compilar el Frontend para Producción

### Paso 1: Configurar variables de entorno de producción

Crear `.env.production` en la raíz del frontend:
```env
VITE_GAS_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
VITE_APP_NAME=SGI - Gestión de Inventarios
VITE_APP_VERSION=1.1.0
VITE_QR_BASE_URL=https://sgi.tudominio.com
```

### Paso 2: Verificar que TypeScript compila sin errores

```bash
cd frontend
npx tsc --noEmit
# Debe retornar sin errores antes de hacer el build
```

### Paso 3: Build de producción

```bash
quasar build
# Archivos compilados en: frontend/dist/spa/
```

La carpeta `dist/spa/` contiene los archivos estáticos listos para subir al servidor.

---

## 4. Publicar en Servidor de Hosting Web

### Opción A: Hosting compartido con cPanel

**Proveedores sugeridos:** Hostinger, Namecheap, SiteGround, InfinityFree (gratis)

1. Acceder a cPanel → **Administrador de archivos** → `public_html/`.
2. Subir **todos los archivos** de `dist/spa/` (incluyendo subcarpetas `assets/`).
3. Verificar que `index.html` esté en la raíz de `public_html/`.
4. Crear el archivo `.htaccess` en `public_html/` para SPA:

```apache
Options -MultiViews
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]

# Seguridad: ocultar archivos sensibles
<FilesMatch "\.(env|json|lock)$">
  Order allow,deny
  Deny from all
</FilesMatch>
```

> ⚠️ **El `.htaccess` es esencial.** Sin él, recargar cualquier ruta como `/catalogo` o `/sucursales` retornará un error 404.

### Opción B: Hosting con Plesk

1. Plesk → **Dominios → tu dominio → Administrador de archivos** → `httpdocs/`.
2. Subir los archivos de `dist/spa/`.
3. En **Apache & Nginx Settings** → agregar en la sección Nginx:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Opción C: Netlify (gratis, recomendado para proyectos pequeños)

```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod --dir=dist/spa
```

Crear `public/_redirects` o `netlify.toml`:
```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Opción D: Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Crear `vercel.json` en la raíz del frontend:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 5. Configuración de Dominio y HTTPS

### Apuntar el dominio
1. Comprar dominio en Namecheap, GoDaddy o similar.
2. Configurar DNS:
   - Registro **A**: `@` → IP del servidor
   - Registro **CNAME**: `www` → `tudominio.com`

### Certificado SSL (HTTPS) — Obligatorio

**En cPanel/Plesk:** Usar Let's Encrypt (gratuito):
1. cPanel → **SSL/TLS** → **Let's Encrypt SSL**.
2. Seleccionar el dominio → **Instalar**.
3. Activar redirección HTTP → HTTPS.

**En Netlify/Vercel:** HTTPS se configura automáticamente.

---

## 6. Configurar las Carpetas de Google Drive como Públicas

Para que las imágenes de productos sean accesibles desde la app:

1. En Google Drive, hacer clic derecho en la carpeta `sgi-imagenes`.
2. **Compartir → Configuración de uso compartido**.
3. En "Acceso general", seleccionar: **Cualquier persona con el enlace** → **Visualizador**.
4. Repetir para `sgi-facturas`.

> Las imágenes se sirven con URL del tipo:  
> `https://drive.google.com/uc?export=view&id={FILE_ID}`

---

## 7. Checklist Pre-Lanzamiento

### Backend (Apps Script)
- [ ] Script Properties configuradas (incluyendo carpetas Drive)
- [ ] Web App desplegada y URL funcional (probar con Postman)
- [ ] Hoja `Usuarios` con administrador inicial
- [ ] Hoja `Config` con valores base
- [ ] Hoja `Sucursales` con al menos una sucursal activa
- [ ] Hoja `Inventario` estructurada (`producto_id` + `sucursal_id`)
- [ ] Carpetas Drive creadas y acceso configurado
- [ ] Triggers automáticos de alertas instalados
- [ ] Endpoint `getCatalogo` probado con Postman para cada sucursal

### Frontend
- [ ] TypeScript compila sin errores (`tsc --noEmit`)
- [ ] Variables de entorno de producción configuradas
- [ ] Build de producción generado sin errores
- [ ] `.htaccess` o configuración SPA aplicada en el servidor
- [ ] `VITE_QR_BASE_URL` apunta al dominio real
- [ ] Favicon e iconos PWA configurados

### Multi-sucursal y Catálogo
- [ ] Al menos una sucursal registrada en producción
- [ ] Usuarios con `sucursal_id` asignados correctamente
- [ ] Administrador con `sucursal_id = ALL` configurado
- [ ] Vista de catálogo funciona para cada sucursal
- [ ] Selector de sucursal visible solo para Admin y Supervisor
- [ ] Imágenes de productos cargando correctamente desde Drive
- [ ] Generación de QR funcionando en la ficha de producto
- [ ] Escáner QR funcional en el POS (probar con dispositivo real)

### Hosting y Dominio
- [ ] Dominio apunta al servidor (`nslookup tudominio.com`)
- [ ] HTTPS activo y redirigiendo desde HTTP
- [ ] La app carga en la URL de producción
- [ ] Prueba de login con rol Admin
- [ ] Prueba de login con rol Vendedor (verificar acceso restringido a su sucursal)
- [ ] Prueba de catálogo de sucursal para cada rol

### Seguridad
- [ ] Credenciales y tokens no expuestos en el build del frontend
- [ ] `.env.production` no incluido en el repositorio (`.gitignore`)
- [ ] Validación de `sucursal_id` funciona en el backend
- [ ] Log de acciones registrando operaciones críticas

---

## 8. Actualizaciones y Mantenimiento

### Actualizar el frontend
```bash
# 1. Hacer cambios y verificar TypeScript
npx tsc --noEmit

# 2. Build
quasar build

# 3. Subir dist/spa/ al servidor (reemplazar archivos)
# En cPanel: subir ZIP → extraer → reemplazar
```

### Actualizar el backend (Apps Script)
```bash
# Subir cambios con clasp
cd backend
clasp push

# En el editor GAS:
# Implementar → Administrar implementaciones → Nueva versión
# Copiar el nuevo URL y actualizar VITE_GAS_API_URL en .env.production
# Hacer nuevo build y re-deploy del frontend
```

### Agregar una nueva sucursal en producción
1. Agregar la fila en la hoja `Sucursales` del Spreadsheet.
2. Para cada producto activo, agregar una fila en `Inventario` con `stock_actual = 0`.
3. Asignar usuarios a la nueva sucursal actualizando su `sucursal_id`.
4. No se requiere re-deploy del frontend ni del backend.

---

## 9. Respaldo de Datos

### Backup automático del Google Sheet

```javascript
// Instalar una sola vez desde el editor GAS
function instalarTriggerBackup() {
  ScriptApp.newTrigger('hacerBackupDiario')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create()
}

function hacerBackupDiario() {
  const ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  )
  const zona = 'America/La_Paz'
  const fecha = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd')
  ss.copy(`SGI - Backup ${fecha}`)
  Logger.log(`Backup diario creado: ${fecha}`)
}
```

---

## 10. Solución de Problemas Comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Rutas como `/catalogo` retornan 404 al recargar | Falta configuración SPA en el servidor | Agregar `.htaccess` o regla `try_files` en Nginx |
| Error CORS desde el frontend | Permisos incorrectos en el deploy de GAS | Verificar que el acceso esté en "Cualquier persona" |
| Catálogo retorna vacío para una sucursal | No hay filas en `Inventario` para esa sucursal | Agregar registros `(producto_id, sucursal_id)` en la hoja `Inventario` |
| Imágenes no cargan en el catálogo | Carpeta Drive sin acceso público | Configurar carpeta `sgi-imagenes` como pública con enlace |
| QR no escanea en el POS | URL del QR apunta al entorno de desarrollo | Verificar `VITE_QR_BASE_URL` en `.env.production` |
| Usuario ve datos de otra sucursal | Falla en validación del backend | Verificar lógica de `session.sucursalId` en `CatalogoService.gs` |
| Error de TypeScript en build | Tipo no declarado o incompatible | Ejecutar `tsc --noEmit` antes del build para identificar el error |
| Script Properties vacías | No se configuraron en el proyecto GAS correcto | Verificar que las propiedades están en el proyecto del deploy activo |
| Emails de alerta no llegan | Cuota diaria de Gmail API superada | Revisar el panel de cuotas en la consola de GAS |

---

*Documento generado: 2026 — SGI v1.1*
