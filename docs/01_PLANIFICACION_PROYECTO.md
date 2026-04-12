# 📦 Sistema de Gestión de Inventarios (SGI)
## Documento de Planificación del Proyecto

> **v1.1** — Actualizado con: gestión de sucursales, interfaz de consulta por sucursal, propiedades QR e imagen en productos, migración a TypeScript.

---

## 1. Descripción General

El **Sistema de Gestión de Inventarios (SGI)** es una aplicación web diseñada para gestionar de forma integral el ciclo de vida del inventario de una organización: desde el registro de productos y proveedores, hasta el control de movimientos, facturación y reportes en tiempo real.

El sistema opera sobre la plataforma **Google Workspace**, utilizando **Google Apps Script** como backend y **Google Sheets** como base de datos, con una interfaz web moderna construida en **Vue 3 + TypeScript + Quasar Framework**.

El sistema soporta **múltiples sucursales**, cada una con su propio stock, usuarios asignados y una **interfaz de consulta de catálogo** que muestra en tiempo real: marca, código, descripción, precio ofrecido, precio final y stock disponible.

---

## 2. Objetivos del Proyecto

### Objetivo General
Desarrollar un sistema de información fullstack para la gestión de inventarios multi-sucursal, accesible vía navegador web, que centralice y automatice los procesos de control de stock, compras, ventas y facturación, con visibilidad de catálogo por sucursal.

### Objetivos Específicos
- Registrar y categorizar productos con control de stock por sucursal, incluyendo imagen y código QR.
- Registrar movimientos de entrada y salida de inventario con trazabilidad completa.
- Gestionar proveedores y órdenes de compra.
- Implementar alertas automáticas de stock mínimo.
- Generar reportes y dashboards visuales actualizados en tiempo real.
- Integrar un módulo de Punto de Venta (POS) para ventas directas por sucursal.
- Emitir facturas y comprobantes digitales.
- Proveer a cada sucursal una **interfaz de consulta de catálogo** con precios y stock.
- Permitir al Administrador y roles autorizados consultar el catálogo de **cualquier sucursal**.

---

## 3. Alcance del Sistema

### Módulos incluidos

| # | Módulo | Descripción |
|---|--------|-------------|
| 1 | **Productos y Categorías** | CRUD completo con marca, SKU, código QR, imagen, precios y unidades |
| 2 | **Control de Inventario** | Entradas, salidas, ajustes y transferencias entre sucursales |
| 3 | **Sucursales / Bodegas** | Gestión de sucursales con stock independiente por ubicación |
| 4 | **Consulta de Catálogo por Sucursal** | Vista con: marca, código, descripción, precio ofrecido, precio final y stock |
| 5 | **Proveedores** | Registro, historial de compras y condiciones comerciales |
| 6 | **Alertas de Stock** | Notificaciones automáticas por umbral mínimo configurable |
| 7 | **POS (Punto de Venta)** | Venta rápida con búsqueda por código, QR y descripción |
| 8 | **Facturación** | Generación de facturas, notas de crédito y comprobantes PDF |
| 9 | **Reportes y Dashboard** | Visualizaciones de stock, movimientos y ventas por sucursal |
| 10 | **Usuarios y Permisos** | Roles diferenciados con acceso restringido por sucursal asignada |

### Fuera del alcance (v1.0)
- Integración con sistemas ERP externos.
- Aplicación móvil nativa.
- Sincronización con plataformas e-commerce.
- Módulo de nómina o RRHH.

---

## 4. Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Vue.js 3** | ^3.4 | Framework principal de UI |
| **TypeScript** | ^5.x | Tipado estático en todo el frontend |
| **Quasar Framework** | ^2.x | Componentes UI, PWA, build tooling |
| **Pinia** | ^2.x | Gestión de estado global tipado |
| **Vue Router 4** | ^4.x | Enrutamiento con guards tipados |
| **Chart.js / ECharts** | latest | Visualización de datos y dashboards |
| **Axios** | ^1.x | Comunicación HTTP con el backend (GAS) |
| **qrcode** | ^1.x | Generación de imágenes QR en el cliente |
| **vue-qrcode-reader** | ^5.x | Lectura de QR por cámara (POS) |

