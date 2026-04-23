# 📦 SGI — Sistema de Gestión de Inventarios

> Sistema fullstack multi-sucursal para gestión de inventarios, POS y facturación.
> Stack: **Vue 3 + TypeScript + Quasar** | **Google Apps Script** | **Google Sheets**

**v1.1** — Con soporte de sucursales, catálogo, inventario, POS, facturación y reportes.

---

## 🚀 Inicio rápido

```bash
git clone https://github.com/tu-usuario/sgi-inventario-gap.git
cd sgi-inventario-gap
git checkout dev
cd frontend
npm install
cp .env.example .env.local   # completar VITE_GAS_API_URL
quasar dev
```

👉 **Ver guía completa:** [`docs/GUIA_INSTALACION_DEV.md`](./docs/GUIA_INSTALACION_DEV.md)

---

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [🛠️ Guía de Instalación Dev](./docs/GUIA_INSTALACION_DEV.md) | **Instalación paso a paso desde cero** — herramientas, GAS, Sheets, frontend |
| [📋 Planificación del Proyecto](./docs/01_PLANIFICACION_PROYECTO.md) | Objetivos, alcance, arquitectura, modelo de datos, roles, fases |
| [🔧 Guidelines de Desarrollo](./docs/02_GUIDELINES_DESARROLLO.md) | TypeScript, convenciones, patrones de código, Git workflow |
| [🚀 Guía de Producción](./docs/03_GUIA_PRODUCCION.md) | Deploy GAS, hosting, HTTPS, dominio, mantenimiento |

### Resultados por fase

| Fase | Documento | Estado |
|------|-----------|--------|
| Fase 1 | [FASE1_RESULTADOS.md](./docs/FASE1_RESULTADOS.md) | ✅ Completada |
| Fase 2 | [FASE2_RESULTADOS.md](./docs/FASE2_RESULTADOS.md) | ✅ Completada |
| Fase 3 | [FASE3_RESULTADOS.md](./docs/FASE3_RESULTADOS.md) | ✅ Completada |
| Fase 4 | [FASE4_RESULTADOS.md](./docs/FASE4_RESULTADOS.md) | ✅ Completada |
| Fase 5 | [FASE5_RESULTADOS.md](./docs/FASE5_RESULTADOS.md) | ✅ Completada |
| Fase 6 | [FASE6_RESULTADOS.md](./docs/FASE6_RESULTADOS.md) | ✅ Completada |
| Fase 7 | [FASE7_RESULTADOS.md](./docs/FASE7_RESULTADOS.md) | ✅ Completada |
| Fase 8 | — | ⏳ Deploy y Pruebas |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 + **TypeScript** + Quasar Framework |
| Estado | Pinia (tipado con interfaces) |
| Backend | Google Apps Script |
| Base de datos | Google Sheets |
| Almacenamiento | Google Drive (imágenes + PDFs) |
| Email | Gmail API (alertas de stock) |
| Gráficos | Chart.js |
| QR generación | qrcode |
| QR lectura (POS) | vue-qrcode-reader |
| Hosting | Netlify / Vercel / cPanel |

---

## 📦 Módulos implementados

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| 🔐 Autenticación | ✅ | JWT, roles, acceso por sucursal |
| 🏪 Sucursales | ✅ | CRUD multi-sucursal |
| 🏷️ Productos | ✅ | CRUD + imagen Drive + QR |
| 📦 Inventario | ✅ | Entradas/Salidas/Transferencias/Alertas |
| 🔍 Catálogo | ✅ | Tabla/Tarjetas + exportación PDF/CSV |
| 🚚 Proveedores | ✅ | CRUD + órdenes de compra + recepción |
| 🛒 POS | ✅ | Carrito + cobro + facturación automática |
| 🧾 Facturación | ✅ | Historial + impresión + anulación |
| 📊 Reportes | ✅ | KPIs + ventas + stock + top productos |

---

## 👥 Roles del sistema

| Rol | Acceso |
|-----|--------|
| Administrador | Acceso total a todas las sucursales y módulos |
| Supervisor | Acceso a todas las sucursales (sin admin) |
| Bodeguero | Inventario de su sucursal asignada |
| Vendedor | POS y facturación de su sucursal |
| Contador | Reportes y facturación (solo lectura en inventario) |

---

## 🗂️ Estructura del repositorio

```
sgi-inventario-gap/
├── backend/        ← Google Apps Script (12 servicios)
├── base-datos/     ← Estructura de Google Sheets y scripts seed
├── docs/           ← Documentación completa del proyecto
└── frontend/       ← Vue 3 + TypeScript + Quasar SPA
```

---

*SGI v1.1.0 — 2026*