### Backend
| Tecnología | Uso |
|------------|-----|
| **Google Apps Script (GAS)** | Lógica de negocio, API REST (doGet/doPost) |
| **Google Sheets** | Base de datos estructurada por hojas/tablas |
| **Google Drive** | Almacenamiento de imágenes de productos y PDFs |
| **Gmail API** | Envío de alertas y facturas por correo |

### Infraestructura / Hosting
| Servicio | Uso |
|----------|-----|
| **Hosting web** (cPanel / Plesk / Netlify / Vercel) | Publicación del frontend compilado (SPA) |
| **Google Apps Script Deploy** | API Web App pública o restringida |
| **HTTPS + Dominio propio** | Acceso seguro a producción |

---

## 5. Arquitectura General

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENTE (Navegador)                      │
│        Vue 3 + TypeScript + Quasar (SPA / PWA)               │
│                                                              │
│  [Dashboard] [Inventario] [POS] [Facturas] [Reportes]        │
│  [Catálogo por Sucursal]  [Gestión de Sucursales]            │
└────────────────────────────┬─────────────────────────────────┘
                              │ HTTPS / Axios (JSON)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              BACKEND — Google Apps Script                    │
│   doGet() / doPost() → Router → Servicios                    │
│   ProductoService │ SucursalService │ CatalogoService        │
│   MovimientoService │ FacturaService │ AlertaService         │
└───────────────┬───────────────────────────┬──────────────────┘
                │ SpreadsheetApp            │ DriveApp
                ▼                           ▼
┌──────────────────────────┐   ┌────────────────────────────┐
│  BASE DE DATOS           │   │  GOOGLE DRIVE              │
│  Google Sheets           │   │  /sgi-imagenes/            │
│  [Productos]             │   │    producto_{id}.jpg       │
│  [Inventario]            │   │  /sgi-facturas/            │
│  [Sucursales]            │   │    factura_{num}.pdf       │
│  [Movimientos]           │   └────────────────────────────┘
│  [Proveedores]           │
│  [Facturas]              │
│  [Usuarios]              │
│  [Config]                │
│  [LogAcciones]           │
└──────────────────────────┘
```

### Flujo de la Interfaz de Consulta por Sucursal

```
Usuario (según rol)
        │
        ├── Admin / Supervisor → Selector de sucursal habilitado
        └── Otros roles       → Sucursal fija (la asignada)
                │
                ▼
        GET ?action=getCatalogo&sucursal_id=XXX
                │
                ▼
    GAS: join(Productos + Inventario filtrado por sucursal_id)
                │
                ▼
    Retorna array de:
    { marca, sku, descripcion, precio_ofrecido,
      precio_final, stock, imagen_url, qr_code }
                │
                ▼
    Vista: Tabla / Tarjetas con búsqueda y filtros
```

---

## 6. Modelo de Datos (Hojas de Google Sheets)

### Hoja: `Productos`
```
id | sku | marca | nombre | descripcion | categoria_id | unidad |
precio_compra | precio_ofrecido | precio_final | stock_minimo |
imagen_url | qr_code | activo | fecha_creacion
```

> - **`marca`**: marca o fabricante del producto.
> - **`precio_ofrecido`**: precio de lista o referencia antes de descuento.
> - **`precio_final`**: precio de venta efectivo al cliente.
> - **`imagen_url`**: URL pública del archivo en Google Drive.
> - **`qr_code`**: cadena codificada en el QR (usualmente el SKU o URL de consulta del producto).

### Hoja: `Sucursales`
```
id | nombre | direccion | ciudad | telefono | email |
responsable_id | activo | fecha_creacion
```

### Hoja: `Inventario`
```
id | producto_id | sucursal_id | stock_actual | fecha_actualizacion
```

> Una fila por combinación `(producto_id, sucursal_id)`.

### Hoja: `Movimientos`
```
id | tipo | producto_id | sucursal_origen | sucursal_destino |
cantidad | referencia | usuario_id | fecha | notas
```

> **`tipo`**: `ENTRADA` | `SALIDA` | `TRANSFERENCIA` | `AJUSTE`

### Hoja: `Proveedores`
```
id | nombre | ruc_nit | contacto | telefono | email | direccion | activo
```

### Hoja: `Facturas`
```
id | numero | tipo | cliente | sucursal_id | fecha |
subtotal | impuesto | total | estado | usuario_id
```

### Hoja: `DetalleFactura`
```
id | factura_id | producto_id | cantidad | precio_unitario | subtotal
```

### Hoja: `Usuarios`
```
id | nombre | email | rol | sucursal_id | activo | fecha_creacion
```

> **`sucursal_id`**: ID de la sucursal asignada. El Administrador usa `ALL` para acceso global.

### Hoja: `Config`
```
clave | valor | descripcion
```

### Hoja: `LogAcciones`
```
id | usuario_id | accion | modulo | sucursal_id | detalle | fecha
```

---

## 7. Roles y Permisos

| Rol | Dashboard | Inventario | POS | Facturación | Proveedores | Sucursales | Catálogo Global | Admin |
|-----|:---------:|:----------:|:---:|:-----------:|:-----------:|:----------:|:---------------:|:-----:|
| **Administrador** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Supervisor** | ✅ | ✅ | ✅ | ✅ | 👁️ | 👁️ | ✅ | ❌ |
| **Bodeguero** | ✅ | ✅ | ❌ | ❌ | 👁️ | 👁️ | Su sucursal | ❌ |
| **Vendedor** | ✅ | 👁️ | ✅ | ✅ | ❌ | ❌ | Su sucursal | ❌ |
| **Contador** | ✅ | 👁️ | ❌ | ✅ | 👁️ | 👁️ | Su sucursal | ❌ |

👁️ = Solo lectura  
**Catálogo Global** = puede consultar el catálogo de cualquier sucursal (no solo la propia).

### Reglas de acceso por sucursal
- Cada usuario tiene un `sucursal_id` asignado en la hoja `Usuarios`.
- **Administrador** y **Supervisor** pueden seleccionar cualquier sucursal para consultar catálogo, stock e informes.
- Los demás roles solo acceden a datos de su sucursal asignada.
- El token de sesión incluye `{ userId, rol, sucursalId }` y el backend valida el acceso en cada request.

---

## 8. Interfaz de Consulta de Catálogo por Sucursal

### Descripción
Vista dedicada accesible desde el menú principal. Muestra el catálogo de productos de una sucursal con sus precios y stock en tiempo real.

### Campos mostrados

| Campo | Descripción |
|-------|-------------|
| **Imagen** | Thumbnail del producto (Google Drive) |
| **QR** | Ícono clickeable que muestra el QR ampliado del producto |
| **Marca** | Marca / fabricante del producto |
| **Código (SKU)** | Código único identificador |
| **Descripción** | Nombre y descripción del producto |
| **Precio Ofrecido** | Precio de referencia / lista |
| **Precio Final** | Precio de venta vigente al cliente |
| **Stock** | Cantidad disponible en la sucursal seleccionada |

### Funcionalidades
- Selector de sucursal (habilitado solo para Admin y Supervisor).
- Búsqueda en tiempo real por código, marca o descripción.
- Filtro por categoría.
- Indicador visual de stock bajo (cuando `stock_actual <= stock_minimo`).
- Toggle de vista: tabla ↔ tarjetas.
- Exportación a PDF o Excel del catálogo de la sucursal.

---

## 9. Gestión de Imágenes y Códigos QR

### Imágenes
- Almacenadas en Google Drive bajo la carpeta `/sgi-imagenes/`.
- Al crear/editar un producto, el frontend permite subir una imagen.
- El backend sube el archivo a Drive, obtiene el URL de previsualización pública y lo guarda en la hoja.
- Se recomienda redimensionar imágenes en el cliente antes de subir (máx. 800×800 px).

### Códigos QR
- El campo `qr_code` almacena la cadena a codificar (por defecto: el SKU del producto).
- La generación visual del QR se realiza en el **frontend** con la librería `qrcode`.
- El QR puede apuntar al SKU o a una URL de consulta: `https://sgi.tudominio.com/producto/{sku}`.
- En el **POS**, se puede escanear el QR con la cámara del dispositivo usando `vue-qrcode-reader` para agregar productos al carrito automáticamente.

---

## 10. Fases de Desarrollo

### Fase 1 — Fundamentos y TypeScript (Semanas 1–3)
- [ ] Configuración del repositorio Git
- [ ] Scaffold del proyecto Quasar con TypeScript (`quasar create --ts`)
- [ ] Configuración de ESLint + Prettier para TypeScript
- [ ] Definición de interfaces/types globales (`src/types/`)
- [ ] Estructura de Google Sheets con todas las columnas definitivas
- [ ] Apps Script: router base + sistema de autenticación con rol/sucursal
- [ ] CRUD de Sucursales

### Fase 2 — Productos con QR e Imagen (Semanas 4–5)
- [ ] CRUD de Productos (marca, imagen, qr_code, precio_ofrecido, precio_final)
- [ ] Subida de imágenes a Google Drive desde el frontend
- [ ] Generación y visualización de código QR en la ficha de producto
- [ ] Gestión de Categorías

### Fase 3 — Inventario Multi-sucursal (Semanas 6–8)
- [ ] Control de stock por sucursal (hoja `Inventario`)
- [ ] Módulo de entradas y salidas por sucursal
- [ ] Transferencias entre sucursales
- [ ] Sistema de alertas de stock mínimo (trigger Apps Script)
- [ ] Historial de movimientos con filtros por sucursal

### Fase 4 — Consulta de Catálogo por Sucursal (Semana 9)
- [ ] Endpoint `getCatalogoPorSucursal` en GAS
- [ ] Vista de catálogo: tabla + tarjetas
- [ ] Selector de sucursal para Admin/Supervisor
- [ ] Búsqueda y filtros en tiempo real
- [ ] Indicadores visuales de stock bajo
- [ ] Exportación a PDF/Excel

### Fase 5 — Proveedores y Compras (Semanas 10–11)
- [ ] CRUD de Proveedores
- [ ] Registro de órdenes de compra
- [ ] Recepción de mercancía (entrada automática al inventario)

### Fase 6 — POS y Facturación (Semanas 12–14)
- [ ] Interfaz POS con búsqueda por código, descripción y lectura QR
- [ ] Módulo de facturación por sucursal
- [ ] Generación de PDF de facturas (Drive / HtmlService)
- [ ] Envío de facturas por email (Gmail API)

### Fase 7 — Reportes y Dashboard (Semanas 15–16)
- [ ] Dashboard con KPIs por sucursal
- [ ] Reportes de stock por sucursal
- [ ] Reportes de ventas y movimientos
- [ ] Exportación a Excel/CSV

### Fase 8 — Deploy y Pruebas (Semanas 17–18)
- [ ] Pruebas de integración multi-sucursal
- [ ] Configuración del hosting
- [ ] Publicación Apps Script como Web App
- [ ] Deploy del frontend
- [ ] Pruebas en producción con múltiples sucursales y roles

---

## 11. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:------------:|:-------:|------------|
| Límites de cuota de Google Sheets | Media | Alto | Caché en Pinia/ScriptCache, paginación, batch writes |
| Lentitud en Apps Script (cold start) | Alta | Medio | Optimizar consultas, usar ScriptCache agresivamente |
| CORS en Web App pública | Baja | Alto | Configurar correctamente el deploy de GAS |
| Pérdida de datos en Sheets | Baja | Alto | Historial de versiones Drive habilitado + backup diario automático |
| Acceso entre sucursales no autorizado | Media | Alto | Validar `sucursal_id` del token en cada request del backend |
| Imágenes lentas desde Drive | Media | Medio | Usar URLs de previsualización Drive optimizadas + lazy loading |
| Errores de tipos TS no detectados en GAS responses | Baja | Medio | Usar type guards o Zod para validar respuestas del backend |

---

## 12. Equipo Recomendado

| Rol | Responsabilidad |
|-----|----------------|
| Desarrollador Fullstack | Frontend Vue 3 / TypeScript / Quasar + Backend Apps Script |
| QA / Tester | Pruebas funcionales por sucursal, roles y permisos |
| Analista / PM | Gestión de requisitos y seguimiento de fases |

---

*Documento generado: 2026 — SGI v1.1*
